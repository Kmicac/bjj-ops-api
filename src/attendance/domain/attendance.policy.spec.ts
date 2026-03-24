import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AccessControlService } from '../../auth/access-control.service';
import {
  MembershipRole,
  MembershipScopeType,
} from '../../generated/prisma/enums';
import { AttendancePolicy } from './attendance.policy';

describe('AttendancePolicy', () => {
  let policy: AttendancePolicy;
  let accessControl: {
    ensureOrganizationAccess: jest.Mock;
    ensureBranchAccess: jest.Mock;
  };

  beforeEach(() => {
    accessControl = {
      ensureOrganizationAccess: jest.fn(),
      ensureBranchAccess: jest.fn(),
    };
    policy = new AttendancePolicy(
      accessControl as unknown as AccessControlService,
    );
  });

  it('enforces branch-local staff authorization when recording attendance', () => {
    const principal = {
      sub: 'user_1',
      organizationSlug: 'org-1',
      organizationId: 'org_1',
      membershipId: 'membership_1',
      assignedRoles: [MembershipRole.STAFF],
      scopeType: MembershipScopeType.SELECTED_BRANCHES,
      branchIds: ['branch_1'],
      primaryBranchId: 'branch_1',
      email: 'staff@example.com',
      type: 'access' as const,
    };

    policy.ensureCanRecordSessionAttendance(principal, 'org_1', {
      id: 'branch_1',
      organizationId: 'org_1',
      headCoachMembershipId: null,
    });

    expect(accessControl.ensureOrganizationAccess).toHaveBeenCalledWith(
      principal,
      'org_1',
    );
    expect(accessControl.ensureBranchAccess).toHaveBeenCalledWith(
      principal,
      {
        id: 'branch_1',
        organizationId: 'org_1',
        headCoachMembershipId: null,
      },
      MembershipRole.STAFF,
    );
  });

  it('blocks attendance when billing marks a student as attendance restricted', () => {
    expect(() =>
      policy.ensureStudentsCanRecordAttendance([
        {
          student: {
            id: 'student_1',
            firstName: 'Ana',
            lastName: 'Silva',
          },
          membership: null,
          financialStatus: 'RESTRICTED',
          daysOverdue: 4,
          nextDueDate: new Date('2026-03-10T00:00:00.000Z'),
          hasOverdueCharges: true,
          hasPendingCharges: false,
          activeRestrictionFlags: {
            attendanceRestricted: true,
            appUsageRestricted: false,
          },
          totalDue: { toString: () => '100' } as never,
        },
      ]),
    ).toThrow(ConflictException);
  });

  it('does not block attendance for frozen students without an active attendance restriction', () => {
    expect(() =>
      policy.ensureStudentsCanRecordAttendance([
        {
          student: {
            id: 'student_1',
            firstName: 'Ana',
            lastName: 'Silva',
          },
          membership: {
            id: 'membership_1',
            status: 'FROZEN',
          } as never,
          financialStatus: 'FROZEN',
          daysOverdue: 0,
          nextDueDate: null,
          hasOverdueCharges: false,
          hasPendingCharges: false,
          activeRestrictionFlags: {
            attendanceRestricted: false,
            appUsageRestricted: false,
          },
          totalDue: { toString: () => '0' } as never,
        },
      ]),
    ).not.toThrow();
  });

  it('preserves branch authorization failures before any billing enforcement', () => {
    accessControl.ensureBranchAccess.mockImplementation(() => {
      throw new ForbiddenException('Branch access denied');
    });

    const principal = {
      sub: 'user_1',
      organizationSlug: 'org-1',
      organizationId: 'org_1',
      membershipId: 'membership_1',
      assignedRoles: [MembershipRole.STAFF],
      scopeType: MembershipScopeType.SELECTED_BRANCHES,
      branchIds: ['branch_2'],
      primaryBranchId: 'branch_2',
      email: 'staff@example.com',
      type: 'access' as const,
    };

    expect(() =>
      policy.ensureCanRecordSessionAttendance(principal, 'org_1', {
        id: 'branch_1',
        organizationId: 'org_1',
        headCoachMembershipId: null,
      }),
    ).toThrow(ForbiddenException);
  });
});
