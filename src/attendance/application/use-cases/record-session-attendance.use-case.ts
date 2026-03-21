import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { AttendanceStatus } from '../../../generated/prisma/enums';
import { RecordSessionAttendanceDto } from '../../dto/record-session-attendance.dto';
import { AttendancePolicy } from '../../domain/attendance.policy';
import { AttendanceRepository } from '../../infrastructure/attendance.repository';

@Injectable()
export class RecordSessionAttendanceUseCase {
  constructor(
    private readonly attendancePolicy: AttendancePolicy,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    sessionId: string,
    dto: RecordSessionAttendanceDto,
  ) {
    const branch = await this.attendanceRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.attendancePolicy.ensureCanRecordSessionAttendance(
      principal,
      organizationId,
      branch,
    );

    const session = await this.attendanceRepository.getSessionAttendanceTarget(
      organizationId,
      branchId,
      sessionId,
    );
    this.attendancePolicy.ensureSessionAcceptsAttendance(session);

    const normalizedRecords = this.attendancePolicy.normalizeAttendanceRecords(
      dto.records,
    );
    const students =
      await this.attendanceRepository.findExistingStudentsForAttendance(
        organizationId,
        normalizedRecords.map((record) => record.studentId),
      );

    if (students.length !== normalizedRecords.length) {
      throw new NotFoundException(
        'One or more students were not found in the organization',
      );
    }

    const items = await this.attendanceRepository.upsertSessionAttendance({
      organizationId,
      branchId,
      classSessionId: sessionId,
      records: normalizedRecords,
    });

    const counts = normalizedRecords.reduce<Record<AttendanceStatus, number>>(
      (acc, record) => {
        acc[record.status] += 1;
        return acc;
      },
      {
        [AttendanceStatus.PRESENT]: 0,
        [AttendanceStatus.LATE]: 0,
        [AttendanceStatus.ABSENT]: 0,
        [AttendanceStatus.EXCUSED]: 0,
      },
    );

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'session_attendance.recorded',
      entityType: 'ClassSession',
      entityId: sessionId,
      metadata: {
        affectedStudents: normalizedRecords.length,
        counts,
      },
    });

    return {
      items,
      summary: {
        total: items.length,
      },
    };
  }
}
