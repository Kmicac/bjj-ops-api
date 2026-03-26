import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '../../generated/prisma/enums';

export type MercadoPagoPaymentClassification =
  | {
      outcome: 'reconcile';
      confirmation: 'confirmed' | 'pending' | 'failed';
      paymentRecordStatus: PaymentStatus;
      appliesChargePaymentImpact: boolean;
    }
  | {
      outcome: 'ignore';
      reason:
        | 'payment_status_missing'
        | 'payment_status_not_supported'
        | 'payment_refund_or_chargeback_not_supported'
        | 'payment_refund_not_supported';
    };

function normalizeOptionalString(value?: string | null) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

@Injectable()
export class MercadoPagoPaymentPolicy {
  classifyPayment(params: {
    status?: string | null;
    statusDetail?: string | null;
  }): MercadoPagoPaymentClassification {
    const status = normalizeOptionalString(params.status);
    const statusDetail = normalizeOptionalString(params.statusDetail);

    if (!status) {
      return {
        outcome: 'ignore',
        reason: 'payment_status_missing',
      };
    }

    if (status === 'approved') {
      if (statusDetail === 'partially_refunded') {
        return {
          outcome: 'ignore',
          reason: 'payment_refund_not_supported',
        };
      }

      return {
        outcome: 'reconcile',
        confirmation: 'confirmed',
        paymentRecordStatus: PaymentStatus.APPROVED,
        appliesChargePaymentImpact: true,
      };
    }

    if (
      status === 'pending' ||
      status === 'authorized' ||
      status === 'in_process' ||
      status === 'in_mediation'
    ) {
      return {
        outcome: 'reconcile',
        confirmation: 'pending',
        paymentRecordStatus: PaymentStatus.PENDING,
        appliesChargePaymentImpact: false,
      };
    }

    if (status === 'rejected') {
      return {
        outcome: 'reconcile',
        confirmation: 'failed',
        paymentRecordStatus: PaymentStatus.REJECTED,
        appliesChargePaymentImpact: false,
      };
    }

    if (status === 'cancelled' || status === 'canceled') {
      return {
        outcome: 'reconcile',
        confirmation: 'failed',
        paymentRecordStatus: PaymentStatus.CANCELED,
        appliesChargePaymentImpact: false,
      };
    }

    if (
      status === 'refunded' ||
      status === 'charged_back' ||
      status === 'chargedback'
    ) {
      return {
        outcome: 'ignore',
        reason: 'payment_refund_or_chargeback_not_supported',
      };
    }

    return {
      outcome: 'ignore',
      reason: 'payment_status_not_supported',
    };
  }
}
