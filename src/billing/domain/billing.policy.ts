import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AccessControlService } from '../../auth/access-control.service';
import type { AuthenticatedPrincipal } from '../../auth/authenticated-principal.interface';
import {
  BillingChargeStatus,
  DiscountType,
  IntegrationProvider,
  MembershipRole,
  PaymentStatus,
  StudentMembershipStatus,
} from '../../generated/prisma/enums';
import {
  BILLING_DUE_SOON_WINDOW_DAYS,
  type ActiveBillingRestrictionFlags,
  type StudentFinancialStatus,
} from './student-financial-status';

type BranchAccessTarget = {
  id: string;
  organizationId: string;
  headCoachMembershipId: string | null;
};

type BillingPolicyState = {
  allowFreeze: boolean;
  maxFreezeDaysPerYear: number | null;
  allowManualDiscounts: boolean;
  allowPartialPayments: boolean;
};

type BillingPlanTarget = {
  branchId: string;
  isActive: boolean;
  amount: { toNumber(): number };
  currency: string;
};

type BillingChargePaymentTarget = {
  id: string;
  branchId: string;
  studentId: string;
  currency: string;
  amount: { toNumber(): number };
  amountPaid: { toNumber(): number };
  status: string;
};

type BillingChargeExternalPreferenceTarget = {
  status: BillingChargeStatus;
  amount: { toNumber(): number };
  amountPaid: { toNumber(): number };
  externalProvider: string | null;
  externalReference: string | null;
};

type DerivedFinancialCharge = {
  dueDate: Date;
  effectiveStatus: BillingChargeStatus;
  outstandingAmount: { greaterThan(value: number): boolean };
};

const BRANCH_MANAGER_ROLES = new Set<MembershipRole>([
  MembershipRole.MESTRE,
  MembershipRole.ORG_ADMIN,
  MembershipRole.ACADEMY_MANAGER,
]);

const BRANCH_OPERATOR_ROLES = new Set<MembershipRole>([
  ...BRANCH_MANAGER_ROLES,
  MembershipRole.STAFF,
]);

function toStartOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function addUtcDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function diffUtcCalendarDays(left: Date, right: Date) {
  return Math.floor(
    (toStartOfUtcDay(left).getTime() - toStartOfUtcDay(right).getTime()) /
      86400000,
  );
}

@Injectable()
export class BillingPolicy {
  constructor(private readonly accessControl: AccessControlService) {}

  ensureCanManageBranchBilling(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureBranchLocalFinanceAccess(
      principal,
      organizationId,
      branch,
      BRANCH_MANAGER_ROLES,
    );
  }

  ensureCanOperateStudentBilling(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureBranchLocalFinanceAccess(
      principal,
      organizationId,
      branch,
      BRANCH_OPERATOR_ROLES,
    );
  }

  ensurePlanAssignableToBranch(plan: BillingPlanTarget, branchId: string) {
    if (plan.branchId !== branchId) {
      throw new ConflictException(
        'Billing plan must belong to the same branch as the student billing context',
      );
    }

    if (!plan.isActive) {
      throw new ConflictException('Inactive billing plans cannot be assigned');
    }
  }

  ensureValidMembershipDates(params: {
    startedAt: Date;
    endedAt?: Date | null;
    nextBillingDate?: Date | null;
    freezeStartAt?: Date | null;
    freezeEndAt?: Date | null;
  }) {
    if (params.endedAt && params.endedAt < params.startedAt) {
      throw new ConflictException('endedAt must be on or after startedAt');
    }

    if (params.nextBillingDate && params.nextBillingDate < params.startedAt) {
      throw new ConflictException(
        'nextBillingDate must be on or after startedAt',
      );
    }

    if (params.freezeStartAt && params.freezeEndAt) {
      if (params.freezeEndAt < params.freezeStartAt) {
        throw new ConflictException(
          'freezeEndAt must be on or after freezeStartAt',
        );
      }
    }
  }

