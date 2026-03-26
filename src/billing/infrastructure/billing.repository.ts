import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  BillingChargeType,
  BillingChargeStatus,
  BillingFrequency,
  DiscountType,
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
  StudentMembershipStatus,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

const OPEN_MEMBERSHIP_STATUSES = [
  StudentMembershipStatus.ACTIVE,
  StudentMembershipStatus.PAUSED,
  StudentMembershipStatus.FROZEN,
] as StudentMembershipStatus[];

const OPEN_CHARGE_STATUSES = [
  BillingChargeStatus.PENDING,
  BillingChargeStatus.PARTIALLY_PAID,
] as BillingChargeStatus[];

const BILLING_MEMBERSHIP_LOCK_NAMESPACE = 5101;
const BILLING_CHARGE_PAYMENT_LOCK_NAMESPACE = 5102;

const branchAccessSelect = {
  id: true,
  organizationId: true,
  headCoachMembershipId: true,
} satisfies Prisma.BranchSelect;

const billingPlanSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  name: true,
  description: true,
  billingFrequency: true,
  amount: true,
  currency: true,
  enrollmentFeeAmount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BillingPlanSelect;

const billingPlanAccessSelect = {
  ...billingPlanSelect,
  branch: {
    select: branchAccessSelect,
  },
} satisfies Prisma.BillingPlanSelect;

const studentMembershipSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  studentId: true,
  billingPlanId: true,
  status: true,
  startedAt: true,
  endedAt: true,
  nextBillingDate: true,
  freezeStartAt: true,
  freezeEndAt: true,
  discountType: true,
  discountValue: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  billingPlan: {
    select: billingPlanSelect,
  },
} satisfies Prisma.StudentMembershipSelect;

