import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AttendanceStatus, ClassSessionStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

const SESSION_ATTENDANCE_LOCK_NAMESPACE = 82001;

const attendanceRecordSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  classSessionId: true,
  studentId: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      primaryBranchId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      currentBelt: true,
      currentStripes: true,
    },
  },
} satisfies Prisma.AttendanceRecordSelect;

type TxClient = Prisma.TransactionClient;

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getBranchAccessTarget(organizationId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        headCoachMembershipId: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async getSessionAttendanceTarget(
    organizationId: string,
    branchId: string,
    sessionId: string,
  ) {
    const session = await this.prisma.classSession.findFirst({
      where: {
        id: sessionId,
        organizationId,
        branchId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        branchId: true,
        status: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Class session not found');
    }

    return session;
  }

  async findExistingStudentsForAttendance(
    organizationId: string,
    studentIds: string[],
  ) {
    if (!studentIds.length) {
      return [];
    }

    return this.prisma.student.findMany({
      where: {
        organizationId,
        id: {
          in: studentIds,
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
  }

  // This is the strongest guarantee we have in this phase:
  // attendance writers for the same session are serialized inside a serializable transaction
  // with a Postgres advisory transaction lock. It protects app writers using this backend,
  // but it is not a DB-wide write policy for external writers bypassing the app.
  async upsertSessionAttendance(params: {
    organizationId: string;
    branchId: string;
    classSessionId: string;
    records: Array<{
      studentId: string;
      status: AttendanceStatus;
      notes: string | null;
    }>;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.acquireSessionAttendanceLock(tx, {
          organizationId: params.organizationId,
          classSessionId: params.classSessionId,
        });

        const session = await tx.classSession.findFirst({
          where: {
            id: params.classSessionId,
            organizationId: params.organizationId,
            branchId: params.branchId,
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
          },
        });

        if (!session) {
          throw new NotFoundException('Class session not found');
        }

        if (session.status === ClassSessionStatus.CANCELED) {
          throw new ConflictException(
            'Cannot record attendance for a canceled class session',
          );
        }

        for (const record of params.records) {
          await tx.attendanceRecord.upsert({
            where: {
              classSessionId_studentId: {
                classSessionId: params.classSessionId,
                studentId: record.studentId,
              },
            },
            create: {
              organizationId: params.organizationId,
              branchId: params.branchId,
              classSessionId: params.classSessionId,
              studentId: record.studentId,
              status: record.status,
              notes: record.notes,
            },
            update: {
              status: record.status,
              notes: record.notes,
            },
          });
        }

        return tx.attendanceRecord.findMany({
          where: {
            organizationId: params.organizationId,
            branchId: params.branchId,
            classSessionId: params.classSessionId,
          },
          orderBy: [
            {
              student: {
                lastName: 'asc',
              },
            },
            {
              student: {
                firstName: 'asc',
              },
            },
          ],
          select: attendanceRecordSelect,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async listSessionAttendance(
    organizationId: string,
    branchId: string,
    sessionId: string,
  ) {
    return this.prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        branchId,
        classSessionId: sessionId,
      },
      orderBy: [
        {
          student: {
            lastName: 'asc',
          },
        },
        {
          student: {
            firstName: 'asc',
          },
        },
      ],
      select: attendanceRecordSelect,
    });
  }

  private async acquireSessionAttendanceLock(
    tx: TxClient,
    params: {
      organizationId: string;
      classSessionId: string;
    },
  ) {
    const lockKey = `org:${params.organizationId}:session:${params.classSessionId}:attendance`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${SESSION_ATTENDANCE_LOCK_NAMESPACE}, hashtext(${lockKey}))`;
  }
}
