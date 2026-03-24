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
      create: jest.Mock;
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
        create: jest.fn().mockResolvedValue({ id: 'payment_1' }),
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
