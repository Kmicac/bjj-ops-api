import { PaymentStatus } from '../../generated/prisma/enums';
import { MercadoPagoPaymentPolicy } from './mercado-pago-payment.policy';

describe('MercadoPagoPaymentPolicy', () => {
  let policy: MercadoPagoPaymentPolicy;

  beforeEach(() => {
    policy = new MercadoPagoPaymentPolicy();
  });

  it('treats approved Mercado Pago payments as internally confirmed collections', () => {
    expect(
      policy.classifyPayment({
        status: 'approved',
        statusDetail: 'accredited',
      }),
    ).toEqual({
      outcome: 'reconcile',
      confirmation: 'confirmed',
      paymentRecordStatus: PaymentStatus.APPROVED,
      appliesChargePaymentImpact: true,
    });
  });

  it('tracks pending-like Mercado Pago states without confirming the charge', () => {
    expect(
      policy.classifyPayment({
        status: 'authorized',
      }),
    ).toEqual({
      outcome: 'reconcile',
      confirmation: 'pending',
      paymentRecordStatus: PaymentStatus.PENDING,
      appliesChargePaymentImpact: false,
    });
  });

  it('maps rejected and cancelled payments to non-confirming internal states', () => {
    expect(
      policy.classifyPayment({
        status: 'rejected',
      }),
    ).toEqual({
      outcome: 'reconcile',
      confirmation: 'failed',
      paymentRecordStatus: PaymentStatus.REJECTED,
      appliesChargePaymentImpact: false,
    });

    expect(
      policy.classifyPayment({
        status: 'cancelled',
      }),
    ).toEqual({
      outcome: 'reconcile',
      confirmation: 'failed',
      paymentRecordStatus: PaymentStatus.CANCELED,
      appliesChargePaymentImpact: false,
    });
  });

  it('keeps refund-like states out of the minimal reconciliation flow', () => {
    expect(
      policy.classifyPayment({
        status: 'approved',
        statusDetail: 'partially_refunded',
      }),
    ).toEqual({
      outcome: 'ignore',
      reason: 'payment_refund_not_supported',
    });

    expect(
      policy.classifyPayment({
        status: 'charged_back',
      }),
    ).toEqual({
      outcome: 'ignore',
      reason: 'payment_refund_or_chargeback_not_supported',
    });
  });
});
