import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../../../audit/audit.service';
import { AccessControlService } from '../../../auth/access-control.service';
import { BillingAttendanceEnforcementService } from '../../../billing/application/billing-attendance-enforcement.service';
import {
  AttendanceStatus,
  MembershipRole,
  MembershipScopeType,
} from '../../../generated/prisma/enums';
import { AttendancePolicy } from '../../domain/attendance.policy';
import { AttendanceRepository } from '../../infrastructure/attendance.repository';
import { RecordSessionAttendanceUseCase } from './record-session-attendance.use-case';

describe('RecordSessionAttendanceUseCase', () => {
  let useCase: RecordSessionAttendanceUseCase;
  let attendanceRepository: {
    getBranchAccessTarget: jest.Mock;
    getSessionAttendanceTarget: jest.Mock;
    findExistingStudentsForAttendance: jest.Mock;
    upsertSessionAttendance: jest.Mock;
  };
  let billingAttendanceEnforcement: {
    getStudentAttendanceRestrictionStates: jest.Mock;
  };
  let auditService: {
    create: jest.Mock;
  };
  let accessControl: {
    ensureOrganizationAccess: jest.Mock;
    ensureBranchAccess: jest.Mock;
  };

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

  beforeEach(() => {
    attendanceRepository = {
      getBranchAccessTarget: jest.fn().mockResolvedValue({
        id: 'branch_1',
        organizationId: 'org_1',
        headCoachMembershipId: null,
      }),
      getSessionAttendanceTarget: jest.fn().mockResolvedValue({
        id: 'session_1',
        organizationId: 'org_1',
        branchId: 'branch_1',
        status: 'SCHEDULED',
      }),
      findExistingStudentsForAttendance: jest.fn().mockResolvedValue([
        {
          id: 'student_1',
          firstName: 'Ana',
          lastName: 'Silva',
        },
      ]),
      upsertSessionAttendance: jest.fn().mockResolvedValue([
        {
          id: 'attendance_1',
          studentId: 'student_1',
          status: AttendanceStatus.PRESENT,
        },
      ]),
    };
    billingAttendanceEnforcement = {
      getStudentAttendanceRestrictionStates: jest.fn().mockResolvedValue([
        {
          student: {
            id: 'student_1',
            firstName: 'Ana',
            lastName: 'Silva',
          },
          membership: null,
          financialStatus: 'CURRENT',
          daysOverdue: 0,
          nextDueDate: null,
          hasOverdueCharges: false,
          hasPendingCharges: false,
          activeRestrictionFlags: {
            attendanceRestricted: false,
            appUsageRestricted: false,
          },
          totalDue: { toString: () => '0' },
        },
      ]),
    };
    auditService = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    accessControl = {
      ensureOrganizationAccess: jest.fn(),
      ensureBranchAccess: jest.fn(),
    };

    useCase = new RecordSessionAttendanceUseCase(
      new AttendancePolicy(accessControl as unknown as AccessControlService),
      attendanceRepository as unknown as AttendanceRepository,
      billingAttendanceEnforcement as unknown as BillingAttendanceEnforcementService,
      auditService as unknown as AuditService,
    );
  });

  it('records attendance when billing does not mark the student as restricted', async () => {
    const result = await useCase.execute(
      principal,
      'org_1',
      'branch_1',
      'session_1',
      {
        records: [
          {
            studentId: 'student_1',
            status: AttendanceStatus.PRESENT,
          },
        ],
      },
    );

    expect(
      billingAttendanceEnforcement.getStudentAttendanceRestrictionStates,
    ).toHaveBeenCalledWith({
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
    expect(attendanceRepository.upsertSessionAttendance).toHaveBeenCalled();
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'session_attendance.recorded',
        organizationId: 'org_1',
        branchId: 'branch_1',
      }),
    );
    expect(result).toEqual({
      items: [
        {
          id: 'attendance_1',
          studentId: 'student_1',
          status: AttendanceStatus.PRESENT,
        },
      ],
      summary: {
        total: 1,
      },
    });
  });

  it('blocks attendance when billing marks the student as attendance restricted', async () => {
    billingAttendanceEnforcement.getStudentAttendanceRestrictionStates.mockResolvedValue(
      [
        {
          student: {
            id: 'student_1',
            firstName: 'Ana',
            lastName: 'Silva',
          },
          membership: null,
          financialStatus: 'RESTRICTED',
          daysOverdue: 5,
          nextDueDate: new Date('2026-03-10T00:00:00.000Z'),
          hasOverdueCharges: true,
          hasPendingCharges: false,
          activeRestrictionFlags: {
            attendanceRestricted: true,
            appUsageRestricted: false,
          },
          totalDue: { toString: () => '100' },
        },
      ],
    );

    await expect(
      useCase.execute(principal, 'org_1', 'branch_1', 'session_1', {
        records: [
          {
            studentId: 'student_1',
            status: AttendanceStatus.PRESENT,
          },
        ],
      }),
    ).rejects.toThrow(
      new ConflictException(
        'Attendance is restricted by branch billing policy for student(s): Ana Silva',
      ),
    );

    expect(attendanceRepository.upsertSessionAttendance).not.toHaveBeenCalled();
    expect(auditService.create).not.toHaveBeenCalled();
  });

  it('does not block attendance for overdue students when the branch policy leaves attendance unrestricted', async () => {
    billingAttendanceEnforcement.getStudentAttendanceRestrictionStates.mockResolvedValue(
      [
        {
          student: {
            id: 'student_1',
            firstName: 'Ana',
            lastName: 'Silva',
          },
          membership: null,
          financialStatus: 'OVERDUE',
          daysOverdue: 5,
          nextDueDate: new Date('2026-03-10T00:00:00.000Z'),
          hasOverdueCharges: true,
          hasPendingCharges: false,
          activeRestrictionFlags: {
            attendanceRestricted: false,
            appUsageRestricted: true,
          },
          totalDue: { toString: () => '100' },
        },
      ],
    );

    await expect(
      useCase.execute(principal, 'org_1', 'branch_1', 'session_1', {
        records: [
          {
            studentId: 'student_1',
            status: AttendanceStatus.PRESENT,
          },
        ],
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        summary: {
          total: 1,
        },
      }),
    );

    expect(attendanceRepository.upsertSessionAttendance).toHaveBeenCalled();
  });

  it('preserves branch-local authorization before evaluating billing restrictions', async () => {
    accessControl.ensureBranchAccess.mockImplementation(() => {
      throw new ForbiddenException('Branch access denied');
    });

    await expect(
      useCase.execute(
        {
          ...principal,
          branchIds: ['branch_2'],
          primaryBranchId: 'branch_2',
        },
        'org_1',
        'branch_1',
        'session_1',
        {
          records: [
            {
              studentId: 'student_1',
              status: AttendanceStatus.PRESENT,
            },
          ],
        },
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(
      billingAttendanceEnforcement.getStudentAttendanceRestrictionStates,
    ).not.toHaveBeenCalled();
    expect(attendanceRepository.upsertSessionAttendance).not.toHaveBeenCalled();
  });
});
