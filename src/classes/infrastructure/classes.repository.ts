import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  ClassSessionStatus,
  ClassType,
  MembershipScopeType,
  MembershipStatus,
  Weekday,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

const SESSION_BRANCH_LOCK_NAMESPACE = 81001;
const SESSION_INSTRUCTOR_LOCK_NAMESPACE = 81002;

const scheduleInstructorSelect = {
  id: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.OrganizationMembershipSelect;

const classScheduleSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  instructorMembershipId: true,
  title: true,
  classType: true,
  description: true,
  weekday: true,
  startTime: true,
  endTime: true,
  timezone: true,
  capacity: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  instructorMembership: {
    select: scheduleInstructorSelect,
  },
} satisfies Prisma.ClassScheduleSelect;

const classSessionSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  classScheduleId: true,
  instructorMembershipId: true,
  title: true,
  classType: true,
  scheduledDate: true,
  startAt: true,
  endAt: true,
  capacity: true,
  status: true,
  cancellationReason: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  instructorMembership: {
    select: scheduleInstructorSelect,
  },
} satisfies Prisma.ClassSessionSelect;

const classScheduleSnapshotSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  instructorMembershipId: true,
  title: true,
  classType: true,
  weekday: true,
  startTime: true,
  endTime: true,
  timezone: true,
  capacity: true,
  isActive: true,
} satisfies Prisma.ClassScheduleSelect;

type CreateClassScheduleInput = {
  organizationId: string;
  branchId: string;
  instructorMembershipId: string;
  title: string;
  classType: ClassType;
  description?: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  timezone: string;
  capacity?: number;
  isActive: boolean;
};

type UpdateClassScheduleInput = {
  scheduleId: string;
  instructorMembershipId?: string;
  title?: string;
  classType?: ClassType;
  description?: string | null;
  weekday?: Weekday;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  capacity?: number | null;
  isActive?: boolean;
};

type CreateClassSessionInput = {
  organizationId: string;
  branchId: string;
  classScheduleId?: string;
  instructorMembershipId: string;
  title: string;
  classType: ClassType;
  scheduledDate: Date;
  startAt: Date;
  endAt: Date;
  capacity?: number;
  notes?: string;
};

type UpdateClassSessionInput = {
  organizationId: string;
  branchId: string;
  sessionId: string;
  classScheduleId?: string | null;
  instructorMembershipId: string;
  title?: string;
  classType?: ClassType;
  scheduledDateIso: string;
  scheduledDate?: Date;
  startAt: Date;
  endAt: Date;
  capacity?: number | null;
  status?: ClassSessionStatus;
  cancellationReason?: string | null;
  notes?: string | null;
  enforceScheduleDateUniqueness?: boolean;
  enforceOverlapValidation?: boolean;
};

type TxClient = Prisma.TransactionClient;

