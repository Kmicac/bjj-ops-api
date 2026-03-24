import { Prisma } from '../../../generated/prisma/client';
import {
  BillingChargeStatus,
  MembershipRole,
  MembershipScopeType,
  StudentMembershipStatus,
} from '../../../generated/prisma/enums';
import { AccessControlService } from '../../../auth/access-control.service';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';
import { GetBranchBillingSummaryUseCase } from './get-branch-billing-summary.use-case';

function buildPrincipal() {
  return {
    sub: 'user_1',
    organizationSlug: 'org-1',
    organizationId: 'org_1',
    membershipId: 'membership_1',
    assignedRoles: [MembershipRole.ACADEMY_MANAGER],
    scopeType: MembershipScopeType.SELECTED_BRANCHES,
    branchIds: ['branch_1'],
    primaryBranchId: 'branch_1',
    email: 'manager@example.com',
    type: 'access' as const,
  };
}

describe('GetBranchBillingSummaryUseCase', () => {
  it('adds a current operational snapshot with student financial status counts', async () => {
    const billingRepository = {
      getBranchAccessTarget: jest.fn().mockResolvedValue({
        id: 'branch_1',
        organizationId: 'org_1',
        headCoachMembershipId: null,
      }),
      getOrCreateBillingPolicy: jest.fn().mockResolvedValue({
        graceDays: 3,
        restrictAttendanceWhenOverdue: true,
        restrictAppUsageWhenOverdue: false,
      }),
      getBranchBillingSummaryData: jest.fn().mockResolvedValue({
        grossTotal: new Prisma.Decimal(200),
        netTotal: new Prisma.Decimal(180),
        approvedPaymentsCount: 2,
        pendingPaymentsCount: 0,
        pendingChargesCount: 1,
        overdueChargesCount: 1,
        paidChargesCount: 2,
      }),
      listPaymentsForDuplicateReview: jest.fn().mockResolvedValue([]),
      getBranchStudentFinancialStatusData: jest.fn().mockResolvedValue({
        memberships: [
          {
            id: 'membership_1',
            studentId: 'student_1',
            status: StudentMembershipStatus.ACTIVE,
            student: {
              id: 'student_1',
              firstName: 'Ana',
              lastName: 'Silva',
            },
          },
          {
            id: 'membership_2',
            studentId: 'student_2',
            status: StudentMembershipStatus.FROZEN,
            student: {
              id: 'student_2',
              firstName: 'Bruno',
              lastName: 'Costa',
            },
          },
        ],
        charges: [
          {
            studentId: 'student_1',
            dueDate: new Date('2026-03-10T00:00:00.000Z'),
            effectiveStatus: BillingChargeStatus.OVERDUE,
            outstandingAmount: new Prisma.Decimal(100),
            student: {
              id: 'student_1',
              firstName: 'Ana',
              lastName: 'Silva',
            },
          },
        ],
      }),
    };

    const useCase = new GetBranchBillingSummaryUseCase(
      new BillingPolicy(new AccessControlService()),
      billingRepository as unknown as BillingRepository,
    );

    const result = await useCase.execute(
      buildPrincipal(),
      'org_1',
      'branch_1',
      {
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
      },
    );

    expect(result.operationalSnapshot).toMatchObject({
      studentFinancialStatusCounts: {
        CURRENT: 0,
        DUE_SOON: 0,
        OVERDUE: 0,
        RESTRICTED: 1,
        FROZEN: 1,
      },
      overdueStudentsCount: 0,
      dueSoonStudentsCount: 0,
      restrictedStudentsCount: 1,
    });
  });
});
