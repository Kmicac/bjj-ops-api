import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AccessControlService } from '../../auth/access-control.service';
import {
  BillingChargeStatus,
  MembershipRole,
  MembershipScopeType,
  StudentMembershipStatus,
} from '../../generated/prisma/enums';
import { BillingPolicy } from './billing.policy';

function buildPrincipal(params?: {
  membershipId?: string;
  assignedRoles?: MembershipRole[];
  branchIds?: string[];
  primaryBranchId?: string | null;
}) {
  return {
    sub: 'user_1',
    organizationSlug: 'org-1',
    organizationId: 'org_1',
    membershipId: params?.membershipId ?? 'membership_1',
    assignedRoles: params?.assignedRoles ?? [MembershipRole.ACADEMY_MANAGER],
    scopeType: MembershipScopeType.SELECTED_BRANCHES,
    branchIds: params?.branchIds ?? ['branch_1'],
    primaryBranchId: params?.primaryBranchId ?? 'branch_1',
    email: 'manager@example.com',
    type: 'access' as const,
  };
}

function buildCharge(params: {
  dueDate: string;
  effectiveStatus: BillingChargeStatus;
  outstandingAmount: number;
}) {
  return {
    dueDate: new Date(params.dueDate),
    effectiveStatus: params.effectiveStatus,
    outstandingAmount: new Prisma.Decimal(params.outstandingAmount),
  };
}

describe('BillingPolicy', () => {
  let policy: BillingPolicy;

  beforeEach(() => {
    policy = new BillingPolicy(new AccessControlService());
  });

  it('allows local branch managers to manage billing', () => {
    expect(() =>
      policy.ensureCanManageBranchBilling(buildPrincipal(), 'org_1', {
        id: 'branch_1',
        organizationId: 'org_1',
        headCoachMembershipId: null,
      }),
    ).not.toThrow();
  });

  it('denies org-wide finance access when the principal has no local branch relation', () => {
    expect(() =>
      policy.ensureCanManageBranchBilling(
        buildPrincipal({
          assignedRoles: [MembershipRole.ORG_ADMIN],
          branchIds: ['branch_2'],
          primaryBranchId: 'branch_2',
        }),
        'org_1',
        {
          id: 'branch_1',
          organizationId: 'org_1',
          headCoachMembershipId: null,
        },
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows local staff to operate student billing without granting branch-wide manager access', () => {
    expect(() =>
      policy.ensureCanOperateStudentBilling(
        buildPrincipal({
          assignedRoles: [MembershipRole.STAFF],
        }),
        'org_1',
        {
          id: 'branch_1',
          organizationId: 'org_1',
          headCoachMembershipId: null,
        },
      ),
    ).not.toThrow();
  });

  it('derives CURRENT when there are no outstanding branch-local charges', () => {
    expect(
      policy.deriveStudentFinancialState({
        membershipStatus: StudentMembershipStatus.ACTIVE,
        charges: [],
        graceDays: 3,
        restrictAttendanceWhenOverdue: true,
        restrictAppUsageWhenOverdue: true,
        now: new Date('2026-03-23T12:00:00.000Z'),
      }),
    ).toMatchObject({
      financialStatus: 'CURRENT',
      daysOverdue: 0,
      hasOverdueCharges: false,
      hasPendingCharges: false,
      activeRestrictionFlags: {
        attendanceRestricted: false,
        appUsageRestricted: false,
      },
    });
  });

  it('derives DUE_SOON for open charges inside the operational window', () => {
    expect(
      policy.deriveStudentFinancialState({
        membershipStatus: StudentMembershipStatus.ACTIVE,
        charges: [
          buildCharge({
            dueDate: '2026-03-25T00:00:00.000Z',
            effectiveStatus: BillingChargeStatus.PENDING,
            outstandingAmount: 100,
          }),
        ],
        graceDays: 3,
        restrictAttendanceWhenOverdue: true,
        restrictAppUsageWhenOverdue: false,
        now: new Date('2026-03-23T12:00:00.000Z'),
      }),
    ).toMatchObject({
      financialStatus: 'DUE_SOON',
      daysOverdue: 0,
      hasOverdueCharges: false,
      hasPendingCharges: true,
    });
  });

  it('respects grace days before moving a charge into OVERDUE', () => {
    expect(
      policy.deriveStudentFinancialState({
        membershipStatus: StudentMembershipStatus.ACTIVE,
        charges: [
          buildCharge({
            dueDate: '2026-03-17T00:00:00.000Z',
            effectiveStatus: BillingChargeStatus.OVERDUE,
            outstandingAmount: 100,
          }),
        ],
        graceDays: 5,
        restrictAttendanceWhenOverdue: false,
        restrictAppUsageWhenOverdue: false,
        now: new Date('2026-03-23T12:00:00.000Z'),
      }),
    ).toMatchObject({
      financialStatus: 'OVERDUE',
      daysOverdue: 1,
      hasOverdueCharges: true,
      hasPendingCharges: false,
    });
  });

  it('derives RESTRICTED when overdue charges activate branch billing restrictions', () => {
    expect(
      policy.deriveStudentFinancialState({
        membershipStatus: StudentMembershipStatus.ACTIVE,
        charges: [
          buildCharge({
            dueDate: '2026-03-10T00:00:00.000Z',
            effectiveStatus: BillingChargeStatus.OVERDUE,
            outstandingAmount: 100,
          }),
        ],
        graceDays: 3,
        restrictAttendanceWhenOverdue: true,
        restrictAppUsageWhenOverdue: false,
        now: new Date('2026-03-23T12:00:00.000Z'),
      }),
    ).toMatchObject({
      financialStatus: 'RESTRICTED',
      hasOverdueCharges: true,
      activeRestrictionFlags: {
        attendanceRestricted: true,
        appUsageRestricted: false,
      },
    });
  });

  it('derives FROZEN when the membership is frozen and there is no overdue state taking precedence', () => {
    expect(
      policy.deriveStudentFinancialState({
        membershipStatus: StudentMembershipStatus.FROZEN,
        charges: [
          buildCharge({
            dueDate: '2026-04-10T00:00:00.000Z',
            effectiveStatus: BillingChargeStatus.PENDING,
            outstandingAmount: 50,
          }),
        ],
        graceDays: 3,
        restrictAttendanceWhenOverdue: true,
        restrictAppUsageWhenOverdue: true,
        now: new Date('2026-03-23T12:00:00.000Z'),
      }),
    ).toMatchObject({
      financialStatus: 'FROZEN',
      hasOverdueCharges: false,
      hasPendingCharges: true,
      activeRestrictionFlags: {
        attendanceRestricted: false,
        appUsageRestricted: false,
      },
    });
  });

  it('keeps overdue precedence over FROZEN when the student still has overdue debt', () => {
    expect(
      policy.deriveStudentFinancialState({
        membershipStatus: StudentMembershipStatus.FROZEN,
        charges: [
          buildCharge({
            dueDate: '2026-03-10T00:00:00.000Z',
            effectiveStatus: BillingChargeStatus.OVERDUE,
            outstandingAmount: 50,
          }),
        ],
        graceDays: 3,
        restrictAttendanceWhenOverdue: false,
        restrictAppUsageWhenOverdue: false,
        now: new Date('2026-03-23T12:00:00.000Z'),
      }),
    ).toMatchObject({
      financialStatus: 'OVERDUE',
      hasOverdueCharges: true,
    });
  });
});
