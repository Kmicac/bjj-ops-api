import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import {
  buildComparablePromotionState,
  buildPromotionStateDelta,
  buildResultingStateFromPromotion,
} from '../promotion-comparison';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';

@Injectable()
export class GetStudentPromotionContextUseCase {
  constructor(
    private readonly promotionsPolicy: PromotionsPolicy,
    private readonly promotionsRepository: PromotionsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    studentId: string,
  ) {
    const context = await this.promotionsRepository.getPromotionContextForStudent(
      organizationId,
      studentId,
    );

    this.promotionsPolicy.ensureCanViewStudentContext(
      principal,
      organizationId,
      context.student.primaryBranch,
    );

    const signals = await this.promotionsRepository.computePromotionSignals(
      organizationId,
      studentId,
    );
    const currentState = buildComparablePromotionState({
      track: context.student.promotionTrack,
      belt: context.student.currentBelt,
      stripes: context.student.currentStripes,
    });
    const lastApprovedResult = context.lastApprovedPromotion
      ? buildResultingStateFromPromotion(context.lastApprovedPromotion)
      : null;
    const pendingRequestedState = context.currentPendingRequest
      ? buildResultingStateFromPromotion(context.currentPendingRequest)
      : null;

    return {
      student: {
        studentId: context.student.id,
        firstName: context.student.firstName,
        lastName: context.student.lastName,
        branch: {
          id: context.student.primaryBranch.id,
          name: context.student.primaryBranch.name,
        },
        promotionTrack: context.student.promotionTrack,
        currentBelt: context.student.currentBelt,
        currentStripes: context.student.currentStripes,
        startedBjjAt: context.student.startedBjjAt,
        joinedOrganizationAt: context.student.joinedOrganizationAt,
        daysSinceLastApprovedPromotion: context.lastApprovedPromotion
          ? signals.daysSinceLastPromotion
          : null,
      },
      history: {
        lastApprovedPromotion: context.lastApprovedPromotion,
        totalApprovedPromotions: context.totalApprovedPromotions,
        currentPendingRequest: context.currentPendingRequest
          ? {
              id: context.currentPendingRequest.id,
              type: context.currentPendingRequest.type,
              status: context.currentPendingRequest.status,
              trackSnapshot: context.currentPendingRequest.trackSnapshot,
              targetBelt: context.currentPendingRequest.targetBelt,
              targetStripes: context.currentPendingRequest.targetStripes,
              createdAt: context.currentPendingRequest.createdAt,
            }
          : null,
        recentHistory: context.recentHistory,
      },
      signals: {
        classesSinceLastPromotion: signals.classesSinceLastPromotion,
        attendanceLast30Days: signals.attendanceLast30Days,
        attendanceLast90Days: signals.attendanceLast90Days,
        daysSinceLastPromotion: signals.daysSinceLastPromotion,
        recentActivity: {
          attendanceLast30Days: signals.attendanceLast30Days,
          attendanceLast90Days: signals.attendanceLast90Days,
        },
      },
      comparison: {
        currentState,
        lastApprovedPromotion: context.lastApprovedPromotion
          ? {
              promotionId: context.lastApprovedPromotion.id,
              type: context.lastApprovedPromotion.type,
              effectiveDate: context.lastApprovedPromotion.effectiveDate,
              decisionAt: context.lastApprovedPromotion.decisionAt,
              resultingState: lastApprovedResult,
            }
          : null,
        pendingRequest: context.currentPendingRequest
          ? {
              promotionId: context.currentPendingRequest.id,
              type: context.currentPendingRequest.type,
              status: context.currentPendingRequest.status,
              createdAt: context.currentPendingRequest.createdAt,
              fromSnapshot: buildComparablePromotionState({
                track: context.currentPendingRequest.trackSnapshot,
                belt: context.currentPendingRequest.currentBeltSnapshot,
                stripes: context.currentPendingRequest.currentStripesSnapshot,
              }),
              requestedState: pendingRequestedState,
            }
          : null,
        deltas: {
          currentVsLastApproved:
            lastApprovedResult === null
              ? null
              : buildPromotionStateDelta(currentState, lastApprovedResult),
          pendingVsCurrent:
            pendingRequestedState === null
              ? null
              : buildPromotionStateDelta(currentState, pendingRequestedState),
          pendingVsLastApproved:
            pendingRequestedState === null || lastApprovedResult === null
              ? null
              : buildPromotionStateDelta(lastApprovedResult, pendingRequestedState),
        },
      },
      evaluation: context.currentPendingRequest?.evaluation ?? null,
      competitionSummary: null,
    };
  }
}