@Injectable()
export class ClassesRepository {
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
        timezone: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async findInstructorCandidate(params: {
    organizationId: string;
    branchId: string;
    membershipId: string;
  }) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        id: params.membershipId,
        organizationId: params.organizationId,
        status: MembershipStatus.ACTIVE,
        OR: [
          {
            scopeType: MembershipScopeType.ORGANIZATION_WIDE,
          },
          {
            primaryBranchId: params.branchId,
          },
          {
            branchScopes: {
              some: {
                branchId: params.branchId,
              },
            },
          },
        ],
      },
      select: {
        roles: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!membership) {
      return null;
    }

    return {
      assignedRoles: membership.roles.map(({ role }) => role),
    };
  }

  async getClassScheduleById(
    organizationId: string,
    branchId: string,
    scheduleId: string,
  ) {
    const schedule = await this.prisma.classSchedule.findFirst({
      where: {
        id: scheduleId,
        organizationId,
        branchId,
        deletedAt: null,
      },
      select: classScheduleSelect,
    });

    if (!schedule) {
      throw new NotFoundException('Class schedule not found');
    }

    return schedule;
  }

  async getClassScheduleSnapshot(
    organizationId: string,
    branchId: string,
    scheduleId: string,
  ) {
    const schedule = await this.prisma.classSchedule.findFirst({
      where: {
        id: scheduleId,
        organizationId,
        branchId,
        deletedAt: null,
      },
      select: classScheduleSnapshotSelect,
    });

    if (!schedule) {
      throw new NotFoundException('Class schedule not found');
    }

    return schedule;
  }

  async createClassSchedule(input: CreateClassScheduleInput) {
    return this.prisma.classSchedule.create({
      data: input,
      select: classScheduleSelect,
    });
  }

  async listBranchClassSchedules(params: {
    organizationId: string;
    branchId: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: params.organizationId,
      branchId: params.branchId,
      deletedAt: null,
    } satisfies Prisma.ClassScheduleWhereInput;

    const [items, total] = await Promise.all([
      this.prisma.classSchedule.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }, { title: 'asc' }],
        select: classScheduleSelect,
      }),
      this.prisma.classSchedule.count({ where }),
    ]);

    return { items, total };
  }

  async updateClassSchedule(input: UpdateClassScheduleInput) {
    return this.prisma.classSchedule.update({
      where: {
        id: input.scheduleId,
      },
      data: {
        instructorMembershipId: input.instructorMembershipId,
        title: input.title,
        classType: input.classType,
        description: input.description,
        weekday: input.weekday,
        startTime: input.startTime,
        endTime: input.endTime,
        timezone: input.timezone,
        capacity: input.capacity,
        isActive: input.isActive,
      },
      select: classScheduleSelect,
    });
  }

  async getClassSessionById(
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
      select: classSessionSelect,
    });

    if (!session) {
      throw new NotFoundException('Class session not found');
    }

    return session;
  }

  async createClassSession(input: CreateClassSessionInput) {
    return this.prisma.classSession.create({
      data: {
        ...input,
        status: ClassSessionStatus.SCHEDULED,
      },
      select: classSessionSelect,
    });
  }

  // This is the strongest guarantee we have in this phase:
  // app writers are serialized with advisory locks inside a serializable transaction.
  // It protects against concurrent writers using this app, but it is not a DB-wide exclusion constraint.
  async createClassSessionWithConsistencyChecks(
    input: CreateClassSessionInput & {
      scheduledDateIso: string;
      enforceScheduleDateUniqueness?: boolean;
      enforceOverlapValidation?: boolean;
    },
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.acquireSessionWriteLocks(tx, {
          organizationId: input.organizationId,
          branchId: input.branchId,
          instructorMembershipId: input.instructorMembershipId,
        });

        if (input.enforceScheduleDateUniqueness && input.classScheduleId) {
          const existingSession = await this.findSessionForScheduleOnDateTx(tx, {
            organizationId: input.organizationId,
            branchId: input.branchId,
            scheduleId: input.classScheduleId,
            scheduledDateIso: input.scheduledDateIso,
          });

          if (existingSession) {
            throw new ConflictException(
              'A class session already exists for this schedule on the selected date',
            );
          }
        }

        if (input.enforceOverlapValidation) {
          const overlaps = await this.findSessionOverlapsTx(tx, {
            organizationId: input.organizationId,
            branchId: input.branchId,
            instructorMembershipId: input.instructorMembershipId,
            startAt: input.startAt,
            endAt: input.endAt,
          });

          if (overlaps.branchConflicts.length > 0) {
            throw new ConflictException(
              'Branch already has another class session scheduled in the same time window',
            );
          }

          if (overlaps.instructorConflicts.length > 0) {
            throw new ConflictException(
              'Instructor already has another class session scheduled in the same time window',
            );
          }
        }

        return tx.classSession.create({
          data: {
            organizationId: input.organizationId,
            branchId: input.branchId,
            classScheduleId: input.classScheduleId,
            instructorMembershipId: input.instructorMembershipId,
            title: input.title,
            classType: input.classType,
            scheduledDate: input.scheduledDate,
            startAt: input.startAt,
            endAt: input.endAt,
            capacity: input.capacity,
            notes: input.notes,
            status: ClassSessionStatus.SCHEDULED,
          },
          select: classSessionSelect,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async listBranchClassSessions(params: {
    organizationId: string;
    branchId: string;
    fromDate?: string;
    toDate?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: params.organizationId,
      branchId: params.branchId,
      scheduledDate:
        params.fromDate && params.toDate
          ? {
              gte: new Date(`${params.fromDate}T00:00:00.000Z`),
              lte: new Date(`${params.toDate}T00:00:00.000Z`),
            }
          : undefined,
      deletedAt: null,
    } satisfies Prisma.ClassSessionWhereInput;

    const [items, total] = await Promise.all([
      this.prisma.classSession.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ scheduledDate: 'desc' }, { startAt: 'desc' }],
        select: classSessionSelect,
      }),
      this.prisma.classSession.count({ where }),
    ]);

    return { items, total };
  }

  async listBranchClassSessionsInRange(params: {
    organizationId: string;
    branchId: string;
    fromDate: string;
    toDate: string;
  }) {
    return this.prisma.classSession.findMany({
      where: {
        organizationId: params.organizationId,
        branchId: params.branchId,
        scheduledDate: {
          gte: new Date(`${params.fromDate}T00:00:00.000Z`),
          lte: new Date(`${params.toDate}T00:00:00.000Z`),
        },
        deletedAt: null,
      },
      orderBy: [{ scheduledDate: 'asc' }, { startAt: 'asc' }],
      select: classSessionSelect,
    });
  }

  async findSessionForScheduleOnDate(
    organizationId: string,
    branchId: string,
    scheduleId: string,
    scheduledDate: string,
  ) {
    return this.prisma.classSession.findFirst({
      where: {
        organizationId,
        branchId,
        classScheduleId: scheduleId,
        scheduledDate: new Date(`${scheduledDate}T00:00:00.000Z`),
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
  }

  async findSessionOverlaps(params: {
    organizationId: string;
    branchId: string;
    instructorMembershipId: string;
    startAt: Date;
    endAt: Date;
    excludeSessionId?: string;
  }) {
    const overlapWhere = {
      organizationId: params.organizationId,
      deletedAt: null,
      status: {
        not: ClassSessionStatus.CANCELED,
      },
      startAt: {
        lt: params.endAt,
      },
      endAt: {
        gt: params.startAt,
      },
      id: params.excludeSessionId
        ? {
            not: params.excludeSessionId,
          }
        : undefined,
    } satisfies Prisma.ClassSessionWhereInput;

    const [branchConflicts, instructorConflicts] = await Promise.all([
      this.prisma.classSession.findMany({
        where: {
          ...overlapWhere,
          branchId: params.branchId,
        },
        select: {
          id: true,
        },
      }),
      this.prisma.classSession.findMany({
        where: {
          ...overlapWhere,
          instructorMembershipId: params.instructorMembershipId,
        },
        select: {
          id: true,
        },
      }),
    ]);

    return {
      branchConflicts,
      instructorConflicts,
    };
  }

  async updateClassSession(input: UpdateClassSessionInput) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.acquireSessionWriteLocks(tx, {
          organizationId: input.organizationId,
          branchId: input.branchId,
          instructorMembershipId: input.instructorMembershipId,
        });

        if (input.enforceScheduleDateUniqueness && input.classScheduleId) {
          const existingSession = await this.findSessionForScheduleOnDateTx(tx, {
            organizationId: input.organizationId,
            branchId: input.branchId,
            scheduleId: input.classScheduleId,
            scheduledDateIso: input.scheduledDateIso,
            excludeSessionId: input.sessionId,
          });

          if (existingSession) {
            throw new ConflictException(
              'A class session already exists for this schedule on the selected date',
            );
          }
        }

        if (
          input.enforceOverlapValidation &&
          input.instructorMembershipId &&
          input.startAt &&
          input.endAt
        ) {
          const overlaps = await this.findSessionOverlapsTx(tx, {
            organizationId: input.organizationId,
            branchId: input.branchId,
            instructorMembershipId: input.instructorMembershipId,
            startAt: input.startAt,
            endAt: input.endAt,
            excludeSessionId: input.sessionId,
          });

          if (overlaps.branchConflicts.length > 0) {
            throw new ConflictException(
              'Branch already has another class session scheduled in the same time window',
            );
          }

          if (overlaps.instructorConflicts.length > 0) {
            throw new ConflictException(
              'Instructor already has another class session scheduled in the same time window',
            );
          }
        }

        return tx.classSession.update({
          where: {
            id: input.sessionId,
          },
          data: {
            instructorMembershipId: input.instructorMembershipId,
            title: input.title,
            classType: input.classType,
            scheduledDate: input.scheduledDate,
            startAt: input.startAt,
            endAt: input.endAt,
            capacity: input.capacity,
            status: input.status,
            cancellationReason: input.cancellationReason,
            notes: input.notes,
          },
          select: classSessionSelect,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private async acquireSessionWriteLocks(
    tx: TxClient,
    params: {
      organizationId: string;
      branchId: string;
      instructorMembershipId: string;
    },
  ) {
    const branchLockKey = `org:${params.organizationId}:branch:${params.branchId}`;
    const instructorLockKey = `org:${params.organizationId}:instructor:${params.instructorMembershipId}`;

    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${SESSION_BRANCH_LOCK_NAMESPACE}, hashtext(${branchLockKey}))`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${SESSION_INSTRUCTOR_LOCK_NAMESPACE}, hashtext(${instructorLockKey}))`;
  }

  private async findSessionForScheduleOnDateTx(
    tx: TxClient,
    params: {
      organizationId: string;
      branchId: string;
      scheduleId: string;
      scheduledDateIso: string;
      excludeSessionId?: string;
    },
  ) {
    return tx.classSession.findFirst({
      where: {
        organizationId: params.organizationId,
        branchId: params.branchId,
        classScheduleId: params.scheduleId,
        scheduledDate: new Date(`${params.scheduledDateIso}T00:00:00.000Z`),
        deletedAt: null,
        id: params.excludeSessionId
          ? {
              not: params.excludeSessionId,
            }
          : undefined,
      },
      select: {
        id: true,
      },
    });
  }

  private async findSessionOverlapsTx(
    tx: TxClient,
    params: {
      organizationId: string;
      branchId: string;
      instructorMembershipId: string;
      startAt: Date;
      endAt: Date;
      excludeSessionId?: string;
    },
  ) {
    const overlapWhere = {
      organizationId: params.organizationId,
      deletedAt: null,
      status: {
        not: ClassSessionStatus.CANCELED,
      },
      startAt: {
        lt: params.endAt,
      },
      endAt: {
        gt: params.startAt,
      },
      id: params.excludeSessionId
        ? {
            not: params.excludeSessionId,
          }
        : undefined,
    } satisfies Prisma.ClassSessionWhereInput;

    const [branchConflicts, instructorConflicts] = await Promise.all([
      tx.classSession.findMany({
        where: {
          ...overlapWhere,
          branchId: params.branchId,
        },
        select: {
          id: true,
        },
      }),
      tx.classSession.findMany({
        where: {
          ...overlapWhere,
          instructorMembershipId: params.instructorMembershipId,
        },
        select: {
          id: true,
        },
      }),
    ]);

    return {
      branchConflicts,
      instructorConflicts,
    };
  }
}
