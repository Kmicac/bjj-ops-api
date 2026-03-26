import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { PaymentStatus } from '../../../generated/prisma/enums';
import { MercadoPagoPaymentPolicy } from '../../domain/mercado-pago-payment.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';
import { ObserveMercadoPagoPaymentWebhookUseCase } from './observe-mercado-pago-payment-webhook.use-case';

describe('ObserveMercadoPagoPaymentWebhookUseCase', () => {
  let useCase: ObserveMercadoPagoPaymentWebhookUseCase;
  let billingRepository: {
    getBillingChargeExternalPaymentObservationTarget: jest.Mock;
    reconcileMercadoPagoPayment: jest.Mock;
    markMercadoPagoPaymentObserved: jest.Mock;
  };
  let auditService: {
    create: jest.Mock;
  };

  beforeEach(async () => {
    billingRepository = {
      getBillingChargeExternalPaymentObservationTarget: jest.fn().mockResolvedValue({
        id: 'charge_1',
        organizationId: 'org_1',
        branchId: 'branch_1',
        studentId: 'student_1',
        amount: {
          toNumber: () => 100,
        },
        amountPaid: {
          toNumber: () => 0,
        },
        currency: 'ARS',
        status: 'PENDING',
        description: 'March membership',
        externalProvider: 'MERCADO_PAGO',
        externalReference: 'pref_123',
        lastExternalPaymentReference: null,
        lastExternalPaymentStatus: null,
        lastExternalPaymentStatusDetail: null,
        lastExternalPaymentObservedAt: null,
      }),
      reconcileMercadoPagoPayment: jest.fn().mockResolvedValue({
        paymentRecord: {
          id: 'payment_record_1',
          status: PaymentStatus.APPROVED,
        },
        paymentRecordAction: 'created',
        charge: {
          id: 'charge_1',
          amountPaid: {
            toString: () => '100.00',
          },
          status: 'PAID',
        },
      }),
      markMercadoPagoPaymentObserved: jest.fn().mockResolvedValue({
        id: 'charge_1',
      }),
    };

    auditService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObserveMercadoPagoPaymentWebhookUseCase,
        {
          provide: BillingRepository,
          useValue: billingRepository,
        },
        MercadoPagoPaymentPolicy,
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    useCase = module.get<ObserveMercadoPagoPaymentWebhookUseCase>(
      ObserveMercadoPagoPaymentWebhookUseCase,
    );
  });

  it('reconciles an approved Mercado Pago payment into PaymentRecord and BillingCharge', async () => {
    const result = await useCase.execute({
      organizationId: 'org_1',
      branchId: 'branch_1',
      webhookEventId: 'webhook_1',
      integrationConnectionId: 'integration_1',
      paymentId: 'payment_1',
      externalReference: 'billing_charge:charge_1',
      paymentStatus: 'approved',
      paymentStatusDetail: 'accredited',
      transactionAmount: 100,
      currency: 'ARS',
      observedAt: new Date('2026-03-26T12:00:00.000Z'),
    });

    expect(billingRepository.reconcileMercadoPagoPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        chargeId: 'charge_1',
        paymentReference: 'payment_1',
        paymentStatus: PaymentStatus.APPROVED,
      }),
    );
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment_record.mercado_pago_reconciled',
        entityId: 'payment_record_1',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        outcome: 'updated',
        chargeId: 'charge_1',
        paymentRecordId: 'payment_record_1',
        paymentRecordStatus: PaymentStatus.APPROVED,
        chargeStatus: 'PAID',
        paymentRecordAction: 'created',
      }),
    );
  });

  it('ignores events whose external reference is outside the billing charge namespace', async () => {
    const result = await useCase.execute({
      organizationId: 'org_1',
      branchId: 'branch_1',
      webhookEventId: 'webhook_1',
      integrationConnectionId: 'integration_1',
      paymentId: 'payment_1',
      externalReference: 'other:charge_1',
      paymentStatus: 'approved',
    });

    expect(
      billingRepository.getBillingChargeExternalPaymentObservationTarget,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      outcome: 'ignored',
      reason: 'external_reference_not_supported',
    });
  });

  it('does not apply impact outside the branch scope that resolved the integration', async () => {
    billingRepository.getBillingChargeExternalPaymentObservationTarget.mockResolvedValue({
      id: 'charge_1',
      organizationId: 'org_1',
      branchId: 'branch_2',
      studentId: 'student_1',
      amount: {
        toNumber: () => 100,
      },
      amountPaid: {
        toNumber: () => 0,
      },
      currency: 'ARS',
      status: 'PENDING',
      description: 'March membership',
      externalProvider: 'MERCADO_PAGO',
      externalReference: 'pref_123',
      lastExternalPaymentReference: null,
      lastExternalPaymentStatus: null,
      lastExternalPaymentStatusDetail: null,
      lastExternalPaymentObservedAt: null,
    });

    const result = await useCase.execute({
      organizationId: 'org_1',
      branchId: 'branch_1',
      webhookEventId: 'webhook_1',
      integrationConnectionId: 'integration_1',
      paymentId: 'payment_1',
      externalReference: 'billing_charge:charge_1',
      paymentStatus: 'approved',
    });

    expect(billingRepository.reconcileMercadoPagoPayment).not.toHaveBeenCalled();
    expect(result).toEqual({
      outcome: 'ignored',
      reason: 'charge_outside_branch_scope',
    });
  });

  it('ignores a Mercado Pago payment that points to an unknown billing charge', async () => {
    billingRepository.getBillingChargeExternalPaymentObservationTarget.mockRejectedValue(
      new NotFoundException('Billing charge not found'),
    );

    const result = await useCase.execute({
      organizationId: 'org_1',
      branchId: 'branch_1',
      webhookEventId: 'webhook_1',
      integrationConnectionId: 'integration_1',
      paymentId: 'payment_1',
      externalReference: 'billing_charge:missing_charge',
      paymentStatus: 'approved',
    });

    expect(billingRepository.reconcileMercadoPagoPayment).not.toHaveBeenCalled();
    expect(result).toEqual({
      outcome: 'ignored',
      reason: 'charge_not_found',
    });
  });

  it('creates a pending internal PaymentRecord without confirming the BillingCharge', async () => {
    billingRepository.reconcileMercadoPagoPayment.mockResolvedValueOnce({
      paymentRecord: {
        id: 'payment_record_pending_1',
        status: PaymentStatus.PENDING,
      },
      paymentRecordAction: 'created',
      charge: {
        id: 'charge_1',
        amountPaid: {
          toString: () => '0.00',
        },
        status: 'PENDING',
      },
    });

    const result = await useCase.execute({
      organizationId: 'org_1',
      branchId: 'branch_1',
      webhookEventId: 'webhook_1',
      integrationConnectionId: 'integration_1',
      paymentId: 'payment_1',
      externalReference: 'billing_charge:charge_1',
      paymentStatus: 'authorized',
      transactionAmount: 100,
      currency: 'ARS',
    });

    expect(billingRepository.reconcileMercadoPagoPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: PaymentStatus.PENDING,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        outcome: 'updated',
        paymentRecordStatus: PaymentStatus.PENDING,
        chargeStatus: 'PENDING',
      }),
    );
  });

  it('stores refund-like states as trace only and does not reconcile them into billing impact', async () => {
    const result = await useCase.execute({
      organizationId: 'org_1',
      branchId: 'branch_1',
      webhookEventId: 'webhook_1',
      integrationConnectionId: 'integration_1',
      paymentId: 'payment_1',
      externalReference: 'billing_charge:charge_1',
      paymentStatus: 'charged_back',
      observedAt: new Date('2026-03-26T12:00:00.000Z'),
    });

    expect(billingRepository.reconcileMercadoPagoPayment).not.toHaveBeenCalled();
    expect(billingRepository.markMercadoPagoPaymentObserved).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentReference: 'payment_1',
        paymentStatus: 'charged_back',
      }),
    );
    expect(result).toEqual({
      outcome: 'ignored',
      reason: 'payment_refund_or_chargeback_not_supported',
    });
  });
});
