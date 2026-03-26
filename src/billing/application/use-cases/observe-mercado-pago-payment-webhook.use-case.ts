import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { IntegrationProvider } from '../../../generated/prisma/enums';
import { AuditService } from '../../../audit/audit.service';
import { MercadoPagoPaymentPolicy } from '../../domain/mercado-pago-payment.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

const BILLING_CHARGE_EXTERNAL_REFERENCE_PREFIX = 'billing_charge:';

function extractChargeId(externalReference?: string | null) {
  if (!externalReference?.startsWith(BILLING_CHARGE_EXTERNAL_REFERENCE_PREFIX)) {
    return null;
  }

  const chargeId = externalReference.slice(
    BILLING_CHARGE_EXTERNAL_REFERENCE_PREFIX.length,
  );

  return chargeId.length > 0 ? chargeId : null;
}

function normalizeCurrency(value?: string | null) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveRecordedAt(params: {
  paymentStatus?: string;
  dateApproved?: string;
  dateLastUpdated?: string;
  dateCreated?: string;
  observedAt: Date;
}) {
  const candidates =
    params.paymentStatus?.trim().toLowerCase() === 'approved'
      ? [
          params.dateApproved,
          params.dateLastUpdated,
          params.dateCreated,
        ]
      : [params.dateLastUpdated, params.dateCreated, params.dateApproved];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const value = new Date(candidate);

    if (!Number.isNaN(value.getTime())) {
      return value;
    }
  }

  return params.observedAt;
}

@Injectable()
export class ObserveMercadoPagoPaymentWebhookUseCase {
  constructor(
    private readonly mercadoPagoPaymentPolicy: MercadoPagoPaymentPolicy,
    private readonly billingRepository: BillingRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(params: {
    organizationId: string;
    branchId: string;
    webhookEventId: string;
    integrationConnectionId: string;
    paymentId: string;
    externalReference?: string;
    paymentStatus?: string;
    paymentStatusDetail?: string;
    transactionAmount?: number;
    currency?: string;
    dateCreated?: string;
    dateApproved?: string;
    dateLastUpdated?: string;
    observedAt?: Date;
  }) {
    const chargeId = extractChargeId(params.externalReference);

    if (!chargeId) {
      return {
        outcome: 'ignored' as const,
        reason: 'external_reference_not_supported',
      };
    }

    let charge:
      | Awaited<
          ReturnType<
            BillingRepository['getBillingChargeExternalPaymentObservationTarget']
          >
        >
      | null = null;

    try {
      charge =
        await this.billingRepository.getBillingChargeExternalPaymentObservationTarget(
          params.organizationId,
          chargeId,
        );
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          outcome: 'ignored' as const,
          reason: 'charge_not_found',
        };
      }

      throw error;
    }

    if (charge.branchId !== params.branchId) {
      return {
        outcome: 'ignored' as const,
        reason: 'charge_outside_branch_scope',
      };
    }

    if (charge.externalProvider !== IntegrationProvider.MERCADO_PAGO) {
      return {
        outcome: 'ignored' as const,
        reason: 'charge_not_linked_to_mercado_pago',
      };
    }

    const classification = this.mercadoPagoPaymentPolicy.classifyPayment({
      status: params.paymentStatus,
      statusDetail: params.paymentStatusDetail,
    });

    if (classification.outcome === 'ignore') {
      await this.billingRepository.markMercadoPagoPaymentObserved({
        organizationId: params.organizationId,
        chargeId: charge.id,
        paymentReference: params.paymentId,
        paymentStatus: params.paymentStatus,
        paymentStatusDetail: params.paymentStatusDetail,
        observedAt: params.observedAt ?? new Date(),
      });

      return {
        outcome: 'ignored' as const,
        reason: classification.reason,
      };
    }

    const currency = normalizeCurrency(params.currency);

    if (!currency) {
      throw new ConflictException(
        'Mercado Pago payment currency is required for reconciliation',
      );
    }

    if (
      typeof params.transactionAmount !== 'number' ||
      !Number.isFinite(params.transactionAmount) ||
      params.transactionAmount <= 0
    ) {
      throw new ConflictException(
        'Mercado Pago payment amount must be a positive number for reconciliation',
      );
    }

    const observedAt = params.observedAt ?? new Date();
    const result = await this.billingRepository.reconcileMercadoPagoPayment({
      organizationId: params.organizationId,
      chargeId: charge.id,
      paymentReference: params.paymentId,
      paymentStatus: classification.paymentRecordStatus,
      paymentAmount: new Prisma.Decimal(params.transactionAmount),
      currency,
      description: charge.description?.trim() || 'Mercado Pago payment',
      externalPaymentStatus: params.paymentStatus,
      externalPaymentStatusDetail: params.paymentStatusDetail,
      observedAt,
      recordedAt: resolveRecordedAt({
        paymentStatus: params.paymentStatus,
        dateApproved: params.dateApproved,
        dateLastUpdated: params.dateLastUpdated,
        dateCreated: params.dateCreated,
        observedAt,
      }),
    });

    await this.auditService.create({
      organizationId: params.organizationId,
      branchId: params.branchId,
      action: 'payment_record.mercado_pago_reconciled',
      entityType: 'PaymentRecord',
      entityId: result.paymentRecord.id,
      metadata: {
        webhookEventId: params.webhookEventId,
        integrationConnectionId: params.integrationConnectionId,
        chargeId: charge.id,
        paymentId: params.paymentId,
        paymentStatus: params.paymentStatus,
        paymentStatusDetail: params.paymentStatusDetail,
        internalPaymentStatus: result.paymentRecord.status,
        paymentRecordAction: result.paymentRecordAction,
        billingChargeStatus: result.charge.status,
        billingChargeAmountPaid: result.charge.amountPaid.toString(),
        confirmation: classification.confirmation,
      },
    });

    return {
      outcome: 'updated' as const,
      chargeId: charge.id,
      paymentRecordId: result.paymentRecord.id,
      paymentRecordStatus: result.paymentRecord.status,
      chargeStatus: result.charge.status,
      paymentRecordAction: result.paymentRecordAction,
    };
  }
}
