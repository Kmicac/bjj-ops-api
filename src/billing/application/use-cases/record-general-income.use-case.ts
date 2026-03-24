import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PaymentStatus } from '../../../generated/prisma/enums';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { RecordGeneralIncomeDto } from '../../dto/record-general-income.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class RecordGeneralIncomeUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    dto: RecordGeneralIncomeDto,
  ) {
    const branch = await this.billingRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.billingPolicy.ensureCanManageBranchBilling(
      principal,
      organizationId,
      branch,
    );

    const grossAmount = dto.grossAmount;
    const netAmount = dto.netAmount ?? dto.grossAmount;
    this.billingPolicy.ensureValidPaymentAmounts(grossAmount, netAmount);

    const payment = await this.billingRepository.recordGeneralIncome({
      organizationId,
      branchId,
      grossAmount: new Prisma.Decimal(grossAmount),
      netAmount: new Prisma.Decimal(netAmount),
      currency: dto.currency.trim().toUpperCase(),
      method: dto.method,
      status: dto.status ?? PaymentStatus.APPROVED,
      description: dto.description?.trim(),
      externalProvider: dto.externalProvider?.trim(),
      externalReference: dto.externalReference?.trim(),
      recordedByMembershipId: principal.membershipId,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
      notes: dto.notes?.trim(),
    });

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'payment_record.general_income_recorded',
      entityType: 'PaymentRecord',
      entityId: payment.id,
      metadata: {
        grossAmount: payment.grossAmount.toString(),
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
      },
    });

    return payment;
  }
}