  ensureDiscountAllowed(
    policy: BillingPolicyState,
    plan: BillingPlanTarget,
    discountType?: DiscountType | null,
    discountValue?: number | null,
  ) {
    if (!discountType && discountValue === undefined) {
      return;
    }

    if (!policy.allowManualDiscounts) {
      throw new ConflictException(
        'Manual discounts are disabled for this branch billing policy',
      );
    }

    if (
      !discountType ||
      discountValue === undefined ||
      discountValue === null
    ) {
      throw new ConflictException(
        'discountType and discountValue must be provided together',
      );
    }

    if (discountType === DiscountType.PERCENTAGE && discountValue > 100) {
      throw new ConflictException('Percentage discounts cannot exceed 100');
    }

    if (
      discountType === DiscountType.FIXED &&
      discountValue > plan.amount.toNumber()
    ) {
      throw new ConflictException(
        'Fixed discounts cannot exceed the billing plan amount',
      );
    }
  }

  ensureFreezeAllowed(
    policy: BillingPolicyState,
    status: StudentMembershipStatus,
    freezeStartAt?: Date | null,
    freezeEndAt?: Date | null,
  ) {
    if (
      status !== StudentMembershipStatus.FROZEN &&
      !freezeStartAt &&
      !freezeEndAt
    ) {
      return;
    }

    if (!policy.allowFreeze) {
      throw new ConflictException(
        'Membership freeze is disabled for this branch',
      );
    }

    if (status === StudentMembershipStatus.FROZEN && !freezeStartAt) {
      throw new ConflictException(
        'freezeStartAt is required when membership status is FROZEN',
      );
    }

    if (
      freezeStartAt &&
      freezeEndAt &&
      policy.maxFreezeDaysPerYear !== null &&
      policy.maxFreezeDaysPerYear !== undefined
    ) {
      const freezeDays =
        Math.floor(
          (freezeEndAt.getTime() - freezeStartAt.getTime()) / 86400000,
        ) + 1;

      if (freezeDays > policy.maxFreezeDaysPerYear) {
        throw new ConflictException(
          'Freeze period exceeds branch billing policy limit',
        );
      }
    }
  }

  ensureChargeBelongsToStudent(
    charge: BillingChargePaymentTarget,
    studentId: string,
    branchId: string,
  ) {
    if (charge.studentId !== studentId || charge.branchId !== branchId) {
      throw new ConflictException(
        'Billing charge does not belong to the same student billing context',
      );
    }
  }

  ensureChargeCanReceivePayment(charge: BillingChargePaymentTarget) {
    if (charge.status === 'PAID') {
      throw new ConflictException('Billing charge is already fully paid');
    }

    if (charge.status === 'CANCELED' || charge.status === 'VOID') {
      throw new ConflictException(
        'Canceled or void charges cannot receive payments',
      );
    }
  }

  ensureValidPaymentAmounts(grossAmount: number, netAmount: number) {
    if (netAmount > grossAmount) {
      throw new ConflictException('netAmount cannot exceed grossAmount');
    }
  }

  ensureChargeCurrencyMatchesPayment(
    charge: BillingChargePaymentTarget,
    paymentCurrency: string,
  ) {
    if (charge.currency !== paymentCurrency) {
      throw new ConflictException(
        'Payment currency must match the linked billing charge currency',
      );
    }
  }

  ensurePartialPaymentAllowed(
    policy: BillingPolicyState,
    charge: BillingChargePaymentTarget,
    paymentStatus: PaymentStatus,
    grossAmount: number,
  ) {
    if (paymentStatus !== PaymentStatus.APPROVED) {
      return;
    }

    const outstandingAmount =
      charge.amount.toNumber() - charge.amountPaid.toNumber();

    if (grossAmount >= outstandingAmount) {
      return;
    }

    if (!policy.allowPartialPayments) {
      throw new ConflictException(
        'Partial payments are disabled for this branch billing policy',
      );
    }
  }

  ensureChargeEligibleForMercadoPagoPreference(
    charge: BillingChargeExternalPreferenceTarget,
  ) {
    if (
      charge.status === BillingChargeStatus.PAID ||
      charge.amountPaid.toNumber() >= charge.amount.toNumber()
    ) {
      throw new ConflictException('Billing charge is already fully paid');
    }

    if (
      charge.status === BillingChargeStatus.CANCELED ||
      charge.status === BillingChargeStatus.VOID
    ) {
      throw new ConflictException(
        'Canceled or void charges cannot generate payment preferences',
      );
    }

    if (
      charge.externalProvider &&
      charge.externalProvider !== IntegrationProvider.MERCADO_PAGO
    ) {
      throw new ConflictException(
        'Billing charge is already linked to another external payment provider',
      );
    }

    if (
      charge.amount.toNumber() - charge.amountPaid.toNumber() <= 0
    ) {
      throw new ConflictException(
        'Billing charge has no outstanding balance for a payment preference',
      );
    }
  }

