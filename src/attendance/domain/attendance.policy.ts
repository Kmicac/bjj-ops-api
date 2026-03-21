import { ConflictException, Injectable } from '@nestjs/common';
import { AccessControlService } from '../../auth/access-control.service';
import type { AuthenticatedPrincipal } from '../../auth/authenticated-principal.interface';
import { ClassSessionStatus, MembershipRole } from '../../generated/prisma/enums';
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

    const uniqueStudentIds = new Set(normalized.map((record) => record.studentId));

    if (uniqueStudentIds.size !== normalized.length) {
      throw new ConflictException(
        'Attendance payload contains duplicate studentIds',
      );
    }

    return normalized;
  }

  private ensureStaffBranchAccess(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);
    this.accessControl.ensureBranchAccess(principal, branch, MembershipRole.STAFF);
  }
}
