import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AttendanceStatus } from '../../../generated/prisma/enums';
import { AttendancePolicy } from '../../domain/attendance.policy';
import { AttendanceRepository } from '../../infrastructure/attendance.repository';

@Injectable()
export class ListSessionAttendanceUseCase {
  constructor(
    private readonly attendancePolicy: AttendancePolicy,
    private readonly attendanceRepository: AttendanceRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    sessionId: string,
  ) {
    const branch = await this.attendanceRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.attendancePolicy.ensureCanListSessionAttendance(
      principal,
      organizationId,
      branch,
    );

    await this.attendanceRepository.getSessionAttendanceTarget(
      organizationId,
      branchId,
      sessionId,
    );

    const items = await this.attendanceRepository.listSessionAttendance(
      organizationId,
      branchId,
      sessionId,
    );

    const counts = items.reduce<Record<AttendanceStatus, number>>(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      {
        [AttendanceStatus.PRESENT]: 0,
        [AttendanceStatus.LATE]: 0,
        [AttendanceStatus.ABSENT]: 0,
        [AttendanceStatus.EXCUSED]: 0,
      },
    );

    return {
      items,
      summary: {
        total: items.length,
        counts,
      },
    };
  }
}