  deriveStudentFinancialState(params: {
    membershipStatus?: StudentMembershipStatus | null;
    charges: DerivedFinancialCharge[];
    graceDays: number;
    restrictAttendanceWhenOverdue: boolean;
    restrictAppUsageWhenOverdue: boolean;
    now?: Date;
  }): {
    financialStatus: StudentFinancialStatus;
    daysOverdue: number;
    nextDueDate: Date | null;
    hasOverdueCharges: boolean;
    hasPendingCharges: boolean;
    activeRestrictionFlags: ActiveBillingRestrictionFlags;
  } {
    const now = params.now ?? new Date();
    const outstandingCharges = params.charges.filter((charge) =>
      charge.outstandingAmount.greaterThan(0),
    );
    const overdueCharges = outstandingCharges.filter(
      (charge) => charge.effectiveStatus === BillingChargeStatus.OVERDUE,
    );
    const pendingCharges = outstandingCharges.filter(
      (charge) =>
        charge.effectiveStatus === BillingChargeStatus.PENDING ||
        charge.effectiveStatus === BillingChargeStatus.PARTIALLY_PAID,
    );
    const nextDueDate =
      outstandingCharges.length > 0
        ? ([...outstandingCharges].sort(
            (left, right) => left.dueDate.getTime() - right.dueDate.getTime(),
          )[0]?.dueDate ?? null)
        : null;
    const activeRestrictionFlags = {
      attendanceRestricted:
        overdueCharges.length > 0 && params.restrictAttendanceWhenOverdue,
      appUsageRestricted:
        overdueCharges.length > 0 && params.restrictAppUsageWhenOverdue,
    } satisfies ActiveBillingRestrictionFlags;

    let financialStatus: StudentFinancialStatus = 'CURRENT';

    if (
      activeRestrictionFlags.attendanceRestricted ||
      activeRestrictionFlags.appUsageRestricted
    ) {
      financialStatus = 'RESTRICTED';
    } else if (overdueCharges.length > 0) {
      financialStatus = 'OVERDUE';
    } else if (params.membershipStatus === StudentMembershipStatus.FROZEN) {
      financialStatus = 'FROZEN';
    } else if (
      nextDueDate &&
      nextDueDate.getTime() <=
        addUtcDays(toStartOfUtcDay(now), BILLING_DUE_SOON_WINDOW_DAYS).getTime()
    ) {
      financialStatus = 'DUE_SOON';
    }

    return {
      financialStatus,
      daysOverdue:
        overdueCharges.length > 0
          ? Math.max(
              ...overdueCharges.map((charge) =>
                this.getChargeDaysOverdue(
                  charge.dueDate,
                  params.graceDays,
                  now,
                ),
              ),
            )
          : 0,
      nextDueDate,
      hasOverdueCharges: overdueCharges.length > 0,
      hasPendingCharges: pendingCharges.length > 0,
      activeRestrictionFlags,
    };
  }

  private ensureBranchLocalFinanceAccess(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
    allowedRoles: Set<MembershipRole>,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);

    const hasLocalBranchRelation =
      principal.primaryBranchId === branch.id ||
      principal.branchIds.includes(branch.id) ||
      branch.headCoachMembershipId === principal.membershipId;

    if (!hasLocalBranchRelation) {
      throw new ForbiddenException('Branch financial access denied');
    }

    if (!principal.assignedRoles.some((role) => allowedRoles.has(role))) {
      throw new ForbiddenException('Insufficient billing role');
    }
  }

  private getChargeDaysOverdue(dueDate: Date, graceDays: number, now: Date) {
    const overdueStartsAt = addUtcDays(toStartOfUtcDay(dueDate), graceDays);
    return Math.max(0, diffUtcCalendarDays(now, overdueStartsAt));
  }
}
