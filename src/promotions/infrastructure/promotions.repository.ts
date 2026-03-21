import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  AttendanceStatus,
  PromotionRank,
  PromotionRecommendation,
  PromotionRequestStatus,
  PromotionTrack,
  PromotionType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

const PROMOTION_STUDENT_LOCK_NAMESPACE = 83001;

const promotionListSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  studentId: true,
  type: true,
  status: true,
  trackSnapshot: true,
  currentBeltSnapshot: true,
  currentStripesSnapshot: true,
  targetBelt: true,
  targetStripes: true,
  effectiveDate: true,
  createdAt: true,
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      promotionTrack: true,
      currentBelt: true,
      currentStripes: true,
    },
  },
  evaluation: {
    select: {
      recommendation: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.PromotionRequestSelect;

const promotionDetailSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  studentId: true,
  proposedByMembershipId: true,
  reviewedByMembershipId: true,
  type: true,
  status: true,
  trackSnapshot: true,
  currentBeltSnapshot: true,
  currentStripesSnapshot: true,
  targetBelt: true,
  targetStripes: true,
  proposalNotes: true,
  decisionNotes: true,
  rejectionReason: true,
  effectiveDate: true,
  decisionAt: true,
  createdAt: true,
  updatedAt: true,
  branch: {
    select: {
      id: true,
      organizationId: true,
      headCoachMembershipId: true,
    },
  },
  student: {
    select: {
      id: true,
      organizationId: true,
      primaryBranchId: true,
      firstName: true,
      lastName: true,
      promotionTrack: true,
      dateOfBirth: true,
      currentBelt: true,
      currentStripes: true,
      joinedOrganizationAt: true,
      startedBjjAt: true,
    },
  },
  proposedByMembership: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  reviewedByMembership: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  evaluation: {
    select: {
      id: true,
      classesSinceLastPromotion: true,
      attendanceLast30Days: true,
      attendanceLast90Days: true,
      daysSinceLastPromotion: true,
      approvedPromotionCount: true,
      guardScore: true,
      passingScore: true,
      controlScore: true,
      escapesDefenseScore: true,
      submissionsScore: true,
      tacticalUnderstandingScore: true,
      attitudeDisciplineScore: true,
      commitmentConsistencyScore: true,
      teamworkRespectScore: true,
      coachNotes: true,
      recommendation: true,
      signalsComputedAt: true,
      updatedAt: true,
      updatedByMembership: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PromotionRequestSelect;

const promotionHistorySummarySelect = {
  id: true,
  branchId: true,
  studentId: true,
  type: true,
  status: true,
  trackSnapshot: true,
  currentBeltSnapshot: true,
  currentStripesSnapshot: true,
  targetBelt: true,
  targetStripes: true,
  effectiveDate: true,
  decisionAt: true,
  createdAt: true,
  proposedByMembershipId: true,
  reviewedByMembershipId: true,
} satisfies Prisma.PromotionRequestSelect;

const pendingPromotionContextSelect = {
  ...promotionHistorySummarySelect,
  evaluation: {
    select: {
      recommendation: true,
      coachNotes: true,
      guardScore: true,
      passingScore: true,
      controlScore: true,
      escapesDefenseScore: true,
      submissionsScore: true,
      tacticalUnderstandingScore: true,
      attitudeDisciplineScore: true,
      commitmentConsistencyScore: true,
      teamworkRespectScore: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.PromotionRequestSelect;

type TxClient = Prisma.TransactionClient;

type PromotionSignals = {
  classesSinceLastPromotion: number;
  attendanceLast30Days: number;
  attendanceLast90Days: number;
  daysSinceLastPromotion: number | null;
  approvedPromotionCount: number;
};

@Injectable()
export class PromotionsRepository {
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

  async getStudentPromotionTarget(organizationId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        primaryBranchId: true,
        firstName: true,
        lastName: true,
        promotionTrack: true,
        dateOfBirth: true,
        currentBelt: true,
        currentStripes: true,
        joinedOrganizationAt: true,
        startedBjjAt: true,
        createdAt: true,
        primaryBranch: {
          select: {
            id: true,
            organizationId: true,
            headCoachMembershipId: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async getPendingPromotionForStudent(
    organizationId: string,
    studentId: string,
  ) {
    return this.prisma.promotionRequest.findFirst({
      where: {
        organizationId,
        studentId,
        status: PromotionRequestStatus.PENDING_REVIEW,
      },
      select: {
        id: true,
      },
    });
  }

  async computePromotionSignals(
    organizationId: string,
    studentId: string,
  ): Promise<PromotionSignals> {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        joinedOrganizationAt: true,
        startedBjjAt: true,
        createdAt: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const lastApprovedPromotion = await this.prisma.promotionRequest.findFirst({
      where: {
        organizationId,
        studentId,
        status: PromotionRequestStatus.APPROVED,
      },
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        effectiveDate: true,
        createdAt: true,
      },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);

    const sinceDate =
      lastApprovedPromotion?.effectiveDate ??
      lastApprovedPromotion?.createdAt ??
      student.joinedOrganizationAt ??
      student.startedBjjAt ??
      student.createdAt;

    const [classesSinceLastPromotion, attendanceLast30Days, attendanceLast90Days, approvedPromotionCount] =
      await Promise.all([
        this.countRelevantAttendance(organizationId, studentId, sinceDate),
        this.countRelevantAttendance(organizationId, studentId, thirtyDaysAgo),
        this.countRelevantAttendance(organizationId, studentId, ninetyDaysAgo),
        this.prisma.promotionRequest.count({
          where: {
            organizationId,
            studentId,
            status: PromotionRequestStatus.APPROVED,
          },
        }),
      ]);

    return {
      classesSinceLastPromotion,
      attendanceLast30Days,
      attendanceLast90Days,
      daysSinceLastPromotion: sinceDate
        ? Math.floor((now.getTime() - sinceDate.getTime()) / 86400000)
        : null,
      approvedPromotionCount,
    };
  }

  async createPromotionRequestWithEvaluation(params: {
    organizationId: string;
    branchId: string;
    studentId: string;
    proposedByMembershipId: string;
    type: PromotionType;
    trackSnapshot: PromotionTrack;
    currentBeltSnapshot: PromotionRank | null;
    currentStripesSnapshot: number;
    targetBelt?: PromotionRank;
    targetStripes?: number;
    proposalNotes?: string;
    signals: PromotionSignals;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.acquirePromotionStudentLock(tx, {
          organizationId: params.organizationId,
          studentId: params.studentId,
        });

        const existingPending = await tx.promotionRequest.findFirst({
          where: {
            organizationId: params.organizationId,
            studentId: params.studentId,
            status: PromotionRequestStatus.PENDING_REVIEW,
          },
          select: {
            id: true,
          },
        });

        if (existingPending) {
          throw new ConflictException(
            'Student already has a pending promotion request',
          );
        }

        const promotionRequest = await tx.promotionRequest.create({
          data: {
            organizationId: params.organizationId,
            branchId: params.branchId,
            studentId: params.studentId,
            proposedByMembershipId: params.proposedByMembershipId,
            type: params.type,
            trackSnapshot: params.trackSnapshot,
            currentBeltSnapshot: params.currentBeltSnapshot,
            currentStripesSnapshot: params.currentStripesSnapshot,
            targetBelt: params.targetBelt,
            targetStripes: params.targetStripes,
            proposalNotes: params.proposalNotes,
            evaluation: {
              create: {
                organization: {
                  connect: {
                    id: params.organizationId,
                  },
                },
                classesSinceLastPromotion: params.signals.classesSinceLastPromotion,
                attendanceLast30Days: params.signals.attendanceLast30Days,
                attendanceLast90Days: params.signals.attendanceLast90Days,
                daysSinceLastPromotion: params.signals.daysSinceLastPromotion,
                approvedPromotionCount: params.signals.approvedPromotionCount,
                signalsComputedAt: new Date(),
              },
            },
          },
          select: promotionDetailSelect,
        });

        return promotionRequest;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async listPromotions(params: {
    organizationId: string;
    status?: PromotionRequestStatus;
    studentId?: string;
    branchIds?: string[];
    type?: PromotionType;
    track?: PromotionTrack;
    targetBelt?: PromotionRank;
    proposedByMembershipId?: string;
    reviewedByMembershipId?: string;
    dateFrom?: string;
    dateTo?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: params.organizationId,
      status: params.status,
      studentId: params.studentId,
      type: params.type,
      trackSnapshot: params.track,
      targetBelt: params.targetBelt,
      proposedByMembershipId: params.proposedByMembershipId,
      reviewedByMembershipId: params.reviewedByMembershipId,
      createdAt:
        params.dateFrom || params.dateTo
          ? {
              gte: params.dateFrom
                ? new Date(`${params.dateFrom}T00:00:00.000Z`)
                : undefined,
              lte: params.dateTo
                ? new Date(`${params.dateTo}T23:59:59.999Z`)
                : undefined,
            }
          : undefined,
      branchId: params.branchIds?.length
        ? {
            in: params.branchIds,
          }
        : undefined,
    } satisfies Prisma.PromotionRequestWhereInput;

    const [items, total] = await Promise.all([
      this.prisma.promotionRequest.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ createdAt: 'desc' }],
        select: promotionListSelect,
      }),
      this.prisma.promotionRequest.count({ where }),
    ]);

    return { items, total };
  }

  async getPromotionContextForStudent(
    organizationId: string,
    studentId: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        primaryBranchId: true,
        firstName: true,
        lastName: true,
        promotionTrack: true,
        currentBelt: true,
        currentStripes: true,
        startedBjjAt: true,
        joinedOrganizationAt: true,
        primaryBranch: {
          select: {
            id: true,
            organizationId: true,
            name: true,
            headCoachMembershipId: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const [
      lastApprovedPromotion,
      totalApprovedPromotions,
      currentPendingRequest,
      recentHistory,
    ] = await Promise.all([
      this.prisma.promotionRequest.findFirst({
        where: {
          organizationId,
          studentId,
          status: PromotionRequestStatus.APPROVED,
        },
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
        select: promotionHistorySummarySelect,
      }),
      this.prisma.promotionRequest.count({
        where: {
          organizationId,
          studentId,
          status: PromotionRequestStatus.APPROVED,
        },
      }),
      this.prisma.promotionRequest.findFirst({
        where: {
          organizationId,
          studentId,
          status: PromotionRequestStatus.PENDING_REVIEW,
        },
        orderBy: [{ createdAt: 'desc' }],
        select: pendingPromotionContextSelect,
      }),
      this.prisma.promotionRequest.findMany({
        where: {
          organizationId,
          studentId,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 5,
        select: promotionHistorySummarySelect,
      }),
    ]);

    return {
      student,
      lastApprovedPromotion,
      totalApprovedPromotions,
      currentPendingRequest,
      recentHistory,
    };
  }

  async getPromotionDetailForAccess(
    organizationId: string,
    promotionId: string,
  ) {
    const promotion = await this.prisma.promotionRequest.findFirst({
      where: {
        id: promotionId,
        organizationId,
      },
      select: promotionDetailSelect,
    });

    if (!promotion) {
      throw new NotFoundException('Promotion request not found');
    }

    return promotion;
  }

  async upsertPromotionEvaluation(params: {
    organizationId: string;
    promotionRequestId: string;
    updatedByMembershipId: string;
    signals: PromotionSignals;
    guardScore?: number;
    passingScore?: number;
    controlScore?: number;
    escapesDefenseScore?: number;
    submissionsScore?: number;
    tacticalUnderstandingScore?: number;
    attitudeDisciplineScore?: number;
    commitmentConsistencyScore?: number;
    teamworkRespectScore?: number;
    coachNotes?: string;
    recommendation?: PromotionRecommendation;
  }) {
    return this.prisma.promotionEvaluation.upsert({
      where: {
        promotionRequestId: params.promotionRequestId,
      },
      create: {
        organizationId: params.organizationId,
        promotionRequestId: params.promotionRequestId,
        updatedByMembershipId: params.updatedByMembershipId,
        classesSinceLastPromotion: params.signals.classesSinceLastPromotion,
        attendanceLast30Days: params.signals.attendanceLast30Days,
        attendanceLast90Days: params.signals.attendanceLast90Days,
        daysSinceLastPromotion: params.signals.daysSinceLastPromotion,
        approvedPromotionCount: params.signals.approvedPromotionCount,
        guardScore: params.guardScore,
        passingScore: params.passingScore,
        controlScore: params.controlScore,
        escapesDefenseScore: params.escapesDefenseScore,
        submissionsScore: params.submissionsScore,
        tacticalUnderstandingScore: params.tacticalUnderstandingScore,
        attitudeDisciplineScore: params.attitudeDisciplineScore,
        commitmentConsistencyScore: params.commitmentConsistencyScore,
        teamworkRespectScore: params.teamworkRespectScore,
        coachNotes: params.coachNotes,
        recommendation: params.recommendation,
        signalsComputedAt: new Date(),
      },
      update: {
        updatedByMembershipId: params.updatedByMembershipId,
        classesSinceLastPromotion: params.signals.classesSinceLastPromotion,
        attendanceLast30Days: params.signals.attendanceLast30Days,
        attendanceLast90Days: params.signals.attendanceLast90Days,
        daysSinceLastPromotion: params.signals.daysSinceLastPromotion,
        approvedPromotionCount: params.signals.approvedPromotionCount,
        guardScore: params.guardScore,
        passingScore: params.passingScore,
        controlScore: params.controlScore,
        escapesDefenseScore: params.escapesDefenseScore,
        submissionsScore: params.submissionsScore,
        tacticalUnderstandingScore: params.tacticalUnderstandingScore,
        attitudeDisciplineScore: params.attitudeDisciplineScore,
        commitmentConsistencyScore: params.commitmentConsistencyScore,
        teamworkRespectScore: params.teamworkRespectScore,
        coachNotes: params.coachNotes,
        recommendation: params.recommendation,
        signalsComputedAt: new Date(),
      },
      select: {
        id: true,
        recommendation: true,
        updatedAt: true,
      },
    });
  }

  async approvePromotionAndApplyToStudent(params: {
    organizationId: string;
    promotionId: string;
    studentId: string;
    reviewedByMembershipId: string;
    type: PromotionType;
    promotionTrack: PromotionTrack;
    targetBelt?: PromotionRank | null;
    targetStripes?: number | null;
    effectiveDate: Date;
    decisionNotes?: string;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.acquirePromotionStudentLock(tx, {
          organizationId: params.organizationId,
          studentId: params.studentId,
        });

        const currentPromotion = await tx.promotionRequest.findFirst({
          where: {
            id: params.promotionId,
            organizationId: params.organizationId,
          },
          select: {
            id: true,
            status: true,
          },
        });

        if (!currentPromotion) {
          throw new NotFoundException('Promotion request not found');
        }

        if (currentPromotion.status !== PromotionRequestStatus.PENDING_REVIEW) {
          throw new ConflictException(
            'Only pending promotion requests can be approved',
          );
        }

        await tx.student.update({
          where: {
            id: params.studentId,
          },
          data:
            params.type === PromotionType.BELT
              ? {
                  promotionTrack: params.promotionTrack,
                  currentBelt: params.targetBelt ?? undefined,
                  currentStripes: 0,
                }
              : {
                  currentStripes: params.targetStripes ?? undefined,
                },
        });

        await tx.promotionRequest.update({
          where: {
            id: params.promotionId,
          },
          data: {
            status: PromotionRequestStatus.APPROVED,
            reviewedByMembershipId: params.reviewedByMembershipId,
            effectiveDate: params.effectiveDate,
            decisionAt: new Date(),
            decisionNotes: params.decisionNotes,
            rejectionReason: null,
          },
        });

        return tx.promotionRequest.findFirst({
          where: {
            id: params.promotionId,
            organizationId: params.organizationId,
          },
          select: promotionDetailSelect,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async rejectPromotion(params: {
    organizationId: string;
    promotionId: string;
    studentId: string;
    reviewedByMembershipId: string;
    rejectionReason: string;
    decisionNotes?: string;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.acquirePromotionStudentLock(tx, {
          organizationId: params.organizationId,
          studentId: params.studentId,
        });

        const currentPromotion = await tx.promotionRequest.findFirst({
          where: {
            id: params.promotionId,
            organizationId: params.organizationId,
          },
          select: {
            id: true,
            status: true,
          },
        });

        if (!currentPromotion) {
          throw new NotFoundException('Promotion request not found');
        }

        if (currentPromotion.status !== PromotionRequestStatus.PENDING_REVIEW) {
          throw new ConflictException(
            'Only pending promotion requests can be rejected',
          );
        }

        await tx.promotionRequest.update({
          where: {
            id: params.promotionId,
          },
          data: {
            status: PromotionRequestStatus.REJECTED,
            reviewedByMembershipId: params.reviewedByMembershipId,
            decisionAt: new Date(),
            rejectionReason: params.rejectionReason,
            decisionNotes: params.decisionNotes,
          },
        });

        return tx.promotionRequest.findFirst({
          where: {
            id: params.promotionId,
            organizationId: params.organizationId,
          },
          select: promotionDetailSelect,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private async countRelevantAttendance(
    organizationId: string,
    studentId: string,
    sinceDate: Date,
  ) {
    return this.prisma.attendanceRecord.count({
      where: {
        organizationId,
        studentId,
        status: {
          in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE],
        },
        classSession: {
          deletedAt: null,
          scheduledDate: {
            gte: sinceDate,
          },
        },
      },
    });
  }

  private async acquirePromotionStudentLock(
    tx: TxClient,
    params: {
      organizationId: string;
      studentId: string;
    },
  ) {
    const lockKey = `org:${params.organizationId}:student:${params.studentId}:promotion`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${PROMOTION_STUDENT_LOCK_NAMESPACE}, hashtext(${lockKey}))`;
  }
}
