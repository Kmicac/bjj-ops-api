import { ConflictException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  BillingChargeStatus,
  PaymentMethod,
  PaymentStatus,
  StudentMembershipStatus,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingRepository } from './billing.repository';

describe('BillingRepository', () => {
  let repository: BillingRepository;
  let prismaService: {
    $transaction: jest.Mock;
    billingCharge: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    paymentRecord: {
      aggregate: jest.Mock;
      count: jest.Mock;
    };
  };
  let tx: {
    $queryRaw: jest.Mock;
    studentMembership: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    paymentRecord: {
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    billingCharge: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue(undefined),
      studentMembership: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'membership_1' }),
      },
      paymentRecord: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'payment_1' }),
        update: jest.fn().mockResolvedValue({ id: 'payment_1' }),
      },
      billingCharge: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'charge_1' }),
      },
    };

    prismaService = {
      $transaction: jest.fn(async (callback, options) => {
        return callback(tx, options);
      }),
      billingCharge: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      paymentRecord: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            grossAmount: new Prisma.Decimal(0),
            netAmount: new Prisma.Decimal(0),
          },
        }),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    repository = new BillingRepository(
      prismaService as unknown as PrismaService,
    );
  });

  it('serializes approved linked student payments and updates charges as partially paid', async () => {
    tx.billingCharge.findFirst.mockResolvedValue({
      id: 'charge_1',
      branchId: 'branch_1',
      studentId: 'student_1',
      currency: 'USD',
      amount: new Prisma.Decimal(100),
      amountPaid: new Prisma.Decimal(30),
      status: BillingChargeStatus.PENDING,
    });

    await repository.recordStudentPayment({
      organizationId: 'org_1',
      branchId: 'branch_1',
      studentId: 'student_1',
      billingChargeId: 'charge_1',
      grossAmount: new Prisma.Decimal(20),
      netAmount: new Prisma.Decimal(20),
      currency: 'USD',
      method: PaymentMethod.CASH,
      status: PaymentStatus.APPROVED,
      recordedByMembershipId: 'membership_actor',
      recordedAt: new Date('2026-03-23T15:00:00.000Z'),
    });

    expect(prismaService.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }),
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.paymentRecord.create).toHaveBeenCalledTimes(1);
    expect(tx.billingCharge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'charge_1',
        },
        data: {
          amountPaid: new Prisma.Decimal(50),
          status: BillingChargeStatus.PARTIALLY_PAID,
        },
      }),
    );
  });

  it('rechecks the locked charge state and rejects payments for already settled charges', async () => {
    tx.billingCharge.findFirst.mockResolvedValue({
      id: 'charge_1',
      branchId: 'branch_1',
      studentId: 'student_1',
      currency: 'USD',
      amount: new Prisma.Decimal(100),
      amountPaid: new Prisma.Decimal(100),
      status: BillingChargeStatus.PAID,
    });

    await expect(
      repository.recordStudentPayment({
        organizationId: 'org_1',
        branchId: 'branch_1',
        studentId: 'student_1',
        billingChargeId: 'charge_1',
        grossAmount: new Prisma.Decimal(20),
        netAmount: new Prisma.Decimal(20),
        currency: 'USD',
        method: PaymentMethod.CASH,
        status: PaymentStatus.APPROVED,
        recordedByMembershipId: 'membership_actor',
        recordedAt: new Date('2026-03-23T15:00:00.000Z'),
      }),
    ).rejects.toThrow(ConflictException);

    expect(tx.paymentRecord.create).not.toHaveBeenCalled();
    expect(tx.billingCharge.update).not.toHaveBeenCalled();
  });

  it('creates an approved Mercado Pago payment record once and keeps replays idempotent', async () => {
    tx.billingCharge.findFirst.mockResolvedValue({
      id: 'charge_1',
      organizationId: 'org_1',
      branchId: 'branch_1',
      studentId: 'student_1',
      amount: new Prisma.Decimal(100),
      amountPaid: new Prisma.Decimal(0),
      currency: 'ARS',
      status: BillingChargeStatus.PENDING,
      lastExternalPaymentReference: null,
      lastExternalPaymentStatus: null,
      lastExternalPaymentStatusDetail: null,
      lastExternalPaymentObservedAt: null,
    });
    tx.paymentRecord.create.mockResolvedValueOnce({
      id: 'payment_record_1',
      organizationId: 'org_1',
      branchId: 'branch_1',
      paymentKind: 'STUDENT_PAYMENT',
      studentId: 'student_1',
      billingChargeId: 'charge_1',
      grossAmount: new Prisma.Decimal(100),
      netAmount: new Prisma.Decimal(100),
      currency: 'ARS',
      method: 'MERCADO_PAGO',
      status: PaymentStatus.APPROVED,
      description: 'Mercado Pago payment',
      externalProvider: 'MERCADO_PAGO',
      externalReference: 'mp_payment_1',
      recordedByMembershipId: null,
      recordedAt: new Date('2026-03-26T10:00:00.000Z'),
      notes: null,
      createdAt: new Date('2026-03-26T10:00:00.000Z'),
      updatedAt: new Date('2026-03-26T10:00:00.000Z'),
      student: null,
      billingCharge: null,
    });
    tx.billingCharge.update.mockResolvedValue({
      id: 'charge_1',
      amountPaid: new Prisma.Decimal(100),
      status: BillingChargeStatus.PAID,
      lastExternalPaymentReference: 'mp_payment_1',
      lastExternalPaymentStatus: 'approved',
      lastExternalPaymentStatusDetail: 'accredited',
      lastExternalPaymentObservedAt: new Date('2026-03-26T10:00:00.000Z'),
    });

    await repository.reconcileMercadoPagoPayment({
      organizationId: 'org_1',
      chargeId: 'charge_1',
      paymentReference: 'mp_payment_1',
      paymentStatus: PaymentStatus.APPROVED,
      paymentAmount: new Prisma.Decimal(100),
      currency: 'ARS',
      externalPaymentStatus: 'approved',
      externalPaymentStatusDetail: 'accredited',
      observedAt: new Date('2026-03-26T10:00:00.000Z'),
      recordedAt: new Date('2026-03-26T10:00:00.000Z'),
    });

    expect(tx.paymentRecord.create).toHaveBeenCalledTimes(1);
    expect(tx.paymentRecord.update).not.toHaveBeenCalled();
    expect(tx.billingCharge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPaid: new Prisma.Decimal(100),
          status: BillingChargeStatus.PAID,
        }),
      }),
    );

    tx.paymentRecord.findMany.mockResolvedValueOnce([
      {
        id: 'payment_record_1',
        organizationId: 'org_1',
        branchId: 'branch_1',
        paymentKind: 'STUDENT_PAYMENT',
        studentId: 'student_1',
        billingChargeId: 'charge_1',
        grossAmount: new Prisma.Decimal(100),
        netAmount: new Prisma.Decimal(100),
        currency: 'ARS',
        method: 'MERCADO_PAGO',
        status: PaymentStatus.APPROVED,
        description: 'Mercado Pago payment',
        externalProvider: 'MERCADO_PAGO',
        externalReference: 'mp_payment_1',
        recordedByMembershipId: null,
        recordedAt: new Date('2026-03-26T10:00:00.000Z'),
        notes: null,
        createdAt: new Date('2026-03-26T10:00:00.000Z'),
        updatedAt: new Date('2026-03-26T10:00:00.000Z'),
        student: null,
        billingCharge: null,
      },
    ]);
    tx.billingCharge.findFirst.mockResolvedValueOnce({
      id: 'charge_1',
      organizationId: 'org_1',
      branchId: 'branch_1',
      studentId: 'student_1',
      amount: new Prisma.Decimal(100),
      amountPaid: new Prisma.Decimal(100),
      currency: 'ARS',
      status: BillingChargeStatus.PAID,
      lastExternalPaymentReference: 'mp_payment_1',
      lastExternalPaymentStatus: 'approved',
      lastExternalPaymentStatusDetail: 'accredited',
      lastExternalPaymentObservedAt: new Date('2026-03-26T10:00:00.000Z'),
    });

    await repository.reconcileMercadoPagoPayment({
      organizationId: 'org_1',
      chargeId: 'charge_1',
      paymentReference: 'mp_payment_1',
      paymentStatus: PaymentStatus.APPROVED,
      paymentAmount: new Prisma.Decimal(100),
      currency: 'ARS',
      externalPaymentStatus: 'approved',
      externalPaymentStatusDetail: 'accredited',
      observedAt: new Date('2026-03-26T11:00:00.000Z'),
      recordedAt: new Date('2026-03-26T10:00:00.000Z'),
    });

    expect(tx.paymentRecord.create).toHaveBeenCalledTimes(1);
    expect(tx.paymentRecord.update).toHaveBeenCalledTimes(1);
    expect(tx.billingCharge.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPaid: new Prisma.Decimal(100),
          status: BillingChargeStatus.PAID,
        }),
      }),
    );
  });

  it('moves a pending Mercado Pago payment record to approved without duplicating PaymentRecord', async () => {
    tx.billingCharge.findFirst.mockResolvedValue({
      id: 'charge_1',
      organizationId: 'org_1',
      branchId: 'branch_1',
      studentId: 'student_1',
      amount: new Prisma.Decimal(100),
      amountPaid: new Prisma.Decimal(0),
      currency: 'ARS',
      status: BillingChargeStatus.PENDING,
      lastExternalPaymentReference: 'mp_payment_1',
      lastExternalPaymentStatus: 'authorized',
      lastExternalPaymentStatusDetail: null,
      lastExternalPaymentObservedAt: new Date('2026-03-26T09:00:00.000Z'),
    });
    tx.paymentRecord.findMany.mockResolvedValueOnce([
      {
        id: 'payment_record_1',
        organizationId: 'org_1',
        branchId: 'branch_1',
        paymentKind: 'STUDENT_PAYMENT',
        studentId: 'student_1',
        billingChargeId: 'charge_1',
        grossAmount: new Prisma.Decimal(100),
        netAmount: new Prisma.Decimal(100),
        currency: 'ARS',
        method: 'MERCADO_PAGO',
        status: PaymentStatus.PENDING,
        description: 'Mercado Pago payment',
        externalProvider: 'MERCADO_PAGO',
        externalReference: 'mp_payment_1',
        recordedByMembershipId: null,
        recordedAt: new Date('2026-03-26T09:00:00.000Z'),
        notes: null,
        createdAt: new Date('2026-03-26T09:00:00.000Z'),
        updatedAt: new Date('2026-03-26T09:00:00.000Z'),
        student: null,
        billingCharge: null,
      },
    ]);

    await repository.reconcileMercadoPagoPayment({
      organizationId: 'org_1',
      chargeId: 'charge_1',
      paymentReference: 'mp_payment_1',
      paymentStatus: PaymentStatus.APPROVED,
      paymentAmount: new Prisma.Decimal(100),
      currency: 'ARS',
      externalPaymentStatus: 'approved',
      externalPaymentStatusDetail: 'accredited',
      observedAt: new Date('2026-03-26T10:00:00.000Z'),
      recordedAt: new Date('2026-03-26T10:00:00.000Z'),
    });

    expect(tx.paymentRecord.create).not.toHaveBeenCalled();
    expect(tx.paymentRecord.update).toHaveBeenCalledTimes(1);
    expect(tx.billingCharge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPaid: new Prisma.Decimal(100),
          status: BillingChargeStatus.PAID,
        }),
      }),
    );
  });

  it('stores pending and rejected Mercado Pago attempts without increasing amountPaid', async () => {
    tx.billingCharge.findFirst.mockResolvedValue({
      id: 'charge_1',
      organizationId: 'org_1',
      branchId: 'branch_1',
      studentId: 'student_1',
      amount: new Prisma.Decimal(100),
      amountPaid: new Prisma.Decimal(0),
      currency: 'ARS',
      status: BillingChargeStatus.PENDING,
      lastExternalPaymentReference: null,
      lastExternalPaymentStatus: null,
      lastExternalPaymentStatusDetail: null,
      lastExternalPaymentObservedAt: null,
    });
    tx.paymentRecord.create.mockResolvedValue({
      id: 'payment_record_pending_1',
    });

    await repository.reconcileMercadoPagoPayment({
      organizationId: 'org_1',
      chargeId: 'charge_1',
      paymentReference: 'mp_payment_pending_1',
      paymentStatus: PaymentStatus.PENDING,
      paymentAmount: new Prisma.Decimal(100),
      currency: 'ARS',
      externalPaymentStatus: 'authorized',
      observedAt: new Date('2026-03-26T09:00:00.000Z'),
      recordedAt: new Date('2026-03-26T09:00:00.000Z'),
    });

    expect(tx.billingCharge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPaid: new Prisma.Decimal(0),
          status: BillingChargeStatus.PENDING,
        }),
      }),
    );

    tx.paymentRecord.create.mockClear();
    tx.billingCharge.update.mockClear();
    tx.billingCharge.findFirst.mockResolvedValueOnce({
      id: 'charge_1',
      organizationId: 'org_1',
      branchId: 'branch_1',
      studentId: 'student_1',
      amount: new Prisma.Decimal(100),
      amountPaid: new Prisma.Decimal(0),
      currency: 'ARS',
      status: BillingChargeStatus.PENDING,
      lastExternalPaymentReference: 'mp_payment_pending_1',
      lastExternalPaymentStatus: 'authorized',
      lastExternalPaymentStatusDetail: null,
      lastExternalPaymentObservedAt: new Date('2026-03-26T09:00:00.000Z'),
    });

    await repository.reconcileMercadoPagoPayment({
      organizationId: 'org_1',
      chargeId: 'charge_1',
      paymentReference: 'mp_payment_rejected_1',
      paymentStatus: PaymentStatus.REJECTED,
      paymentAmount: new Prisma.Decimal(100),
      currency: 'ARS',
      externalPaymentStatus: 'rejected',
      observedAt: new Date('2026-03-26T09:30:00.000Z'),
      recordedAt: new Date('2026-03-26T09:30:00.000Z'),
    });

    expect(tx.paymentRecord.create).toHaveBeenCalledTimes(1);
    expect(tx.billingCharge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPaid: new Prisma.Decimal(0),
          status: BillingChargeStatus.PENDING,
        }),
      }),
    );
  });

  it('guards student membership creation with a transactional branch-local lock', async () => {
    tx.studentMembership.findFirst.mockResolvedValue({
      id: 'membership_existing',
    });

    await expect(
      repository.createStudentMembership({
        organizationId: 'org_1',
        branchId: 'branch_1',
        studentId: 'student_1',
        billingPlanId: 'plan_1',
        status: StudentMembershipStatus.ACTIVE,
        startedAt: new Date('2026-03-01'),
      }),
    ).rejects.toThrow(ConflictException);

    expect(prismaService.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }),
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.studentMembership.create).not.toHaveBeenCalled();
  });

  it('uses an inclusive end-of-day cutoff for student charge list filters', async () => {
    await repository.listStudentBillingCharges({
      organizationId: 'org_1',
      branchId: 'branch_1',
      studentId: 'student_1',
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      skip: 0,
      take: 20,
      graceDays: 0,
    });

    const where = prismaService.billingCharge.findMany.mock.calls[0][0].where;
    expect(where.dueDate.gte.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(where.dueDate.lte.toISOString()).toBe('2026-03-31T23:59:59.999Z');
  });

  it('uses an inclusive end-of-day cutoff for branch billing summary charge windows', async () => {
    await repository.getBranchBillingSummaryData({
      organizationId: 'org_1',
      branchId: 'branch_1',
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      graceDays: 0,
    });

    const pendingChargesWhere =
      prismaService.billingCharge.count.mock.calls[0][0].where;
    const paidChargesWhere =
      prismaService.billingCharge.count.mock.calls[2][0].where;

    expect(pendingChargesWhere.dueDate.lte.toISOString()).toBe(
      '2026-03-31T23:59:59.999Z',
    );
    expect(paidChargesWhere.dueDate.lte.toISOString()).toBe(
      '2026-03-31T23:59:59.999Z',
    );
  });
});
