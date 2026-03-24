import { Prisma } from '../../generated/prisma/client';
import { AccessControlService } from '../../auth/access-control.service';
import {
  BillingChargeStatus,
  StudentMembershipStatus,
} from '../../generated/prisma/enums';
import { BillingPolicy } from '../domain/billing.policy';
import { BillingAttendanceEnforcementService } from './billing-attendance-enforcement.service';

describe('BillingAttendanceEnforcementService', () => {
  const billingRepository = {
    getOrCreateBillingPolicy: jest.fn(),
    getBranchStudentFinancialStatusDataForStudents: jest.fn(),
  };

  const service = new BillingAttendanceEnforcementService(
    new BillingPolicy(new AccessControlService()),
    billingRepository as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks attendance as restricted when overdue debt activates branch attendance restrictions', async () => {
    billingRepository.getOrCreateBillingPolicy.mockResolvedValue({
      graceDays: 3,
      restrictAttendanceWhenOverdue: true,
      restrictAppUsageWhenOverdue: false,
    });
    billingRepository.getBranchStudentFinancialStatusDataForStudents.mockResolvedValue(
      {
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
      },
    );

    const result = await service.getStudentAttendanceRestrictionStates({
      organizationId: 'org_1',
      branchId: 'branch_1',
      students: [
        {
          id: 'student_1',
          firstName: 'Ana',
          lastName: 'Silva',
        },
      ],
    });

    expect(result).toEqual([
      expect.objectContaining({
        financialStatus: 'RESTRICTED',
        activeRestrictionFlags: {
          attendanceRestricted: true,
          appUsageRestricted: false,
        },
      }),
    ]);
  });

  it('keeps attendance allowed when the branch policy does not restrict attendance for overdue students', async () => {
    billingRepository.getOrCreateBillingPolicy.mockResolvedValue({
      graceDays: 3,
      restrictAttendanceWhenOverdue: false,
      restrictAppUsageWhenOverdue: true,
    });
    billingRepository.getBranchStudentFinancialStatusDataForStudents.mockResolvedValue(
      {
        memberships: [],
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
      },
    );

    const result = await service.getStudentAttendanceRestrictionStates({
      organizationId: 'org_1',
      branchId: 'branch_1',
      students: [
        {
          id: 'student_1',
          firstName: 'Ana',
          lastName: 'Silva',
        },
      ],
    });

    expect(result).toEqual([
      expect.objectContaining({
        financialStatus: 'RESTRICTED',
        activeRestrictionFlags: {
          attendanceRestricted: false,
          appUsageRestricted: true,
        },
      }),
    ]);
  });

  it('does not restrict attendance for a frozen membership without overdue debt', async () => {
    billingRepository.getOrCreateBillingPolicy.mockResolvedValue({
      graceDays: 3,
      restrictAttendanceWhenOverdue: true,
      restrictAppUsageWhenOverdue: true,
    });
    billingRepository.getBranchStudentFinancialStatusDataForStudents.mockResolvedValue(
      {
        memberships: [
          {
            id: 'membership_1',
            studentId: 'student_1',
            status: StudentMembershipStatus.FROZEN,
            student: {
              id: 'student_1',
              firstName: 'Ana',
              lastName: 'Silva',
            },
          },
        ],
        charges: [],
      },
    );

    const result = await service.getStudentAttendanceRestrictionStates({
      organizationId: 'org_1',
      branchId: 'branch_1',
      students: [
        {
          id: 'student_1',
          firstName: 'Ana',
          lastName: 'Silva',
        },
      ],
    });

    expect(result).toEqual([
      expect.objectContaining({
        financialStatus: 'FROZEN',
        activeRestrictionFlags: {
          attendanceRestricted: false,
          appUsageRestricted: false,
        },
      }),
    ]);
  });
});
