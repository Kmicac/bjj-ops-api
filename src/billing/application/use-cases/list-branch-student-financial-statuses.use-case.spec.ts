import { ForbiddenException } from '@nestjs/common';
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
import { ListBranchStudentFinancialStatusesUseCase } from './list-branch-student-financial-statuses.use-case';

function buildPrincipal(params?: {
  branchIds?: string[];
  primaryBranchId?: string | null;
}) {
  return {
    sub: 'user_1',
    organizationSlug: 'org-1',
    organizationId: 'org_1',
    membershipId: 'membership_1',
    assignedRoles: [MembershipRole.ACADEMY_MANAGER],
    scopeType: MembershipScopeType.SELECTED_BRANCHES,
    branchIds: params?.branchIds ?? ['branch_1'],
    primaryBranchId: params?.primaryBranchId ?? 'branch_1',
    email: 'manager@example.com',
    type: 'access' as const,
  };
}

describe('ListBranchStudentFinancialStatusesUseCase', () => {
  let useCase: ListBranchStudentFinancialStatusesUseCase;
  let billingRepository: {
    getBranchAccessTarget: jest.Mock;
    getOrCreateBillingPolicy: jest.Mock;
    getBranchStudentFinancialStatusData: jest.Mock;
  };

  beforeEach(() => {
    billingRepository = {
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

    useCase = new ListBranchStudentFinancialStatusesUseCase(
      new BillingPolicy(new AccessControlService()),
      billingRepository as unknown as BillingRepository,
    );
  });

  it('returns a paginated branch-local operational view filtered by financial status', async () => {
    const result = await useCase.execute(
      buildPrincipal(),
      'org_1',
      'branch_1',
      {
        page: 1,
        limit: 20,
        financialStatus: 'RESTRICTED',
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      student: {
        id: 'student_1',
      },
      financialStatus: 'RESTRICTED',
    });
    expect(result.meta.total).toBe(1);
  });

  it('enforces branch-local authorization for the operational view', async () => {
    await expect(
      useCase.execute(
        buildPrincipal({
          branchIds: ['branch_2'],
          primaryBranchId: 'branch_2',
        }),
        'org_1',
        'branch_1',
        {
          page: 1,
          limit: 20,
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