const branchStudentFinancialMembershipSelect = {
  id: true,
  studentId: true,
  status: true,
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.StudentMembershipSelect;

const billingChargeSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  studentId: true,
  studentMembershipId: true,
  billingPlanId: true,
  chargeType: true,
  periodStart: true,
  periodEnd: true,
  dueDate: true,
  amount: true,
  amountPaid: true,
  currency: true,
  status: true,
  description: true,
  externalProvider: true,
  externalReference: true,
  createdAt: true,
  updatedAt: true,
  billingPlan: {
    select: {
      id: true,
      name: true,
      billingFrequency: true,
      amount: true,
      currency: true,
    },
  },
  studentMembership: {
    select: {
      id: true,
      status: true,
      nextBillingDate: true,
    },
  },
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.BillingChargeSelect;

const branchStudentFinancialChargeSelect = {
  studentId: true,
  dueDate: true,
  amount: true,
  amountPaid: true,
  status: true,
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.BillingChargeSelect;

const paymentRecordSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  paymentKind: true,
  studentId: true,
  billingChargeId: true,
  grossAmount: true,
  netAmount: true,
  currency: true,
  method: true,
  status: true,
  description: true,
  externalProvider: true,
  externalReference: true,
  recordedByMembershipId: true,
  recordedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  billingCharge: {
    select: {
      id: true,
      chargeType: true,
      dueDate: true,
      amount: true,
      currency: true,
      status: true,
    },
  },
} satisfies Prisma.PaymentRecordSelect;

const billingPolicySelect = {
  id: true,
  organizationId: true,
  branchId: true,
  graceDays: true,
  restrictAttendanceWhenOverdue: true,
  restrictAppUsageWhenOverdue: true,
  allowFreeze: true,
  maxFreezeDaysPerYear: true,
  allowManualDiscounts: true,
  allowPartialPayments: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BillingPolicySelect;

type BillingPlanRecord = Prisma.BillingPlanGetPayload<{
  select: typeof billingPlanSelect;
}>;

type BillingPlanAccessRecord = Prisma.BillingPlanGetPayload<{
  select: typeof billingPlanAccessSelect;
}>;

type StudentMembershipRecord = Prisma.StudentMembershipGetPayload<{
  select: typeof studentMembershipSelect;
}>;

type BillingChargeRecord = Prisma.BillingChargeGetPayload<{
  select: typeof billingChargeSelect;
}>;

type PaymentRecordRecord = Prisma.PaymentRecordGetPayload<{
  select: typeof paymentRecordSelect;
}>;

type BillingChargeMercadoPagoPreferenceTarget = {
  id: string;
  organizationId: string;
  branchId: string;
  studentId: string;
  amount: Prisma.Decimal;
  amountPaid: Prisma.Decimal;
  currency: string;
  status: BillingChargeStatus;
  chargeType: BillingChargeType;
  description: string | null;
  externalProvider: string | null;
  externalReference: string | null;
};

type BillingChargeExternalPaymentObservationTarget = {
  id: string;
  organizationId: string;
  branchId: string;
  studentId: string;
  amount: Prisma.Decimal;
  amountPaid: Prisma.Decimal;
  currency: string;
  status: BillingChargeStatus;
  description: string | null;
  externalProvider: string | null;
  externalReference: string | null;
  lastExternalPaymentReference: string | null;
  lastExternalPaymentStatus: string | null;
  lastExternalPaymentStatusDetail: string | null;
  lastExternalPaymentObservedAt: Date | null;
};

type TxClient = Prisma.TransactionClient;

function zeroDecimal() {
  return new Prisma.Decimal(0);
}

function toStartOfUtcDay(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function toEndOfUtcDay(value: string) {
  const date = new Date(value);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function getOverdueCutoff(graceDays: number, now = new Date()) {
  const cutoff = toStartOfUtcDay(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - graceDays);
  return cutoff;
}

function isChargeOverdue(
  charge: {
    dueDate: Date;
    status: BillingChargeStatus;
  },
  graceDays: number,
  now = new Date(),
) {
  if (charge.status === BillingChargeStatus.CANCELED) {
    return false;
  }

  if (charge.status === BillingChargeStatus.VOID) {
    return false;
  }

  if (charge.status === BillingChargeStatus.PAID) {
    return false;
  }

  if (charge.status === BillingChargeStatus.OVERDUE) {
    return true;
  }

  return charge.dueDate < getOverdueCutoff(graceDays, now);
}

function getEffectiveChargeStatus<
  T extends {
    dueDate: Date;
    status: BillingChargeStatus;
  },
>(charge: T, graceDays: number, now = new Date()) {
  if (isChargeOverdue(charge, graceDays, now)) {
    return BillingChargeStatus.OVERDUE;
  }

  return charge.status;
}

function getOutstandingAmount(
  amount: Prisma.Decimal,
  amountPaid: Prisma.Decimal,
) {
  const outstandingAmount = amount.minus(amountPaid);
  return outstandingAmount.lessThan(0)
    ? new Prisma.Decimal(0)
    : outstandingAmount;
}

function mapChargeRecord<
  T extends {
    dueDate: Date;
    status: BillingChargeStatus;
    amount: Prisma.Decimal;
    amountPaid: Prisma.Decimal;
  },
>(charge: T, graceDays: number) {
  return {
    ...charge,
    effectiveStatus: getEffectiveChargeStatus(charge, graceDays),
    outstandingAmount: getOutstandingAmount(charge.amount, charge.amountPaid),
  };
}

function buildChargeStatusWhere(
  status: BillingChargeStatus,
  graceDays: number,
) {
  const overdueCutoff = getOverdueCutoff(graceDays);

  if (status === BillingChargeStatus.OVERDUE) {
    return {
      OR: [
        {
          status: BillingChargeStatus.OVERDUE,
        },
        {
          status: {
            in: OPEN_CHARGE_STATUSES,
          },
          dueDate: {
            lt: overdueCutoff,
          },
        },
      ],
    } satisfies Prisma.BillingChargeWhereInput;
  }

  if (status === BillingChargeStatus.PENDING) {
    return {
      status: BillingChargeStatus.PENDING,
      dueDate: {
        gte: overdueCutoff,
      },
    } satisfies Prisma.BillingChargeWhereInput;
  }

  if (status === BillingChargeStatus.PARTIALLY_PAID) {
    return {
      status: BillingChargeStatus.PARTIALLY_PAID,
      dueDate: {
        gte: overdueCutoff,
      },
    } satisfies Prisma.BillingChargeWhereInput;
  }

  return {
    status,
  } satisfies Prisma.BillingChargeWhereInput;
}

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getBranchAccessTarget(organizationId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        organizationId,
        deletedAt: null,
      },
      select: branchAccessSelect,
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async getStudentBillingTarget(organizationId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        primaryBranchId: true,
        firstName: true,
        lastName: true,
        primaryBranch: {
          select: branchAccessSelect,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async getBillingPlanAccessTarget(organizationId: string, planId: string) {
    const plan = await this.prisma.billingPlan.findFirst({
      where: {
        id: planId,
        organizationId,
        deletedAt: null,
      },
      select: billingPlanAccessSelect,
    });

    if (!plan) {
      throw new NotFoundException('Billing plan not found');
    }

    return plan as BillingPlanAccessRecord;
  }

  async createBillingPlan(params: {
    organizationId: string;
    branchId: string;
    name: string;
    description?: string;
    billingFrequency: BillingFrequency;
    amount: Prisma.Decimal;
    currency: string;
    enrollmentFeeAmount?: Prisma.Decimal;
    isActive: boolean;
  }) {
    return this.prisma.billingPlan.create({
      data: {
        organizationId: params.organizationId,
        branchId: params.branchId,
        name: params.name,
        description: params.description,
        billingFrequency: params.billingFrequency,
        amount: params.amount,
        currency: params.currency,
        enrollmentFeeAmount: params.enrollmentFeeAmount,
        isActive: params.isActive,
      },
      select: billingPlanSelect,
    });
  }

  async listBillingPlans(params: { organizationId: string; branchId: string }) {
    return this.prisma.billingPlan.findMany({
      where: {
        organizationId: params.organizationId,
        branchId: params.branchId,
        deletedAt: null,
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: billingPlanSelect,
    });
  }

  async updateBillingPlan(params: {
    planId: string;
    name?: string;
    description?: string;
    billingFrequency?: BillingFrequency;
    amount?: Prisma.Decimal;
    currency?: string;
    enrollmentFeeAmount?: Prisma.Decimal | null;
    isActive?: boolean;
  }) {
    return this.prisma.billingPlan.update({
      where: {
        id: params.planId,
      },
      data: {
        name: params.name,
        description: params.description,
        billingFrequency: params.billingFrequency,
        amount: params.amount,
        currency: params.currency,
        enrollmentFeeAmount: params.enrollmentFeeAmount,
        isActive: params.isActive,
      },
      select: billingPlanSelect,
    });
  }

  async getStudentCurrentMembership(
    organizationId: string,
    studentId: string,
    branchId: string,
  ): Promise<StudentMembershipRecord | null> {
    return this.prisma.studentMembership.findFirst({
      where: {
        organizationId,
        studentId,
        branchId,
        status: {
          in: OPEN_MEMBERSHIP_STATUSES,
        },
      },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
      select: studentMembershipSelect,
    });
  }

  async getRequiredStudentCurrentMembership(
    organizationId: string,
    studentId: string,
    branchId: string,
  ): Promise<StudentMembershipRecord> {
    const membership = await this.getStudentCurrentMembership(
      organizationId,
      studentId,
      branchId,
    );

    if (!membership) {
      throw new NotFoundException('Student membership not found');
    }

    return membership;
  }

  async getStudentMembershipById(
    organizationId: string,
    studentId: string,
    membershipId: string,
  ): Promise<StudentMembershipRecord> {
    const membership = await this.prisma.studentMembership.findFirst({
      where: {
        id: membershipId,
        organizationId,
        studentId,
      },
      select: studentMembershipSelect,
    });

    if (!membership) {
      throw new NotFoundException('Student membership not found');
    }

    return membership;
  }

  async createStudentMembership(params: {
    organizationId: string;
    branchId: string;
    studentId: string;
    billingPlanId: string;
    status: StudentMembershipStatus;
    startedAt: Date;
    nextBillingDate?: Date;
    freezeStartAt?: Date;
    freezeEndAt?: Date;
    discountType?: DiscountType;
    discountValue?: Prisma.Decimal;
    notes?: string;
  }): Promise<StudentMembershipRecord> {
    return this.prisma.$transaction(
      async (tx) => {
        await this.acquireStudentMembershipLock(tx, {
          organizationId: params.organizationId,
          branchId: params.branchId,
          studentId: params.studentId,
        });

        const existingMembership = await tx.studentMembership.findFirst({
          where: {
            organizationId: params.organizationId,
            branchId: params.branchId,
            studentId: params.studentId,
            status: {
              in: OPEN_MEMBERSHIP_STATUSES,
            },
          },
          select: {
            id: true,
          },
        });

        if (existingMembership) {
          throw new ConflictException(
            'Student already has an open membership for this branch',
          );
        }

        return tx.studentMembership.create({
          data: {
            organizationId: params.organizationId,
            branchId: params.branchId,
            studentId: params.studentId,
            billingPlanId: params.billingPlanId,
            status: params.status,
            startedAt: params.startedAt,
            nextBillingDate: params.nextBillingDate,
            freezeStartAt: params.freezeStartAt,
            freezeEndAt: params.freezeEndAt,
            discountType: params.discountType,
            discountValue: params.discountValue,
            notes: params.notes,
          },
          select: studentMembershipSelect,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async updateStudentMembership(params: {
    membershipId: string;
    billingPlanId?: string;
    status?: StudentMembershipStatus;
    startedAt?: Date;
    endedAt?: Date | null;
    nextBillingDate?: Date | null;
    freezeStartAt?: Date | null;
    freezeEndAt?: Date | null;
    discountType?: DiscountType | null;
    discountValue?: Prisma.Decimal | null;
    notes?: string;
  }): Promise<StudentMembershipRecord> {
    return this.prisma.studentMembership.update({
      where: {
        id: params.membershipId,
      },
      data: {
        billingPlanId: params.billingPlanId,
        status: params.status,
        startedAt: params.startedAt,
        endedAt: params.endedAt,
        nextBillingDate: params.nextBillingDate,
        freezeStartAt: params.freezeStartAt,
        freezeEndAt: params.freezeEndAt,
        discountType: params.discountType,
        discountValue: params.discountValue,
        notes: params.notes,
      },
      select: studentMembershipSelect,
    });
  }

  async createBillingCharge(params: {
    organizationId: string;
    branchId: string;
    studentId: string;
    studentMembershipId?: string;
    billingPlanId?: string;
    chargeType: BillingChargeType;
    periodStart?: Date;
    periodEnd?: Date;
    dueDate: Date;
    amount: Prisma.Decimal;
    currency: string;
    description?: string;
    externalProvider?: string;
    externalReference?: string;
  }) {
    return this.prisma.billingCharge.create({
      data: {
        organizationId: params.organizationId,
        branchId: params.branchId,
        studentId: params.studentId,
        studentMembershipId: params.studentMembershipId,
        billingPlanId: params.billingPlanId,
        chargeType: params.chargeType,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        dueDate: params.dueDate,
        amount: params.amount,
        currency: params.currency,
        description: params.description,
        externalProvider: params.externalProvider,
        externalReference: params.externalReference,
      },
      select: billingChargeSelect,
    });
  }

  async listStudentBillingCharges(params: {
    organizationId: string;
    branchId: string;
    studentId: string;
    billingPlanId?: string;
    chargeType?: BillingChargeType;
    status?: BillingChargeStatus;
    currency?: string;
    dateFrom?: string;
    dateTo?: string;
    skip: number;
    take: number;
    graceDays: number;
  }) {
    const where = {
      organizationId: params.organizationId,
      branchId: params.branchId,
      studentId: params.studentId,
      billingPlanId: params.billingPlanId,
      chargeType: params.chargeType,
      currency: params.currency,
      deletedAt: null,
      dueDate:
        params.dateFrom || params.dateTo
          ? {
              gte: params.dateFrom
                ? toStartOfUtcDay(params.dateFrom)
                : undefined,
              lte: params.dateTo ? toEndOfUtcDay(params.dateTo) : undefined,
            }
          : undefined,
      AND: params.status
        ? buildChargeStatusWhere(params.status, params.graceDays)
        : undefined,
    } satisfies Prisma.BillingChargeWhereInput;

    const [items, total] = await Promise.all([
      this.prisma.billingCharge.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        select: billingChargeSelect,
      }),
      this.prisma.billingCharge.count({ where }),
    ]);

    return {
      items: items.map((charge) => mapChargeRecord(charge, params.graceDays)),
      total,
    };
  }

  async listBranchBillingCharges(params: {
    organizationId: string;
    branchId: string;
    studentId?: string;
    billingPlanId?: string;
    chargeType?: BillingChargeType;
    status?: BillingChargeStatus;
    currency?: string;
    dateFrom?: string;
    dateTo?: string;
    skip: number;
    take: number;
    graceDays: number;
  }) {
    const where = {
      organizationId: params.organizationId,
      branchId: params.branchId,
      studentId: params.studentId,
      billingPlanId: params.billingPlanId,
      chargeType: params.chargeType,
      currency: params.currency,
      deletedAt: null,
      dueDate:
        params.dateFrom || params.dateTo
          ? {
              gte: params.dateFrom
                ? toStartOfUtcDay(params.dateFrom)
                : undefined,
              lte: params.dateTo ? toEndOfUtcDay(params.dateTo) : undefined,
            }
          : undefined,
      AND: params.status
        ? buildChargeStatusWhere(params.status, params.graceDays)
        : undefined,
    } satisfies Prisma.BillingChargeWhereInput;

    const [items, total] = await Promise.all([
      this.prisma.billingCharge.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        select: billingChargeSelect,
      }),
      this.prisma.billingCharge.count({ where }),
    ]);

    return {
      items: items.map((charge) => mapChargeRecord(charge, params.graceDays)),
      total,
    };
  }

  async getBillingChargePaymentTarget(
    organizationId: string,
    chargeId: string,
  ) {
    const charge = await this.prisma.billingCharge.findFirst({
      where: {
        id: chargeId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        branchId: true,
        studentId: true,
        currency: true,
        amount: true,
        amountPaid: true,
        status: true,
      },
    });

    if (!charge) {
      throw new NotFoundException('Billing charge not found');
    }

    return charge;
  }

  async getBillingChargeMercadoPagoPreferenceTarget(
    organizationId: string,
    chargeId: string,
  ): Promise<BillingChargeMercadoPagoPreferenceTarget> {
    const charge = await this.prisma.billingCharge.findFirst({
      where: {
        id: chargeId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        branchId: true,
        studentId: true,
        amount: true,
        amountPaid: true,
        currency: true,
        status: true,
        chargeType: true,
        description: true,
        externalProvider: true,
        externalReference: true,
      },
    });

    if (!charge) {
      throw new NotFoundException('Billing charge not found');
    }

    return charge;
  }

  async attachMercadoPagoPreferenceToBillingCharge(params: {
    organizationId: string;
    chargeId: string;
    externalProvider: string;
    externalReference: string;
  }) {
    await this.prisma.billingCharge.updateMany({
      where: {
        id: params.chargeId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      data: {
        externalProvider: params.externalProvider,
        externalReference: params.externalReference,
      },
    });

    const charge = await this.prisma.billingCharge.findFirst({
      where: {
        id: params.chargeId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: billingChargeSelect,
    });

    if (!charge) {
      throw new NotFoundException('Billing charge not found');
    }

    return charge;
  }

  async getBillingChargeExternalPaymentObservationTarget(
    organizationId: string,
    chargeId: string,
  ): Promise<BillingChargeExternalPaymentObservationTarget> {
    const charge = await this.prisma.billingCharge.findFirst({
      where: {
        id: chargeId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        branchId: true,
        studentId: true,
        amount: true,
        amountPaid: true,
        currency: true,
        status: true,
        description: true,
        externalProvider: true,
        externalReference: true,
        lastExternalPaymentReference: true,
        lastExternalPaymentStatus: true,
        lastExternalPaymentStatusDetail: true,
        lastExternalPaymentObservedAt: true,
      },
    });

    if (!charge) {
      throw new NotFoundException('Billing charge not found');
    }

    return charge;
  }

  async reconcileMercadoPagoPayment(params: {
    organizationId: string;
    chargeId: string;
    paymentReference: string;
    paymentStatus: PaymentStatus;
    paymentAmount: Prisma.Decimal;
    currency: string;
    description?: string;
    externalPaymentStatus?: string;
    externalPaymentStatusDetail?: string;
    observedAt: Date;
    recordedAt: Date;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.acquireChargePaymentLock(tx, {
          organizationId: params.organizationId,
          chargeId: params.chargeId,
        });

        const charge = await tx.billingCharge.findFirst({
          where: {
            id: params.chargeId,
            organizationId: params.organizationId,
            deletedAt: null,
          },
          select: {
            id: true,
            organizationId: true,
            branchId: true,
            studentId: true,
            amount: true,
            amountPaid: true,
            currency: true,
            status: true,
            lastExternalPaymentReference: true,
            lastExternalPaymentStatus: true,
            lastExternalPaymentStatusDetail: true,
            lastExternalPaymentObservedAt: true,
          },
        });

        if (!charge) {
          throw new NotFoundException('Billing charge not found');
        }

        if (charge.currency !== params.currency) {
          throw new ConflictException(
            'Mercado Pago payment currency must match the linked billing charge currency',
          );
        }

        const existingPaymentRecords = await tx.paymentRecord.findMany({
          where: {
            organizationId: params.organizationId,
            branchId: charge.branchId,
            paymentKind: PaymentKind.STUDENT_PAYMENT,
            billingChargeId: charge.id,
            method: PaymentMethod.MERCADO_PAGO,
            externalProvider: 'MERCADO_PAGO',
            externalReference: params.paymentReference,
            deletedAt: null,
          },
          take: 2,
          orderBy: [{ createdAt: 'desc' }],
          select: paymentRecordSelect,
        });

        if (existingPaymentRecords.length > 1) {
          throw new ConflictException(
            'Multiple Mercado Pago payment records exist for the same external payment',
          );
        }

        const existingPaymentRecord = existingPaymentRecords[0] ?? null;
        const previousApprovedAmount =
          existingPaymentRecord?.status === PaymentStatus.APPROVED
            ? existingPaymentRecord.grossAmount
            : zeroDecimal();
        const nextApprovedAmount =
          params.paymentStatus === PaymentStatus.APPROVED
            ? params.paymentAmount
            : zeroDecimal();
        const approvedAmountDelta =
          nextApprovedAmount.minus(previousApprovedAmount);

        if (approvedAmountDelta.isNegative()) {
          throw new ConflictException(
            'Mercado Pago payment state regression is not supported yet',
          );
        }

        if (
          approvedAmountDelta.greaterThan(0) &&
          (charge.status === BillingChargeStatus.CANCELED ||
            charge.status === BillingChargeStatus.VOID)
        ) {
          throw new ConflictException(
            'Canceled or void charges cannot be reconciled against Mercado Pago payments',
          );
        }

        if (
          approvedAmountDelta.greaterThan(0) &&
          charge.amountPaid.greaterThanOrEqualTo(charge.amount)
        ) {
          throw new ConflictException(
            'Billing charge is already fully paid before Mercado Pago reconciliation',
          );
        }

        const updatedChargeAmountPaid =
          charge.amountPaid.plus(approvedAmountDelta);

        if (updatedChargeAmountPaid.greaterThan(charge.amount)) {
          throw new ConflictException(
            'Mercado Pago payment amount exceeds the outstanding billing charge balance',
          );
        }

        let paymentRecord: PaymentRecordRecord;
        let paymentRecordAction: 'created' | 'updated';

        if (existingPaymentRecord) {
          paymentRecord = await tx.paymentRecord.update({
            where: {
              id: existingPaymentRecord.id,
            },
            data: {
              grossAmount: params.paymentAmount,
              netAmount: params.paymentAmount,
              currency: params.currency,
              method: PaymentMethod.MERCADO_PAGO,
              status: params.paymentStatus,
              description: params.description,
              externalProvider: 'MERCADO_PAGO',
              externalReference: params.paymentReference,
              recordedAt: params.recordedAt,
            },
            select: paymentRecordSelect,
          });
          paymentRecordAction = 'updated';
        } else {
          paymentRecord = await tx.paymentRecord.create({
            data: {
              organizationId: params.organizationId,
              branchId: charge.branchId,
              paymentKind: PaymentKind.STUDENT_PAYMENT,
              studentId: charge.studentId,
              billingChargeId: charge.id,
              grossAmount: params.paymentAmount,
              netAmount: params.paymentAmount,
              currency: params.currency,
              method: PaymentMethod.MERCADO_PAGO,
              status: params.paymentStatus,
              description: params.description,
              externalProvider: 'MERCADO_PAGO',
              externalReference: params.paymentReference,
              recordedAt: params.recordedAt,
            },
            select: paymentRecordSelect,
          });
          paymentRecordAction = 'created';
        }

        const updatedChargeStatus =
          params.paymentStatus === PaymentStatus.APPROVED
            ? updatedChargeAmountPaid.greaterThanOrEqualTo(charge.amount)
              ? BillingChargeStatus.PAID
              : BillingChargeStatus.PARTIALLY_PAID
            : charge.status;

        const syncedCharge = await tx.billingCharge.update({
          where: {
            id: charge.id,
          },
          data: {
            amountPaid: updatedChargeAmountPaid,
            status: updatedChargeStatus,
            lastExternalPaymentReference: params.paymentReference,
            lastExternalPaymentStatus: params.externalPaymentStatus,
            lastExternalPaymentStatusDetail: params.externalPaymentStatusDetail,
            lastExternalPaymentObservedAt: params.observedAt,
          },
          select: {
            id: true,
            amountPaid: true,
            status: true,
            lastExternalPaymentReference: true,
            lastExternalPaymentStatus: true,
            lastExternalPaymentStatusDetail: true,
            lastExternalPaymentObservedAt: true,
          },
        });

        return {
          paymentRecord,
          paymentRecordAction,
          charge: syncedCharge,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async markMercadoPagoPaymentObserved(params: {
    organizationId: string;
    chargeId: string;
    paymentReference: string;
    paymentStatus?: string;
    paymentStatusDetail?: string;
    observedAt: Date;
  }) {
    await this.prisma.billingCharge.updateMany({
      where: {
        id: params.chargeId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      data: {
        lastExternalPaymentReference: params.paymentReference,
        lastExternalPaymentStatus: params.paymentStatus,
        lastExternalPaymentStatusDetail: params.paymentStatusDetail,
        lastExternalPaymentObservedAt: params.observedAt,
      },
    });

    const charge = await this.prisma.billingCharge.findFirst({
      where: {
        id: params.chargeId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: billingChargeSelect,
    });

    if (!charge) {
      throw new NotFoundException('Billing charge not found');
    }

    return charge;
  }

  async recordStudentPayment(params: {
    organizationId: string;
    branchId: string;
    studentId: string;
    billingChargeId?: string;
    grossAmount: Prisma.Decimal;
    netAmount: Prisma.Decimal;
    currency: string;
    method: PaymentMethod;
    status: PaymentStatus;
    description?: string;
    externalProvider?: string;
    externalReference?: string;
    recordedByMembershipId?: string | null;
    recordedAt: Date;
    notes?: string;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        let charge: {
          id: string;
          branchId: string;
          studentId: string;
          currency: string;
          amount: Prisma.Decimal;
          amountPaid: Prisma.Decimal;
          status: BillingChargeStatus;
        } | null = null;

        if (params.billingChargeId) {
          await this.acquireChargePaymentLock(tx, {
            organizationId: params.organizationId,
            chargeId: params.billingChargeId,
          });

          charge = await tx.billingCharge.findFirst({
            where: {
              id: params.billingChargeId,
              organizationId: params.organizationId,
              deletedAt: null,
            },
            select: {
              id: true,
              branchId: true,
              studentId: true,
              currency: true,
              amount: true,
              amountPaid: true,
              status: true,
            },
          });

          if (!charge) {
            throw new NotFoundException('Billing charge not found');
          }

          if (
            charge.studentId !== params.studentId ||
            charge.branchId !== params.branchId
          ) {
            throw new ConflictException(
              'Billing charge does not belong to the same student billing context',
            );
          }

          if (charge.currency !== params.currency) {
            throw new ConflictException(
              'Payment currency must match the linked billing charge currency',
            );
          }

          if (
            charge.status === BillingChargeStatus.PAID ||
            charge.amountPaid.greaterThanOrEqualTo(charge.amount)
          ) {
            throw new ConflictException('Billing charge is already fully paid');
          }

          if (
            charge.status === BillingChargeStatus.CANCELED ||
            charge.status === BillingChargeStatus.VOID
          ) {
            throw new ConflictException(
              'Canceled or void charges cannot receive payments',
            );
          }
        }

        const payment = await tx.paymentRecord.create({
          data: {
            organizationId: params.organizationId,
            branchId: params.branchId,
            paymentKind: PaymentKind.STUDENT_PAYMENT,
            studentId: params.studentId,
            billingChargeId: params.billingChargeId,
            grossAmount: params.grossAmount,
            netAmount: params.netAmount,
            currency: params.currency,
            method: params.method,
            status: params.status,
            description: params.description,
            externalProvider: params.externalProvider,
            externalReference: params.externalReference,
            recordedByMembershipId: params.recordedByMembershipId,
            recordedAt: params.recordedAt,
            notes: params.notes,
          },
          select: paymentRecordSelect,
        });

        if (charge && params.status === PaymentStatus.APPROVED) {
          const updatedAmountPaid = charge.amountPaid.plus(params.grossAmount);
          const nextStatus = updatedAmountPaid.greaterThanOrEqualTo(
            charge.amount,
          )
            ? BillingChargeStatus.PAID
            : BillingChargeStatus.PARTIALLY_PAID;

          await tx.billingCharge.update({
            where: {
              id: params.billingChargeId,
            },
            data: {
              amountPaid: updatedAmountPaid,
              status: nextStatus,
            },
          });
        }

        return payment;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async recordGeneralIncome(params: {
    organizationId: string;
    branchId: string;
    grossAmount: Prisma.Decimal;
    netAmount: Prisma.Decimal;
    currency: string;
    method: PaymentMethod;
    status: PaymentStatus;
    description?: string;
    externalProvider?: string;
    externalReference?: string;
    recordedByMembershipId?: string | null;
    recordedAt: Date;
    notes?: string;
  }) {
    return this.prisma.paymentRecord.create({
      data: {
        organizationId: params.organizationId,
        branchId: params.branchId,
        paymentKind: PaymentKind.GENERAL_INCOME,
        grossAmount: params.grossAmount,
        netAmount: params.netAmount,
        currency: params.currency,
        method: params.method,
        status: params.status,
        description: params.description,
        externalProvider: params.externalProvider,
        externalReference: params.externalReference,
        recordedByMembershipId: params.recordedByMembershipId,
        recordedAt: params.recordedAt,
        notes: params.notes,
      },
      select: paymentRecordSelect,
    });
  }

  async listStudentPayments(params: {
    organizationId: string;
    branchId: string;
    studentId: string;
    method?: PaymentMethod;
    status?: PaymentStatus;
    currency?: string;
    dateFrom?: string;
    dateTo?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: params.organizationId,
      branchId: params.branchId,
      studentId: params.studentId,
      paymentKind: PaymentKind.STUDENT_PAYMENT,
      method: params.method,
      status: params.status,
      currency: params.currency,
      deletedAt: null,
      recordedAt:
        params.dateFrom || params.dateTo
          ? {
              gte: params.dateFrom
                ? toStartOfUtcDay(params.dateFrom)
                : undefined,
              lte: params.dateTo ? toEndOfUtcDay(params.dateTo) : undefined,
            }
          : undefined,
    } satisfies Prisma.PaymentRecordWhereInput;

    const [items, total] = await Promise.all([
      this.prisma.paymentRecord.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
        select: paymentRecordSelect,
      }),
      this.prisma.paymentRecord.count({ where }),
    ]);

    return { items, total };
  }

  async listBranchPayments(params: {
    organizationId: string;
    branchId: string;
    studentId?: string;
    method?: PaymentMethod;
    status?: PaymentStatus;
    paymentKind?: PaymentKind;
    currency?: string;
    dateFrom?: string;
    dateTo?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: params.organizationId,
      branchId: params.branchId,
      studentId: params.studentId,
      method: params.method,
      status: params.status,
      paymentKind: params.paymentKind,
      currency: params.currency,
      deletedAt: null,
      recordedAt:
        params.dateFrom || params.dateTo
          ? {
              gte: params.dateFrom
                ? toStartOfUtcDay(params.dateFrom)
                : undefined,
              lte: params.dateTo ? toEndOfUtcDay(params.dateTo) : undefined,
            }
          : undefined,
    } satisfies Prisma.PaymentRecordWhereInput;

    const [items, total] = await Promise.all([
      this.prisma.paymentRecord.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
        select: paymentRecordSelect,
      }),
      this.prisma.paymentRecord.count({ where }),
    ]);

    return { items, total };
  }

  async getOrCreateBillingPolicy(organizationId: string, branchId: string) {
    return this.prisma.billingPolicy.upsert({
      where: {
        branchId,
      },
      update: {},
      create: {
        organizationId,
        branchId,
      },
      select: billingPolicySelect,
    });
  }

  async updateBillingPolicy(params: {
    branchId: string;
    graceDays?: number;
    restrictAttendanceWhenOverdue?: boolean;
    restrictAppUsageWhenOverdue?: boolean;
    allowFreeze?: boolean;
    maxFreezeDaysPerYear?: number | null;
    allowManualDiscounts?: boolean;
    allowPartialPayments?: boolean;
  }) {
    return this.prisma.billingPolicy.update({
      where: {
        branchId: params.branchId,
      },
      data: {
        graceDays: params.graceDays,
        restrictAttendanceWhenOverdue: params.restrictAttendanceWhenOverdue,
        restrictAppUsageWhenOverdue: params.restrictAppUsageWhenOverdue,
        allowFreeze: params.allowFreeze,
        maxFreezeDaysPerYear: params.maxFreezeDaysPerYear,
        allowManualDiscounts: params.allowManualDiscounts,
        allowPartialPayments: params.allowPartialPayments,
      },
      select: billingPolicySelect,
    });
  }

  async getStudentBillingContextData(params: {
    organizationId: string;
    branchId: string;
    studentId: string;
    graceDays: number;
    recentPaymentsSince: Date;
  }) {
    const [membership, charges, recentPayments] = await Promise.all([
      this.getStudentCurrentMembership(
        params.organizationId,
        params.studentId,
        params.branchId,
      ),
      this.prisma.billingCharge.findMany({
        where: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          studentId: params.studentId,
          deletedAt: null,
          status: {
            notIn: [BillingChargeStatus.CANCELED, BillingChargeStatus.VOID],
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        select: billingChargeSelect,
      }),
      this.prisma.paymentRecord.aggregate({
        where: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          studentId: params.studentId,
          paymentKind: PaymentKind.STUDENT_PAYMENT,
          status: PaymentStatus.APPROVED,
          deletedAt: null,
          recordedAt: {
            gte: params.recentPaymentsSince,
          },
        },
        _sum: {
          grossAmount: true,
        },
      }),
    ]);

    return {
      membership,
      charges: charges.map((charge) =>
        mapChargeRecord(charge, params.graceDays),
      ),
      recentApprovedPaymentsTotal:
        recentPayments._sum.grossAmount ?? new Prisma.Decimal(0),
    };
  }

  async getBranchStudentFinancialStatusData(params: {
    organizationId: string;
    branchId: string;
    graceDays: number;
  }) {
    const [memberships, charges] = await Promise.all([
      this.prisma.studentMembership.findMany({
        where: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          status: {
            in: OPEN_MEMBERSHIP_STATUSES,
          },
        },
        select: branchStudentFinancialMembershipSelect,
      }),
      this.prisma.billingCharge.findMany({
        where: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          deletedAt: null,
          status: {
            notIn: [
              BillingChargeStatus.CANCELED,
              BillingChargeStatus.VOID,
              BillingChargeStatus.PAID,
            ],
          },
        },
        select: branchStudentFinancialChargeSelect,
      }),
    ]);

    return {
      memberships,
      charges: charges
        .map((charge) => mapChargeRecord(charge, params.graceDays))
        .filter((charge) => charge.outstandingAmount.greaterThan(0)),
    };
  }

  async getBranchStudentFinancialStatusDataForStudents(params: {
    organizationId: string;
    branchId: string;
    studentIds: string[];
    graceDays: number;
  }) {
    if (!params.studentIds.length) {
      return {
        memberships: [],
        charges: [],
      };
    }

    const studentIdFilter = {
      in: params.studentIds,
    } satisfies Prisma.StringFilter;

    const [memberships, charges] = await Promise.all([
      this.prisma.studentMembership.findMany({
        where: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          studentId: studentIdFilter,
          status: {
            in: OPEN_MEMBERSHIP_STATUSES,
          },
        },
        select: branchStudentFinancialMembershipSelect,
      }),
      this.prisma.billingCharge.findMany({
        where: {
          organizationId: params.organizationId,
          branchId: params.branchId,
          studentId: studentIdFilter,
          deletedAt: null,
          status: {
            notIn: [
              BillingChargeStatus.CANCELED,
              BillingChargeStatus.VOID,
              BillingChargeStatus.PAID,
            ],
          },
        },
        select: branchStudentFinancialChargeSelect,
      }),
    ]);

    return {
      memberships,
      charges: charges
        .map((charge) => mapChargeRecord(charge, params.graceDays))
        .filter((charge) => charge.outstandingAmount.greaterThan(0)),
    };
  }

  async listPaymentsForDuplicateReview(params: {
    organizationId: string;
    branchId: string;
    studentId?: string;
    method?: PaymentMethod;
    status?: PaymentStatus;
    paymentKind?: PaymentKind;
    currency?: string;
    dateFrom?: string;
    dateTo?: string;
    take: number;
  }) {
    return this.prisma.paymentRecord.findMany({
      where: {
        organizationId: params.organizationId,
        branchId: params.branchId,
        studentId: params.studentId,
        method: params.method,
        status: params.status,
        paymentKind: params.paymentKind,
        currency: params.currency,
        deletedAt: null,
        recordedAt:
          params.dateFrom || params.dateTo
            ? {
                gte: params.dateFrom
                  ? toStartOfUtcDay(params.dateFrom)
                  : undefined,
                lte: params.dateTo ? toEndOfUtcDay(params.dateTo) : undefined,
              }
            : undefined,
      },
      take: params.take,
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        paymentKind: true,
        studentId: true,
        grossAmount: true,
        currency: true,
        method: true,
        status: true,
        externalProvider: true,
        externalReference: true,
        recordedAt: true,
        description: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getBranchBillingSummaryData(params: {
    organizationId: string;
    branchId: string;
    dateFrom: string;
    dateTo: string;
    currency?: string;
    graceDays: number;
  }) {
    const chargeWhere = {
      organizationId: params.organizationId,
      branchId: params.branchId,
      currency: params.currency,
      deletedAt: null,
      dueDate: {
        gte: toStartOfUtcDay(params.dateFrom),
        lte: toEndOfUtcDay(params.dateTo),
      },
    } satisfies Prisma.BillingChargeWhereInput;

    const paymentWhere = {
      organizationId: params.organizationId,
      branchId: params.branchId,
      currency: params.currency,
      deletedAt: null,
      recordedAt: {
        gte: toStartOfUtcDay(params.dateFrom),
        lte: toEndOfUtcDay(params.dateTo),
      },
    } satisfies Prisma.PaymentRecordWhereInput;

    const overdueCutoff = getOverdueCutoff(params.graceDays);

    const [
      approvedPaymentTotals,
      approvedPaymentsCount,
      pendingPaymentsCount,
      pendingChargesCount,
      overdueChargesCount,
      paidChargesCount,
    ] = await Promise.all([
      this.prisma.paymentRecord.aggregate({
        where: {
          ...paymentWhere,
          status: PaymentStatus.APPROVED,
        },
        _sum: {
          grossAmount: true,
          netAmount: true,
        },
      }),
      this.prisma.paymentRecord.count({
        where: {
          ...paymentWhere,
          status: PaymentStatus.APPROVED,
        },
      }),
      this.prisma.paymentRecord.count({
        where: {
          ...paymentWhere,
          status: PaymentStatus.PENDING,
        },
      }),
      this.prisma.billingCharge.count({
        where: {
          ...chargeWhere,
          status: {
            in: OPEN_CHARGE_STATUSES,
          },
          dueDate: {
            gte: overdueCutoff,
            lte: toEndOfUtcDay(params.dateTo),
          },
        },
      }),
      this.prisma.billingCharge.count({
        where: {
          ...chargeWhere,
          OR: [
            {
              status: BillingChargeStatus.OVERDUE,
            },
            {
              status: {
                in: OPEN_CHARGE_STATUSES,
              },
              dueDate: {
                lt: overdueCutoff,
              },
            },
          ],
        },
      }),
      this.prisma.billingCharge.count({
        where: {
          ...chargeWhere,
          status: BillingChargeStatus.PAID,
        },
      }),
    ]);

    return {
      grossTotal:
        approvedPaymentTotals._sum.grossAmount ?? new Prisma.Decimal(0),
      netTotal: approvedPaymentTotals._sum.netAmount ?? new Prisma.Decimal(0),
      approvedPaymentsCount,
      pendingPaymentsCount,
      pendingChargesCount,
      overdueChargesCount,
      paidChargesCount,
    };
  }

  private async acquireStudentMembershipLock(
    tx: TxClient,
    params: {
      organizationId: string;
      branchId: string;
      studentId: string;
    },
  ) {
    const lockKey = `org:${params.organizationId}:branch:${params.branchId}:student:${params.studentId}:billing-membership`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${BILLING_MEMBERSHIP_LOCK_NAMESPACE}, hashtext(${lockKey}))`;
  }

  private async acquireChargePaymentLock(
    tx: TxClient,
    params: {
      organizationId: string;
      chargeId: string;
    },
  ) {
    const lockKey = `org:${params.organizationId}:charge:${params.chargeId}:billing-payment`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${BILLING_CHARGE_PAYMENT_LOCK_NAMESPACE}, hashtext(${lockKey}))`;
  }
}
