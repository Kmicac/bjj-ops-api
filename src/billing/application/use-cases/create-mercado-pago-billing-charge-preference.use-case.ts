import { ConflictException, Injectable } from '@nestjs/common';
import { IntegrationProvider } from '../../../generated/prisma/enums';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import {
  CreateMercadoPagoBillingPreferenceResult,
  CreateMercadoPagoBillingPreferenceUseCase,
} from '../../../integrations/application/use-cases/create-mercado-pago-billing-preference.use-case';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

function buildMercadoPagoExternalReference(chargeId: string) {
  return `billing_charge:${chargeId}`;
}

function buildPreferenceTitle(description: string | null) {
  const normalizedDescription = description?.trim();
  return normalizedDescription && normalizedDescription.length > 0
    ? normalizedDescription
    : 'BJJ Ops billing charge';
}

@Injectable()
export class CreateMercadoPagoBillingChargePreferenceUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
    private readonly createMercadoPagoBillingPreferenceUseCase: CreateMercadoPagoBillingPreferenceUseCase,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    studentId: string,
    chargeId: string,
  ) {
    const student = await this.billingRepository.getStudentBillingTarget(
      organizationId,
      studentId,
    );
    this.billingPolicy.ensureCanOperateStudentBilling(
      principal,
      organizationId,
      student.primaryBranch,
    );

    const charge =
      await this.billingRepository.getBillingChargeMercadoPagoPreferenceTarget(
        organizationId,
        chargeId,
      );

    this.billingPolicy.ensureChargeBelongsToStudent(
      {
        id: charge.id,
        branchId: charge.branchId,
        studentId: charge.studentId,
        currency: charge.currency,
        amount: charge.amount,
        amountPaid: charge.amountPaid,
        status: charge.status,
      },
      studentId,
      student.primaryBranchId,
    );
    this.billingPolicy.ensureChargeEligibleForMercadoPagoPreference(charge);

    const outstandingAmount = charge.amount.minus(charge.amountPaid);
    const preference =
      await this.createMercadoPagoBillingPreferenceUseCase.execute({
        organizationId,
        branchId: charge.branchId,
        billingChargeId: charge.id,
        billingChargeExternalReference:
          charge.externalProvider === IntegrationProvider.MERCADO_PAGO
            ? charge.externalReference
            : null,
        title: buildPreferenceTitle(charge.description),
        description: charge.description?.trim(),
        amount: outstandingAmount.toNumber(),
        currency: charge.currency,
        externalReference: buildMercadoPagoExternalReference(charge.id),
        createdByMembershipId: principal.membershipId,
      });

    const syncedCharge = await this.syncChargeExternalReference(
      charge,
      preference,
    );

    await this.auditService.create({
      organizationId,
      branchId: charge.branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: preference.reused
        ? 'billing_charge.mercado_pago_preference_reused'
        : 'billing_charge.mercado_pago_preference_created',
      entityType: 'BillingCharge',
      entityId: charge.id,
      metadata: {
        studentId,
        integrationConnectionId: preference.connectionId,
        preferenceId: preference.preferenceId,
        externalReference: preference.externalReference,
        reused: preference.reused,
      },
    });

    return {
      chargeId: syncedCharge.id,
      provider: IntegrationProvider.MERCADO_PAGO,
      preferenceId: preference.preferenceId,
      externalReference: preference.externalReference,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
      environment: preference.environment,
      reused: preference.reused,
    };
  }

  private async syncChargeExternalReference(
    charge: Awaited<
      ReturnType<BillingRepository['getBillingChargeMercadoPagoPreferenceTarget']>
    >,
    preference: CreateMercadoPagoBillingPreferenceResult,
  ) {
    if (
      charge.externalProvider &&
      charge.externalProvider !== IntegrationProvider.MERCADO_PAGO
    ) {
      throw new ConflictException(
        'Billing charge is already linked to another external payment provider',
      );
    }

    if (
      charge.externalProvider === IntegrationProvider.MERCADO_PAGO &&
      charge.externalReference &&
      charge.externalReference !== preference.preferenceId
    ) {
      throw new ConflictException(
        'Billing charge Mercado Pago reference does not match the stored preference',
      );
    }

    if (
      charge.externalProvider === IntegrationProvider.MERCADO_PAGO &&
      charge.externalReference === preference.preferenceId
    ) {
      return charge;
    }

    return this.billingRepository.attachMercadoPagoPreferenceToBillingCharge({
      organizationId: charge.organizationId,
      chargeId: charge.id,
      externalProvider: IntegrationProvider.MERCADO_PAGO,
      externalReference: preference.preferenceId,
    });
  }
}
