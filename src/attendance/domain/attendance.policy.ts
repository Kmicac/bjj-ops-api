import { ConflictException, Injectable } from '@nestjs/common';
import { AccessControlService } from '../../auth/access-control.service';
import type { AuthenticatedPrincipal } from '../../auth/authenticated-principal.interface';
import {
  ClassSessionStatus,
  MembershipRole,
} from '../../generated/prisma/enums';
import { SessionAttendanceEntryDto } from '../dto/session-attendance-entry.dto';

type BranchAccessTarget = {
  id: string;
  organizationId: string;
  headCoachMembershipId: string | null;
};

type SessionAttendanceTarget = {
  id: string;
  organizationId: string;
  branchId: string;
  status: ClassSessionStatus;
};

type AttendanceRestrictionTarget = {
  student: {
    firstName: string;
    lastName: string;
  };
  activeRestrictionFlags: {
    attendanceRestricted: boolean;
  };
};

@Injectable()
export class AttendancePolicy {
  constructor(private readonly accessControl: AccessControlService) {}

  ensureCanListSessionAttendance(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureStaffBranchAccess(principal, organizationId, branch);
  }

  ensureCanRecordSessionAttendance(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureStaffBranchAccess(principal, organizationId, branch);
  }

  ensureSessionAcceptsAttendance(session: SessionAttendanceTarget) {
    if (session.status === ClassSessionStatus.CANCELED) {
      throw new ConflictException(
        'Cannot record attendance for a canceled class session',
      );
    }
  }

  normalizeAttendanceRecords(records: SessionAttendanceEntryDto[]) {
    const normalized = records.map((record) => ({
      studentId: record.studentId.trim(),
      status: record.status,
      notes: record.notes?.trim() || null,
    }));

    const uniqueStudentIds = new Set(
      normalized.map((record) => record.studentId),
    );

    if (uniqueStudentIds.size !== normalized.length) {
      throw new ConflictException(
        'Attendance payload contains duplicate studentIds',
      );
    }

    return normalized;
  }

  ensureStudentsCanRecordAttendance(
    financialViews: AttendanceRestrictionTarget[],
  ) {
    const restrictedStudents = financialViews.filter(
      (view) => view.activeRestrictionFlags.attendanceRestricted,
    );

    if (!restrictedStudents.length) {
      return;
    }

    const studentNames = restrictedStudents.map((view) =>
      `${view.student.firstName} ${view.student.lastName}`.trim(),
    );
    const listedStudents = studentNames.slice(0, 3).join(', ');
    const suffix =
      studentNames.length > 3 ? ` and ${studentNames.length - 3} more` : '';

    throw new ConflictException(
      `Attendance is restricted by branch billing policy for student(s): ${listedStudents}${suffix}`,
    );
  }

  private ensureStaffBranchAccess(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);
    this.accessControl.ensureBranchAccess(
      principal,
      branch,
      MembershipRole.STAFF,
    );
  }
}
