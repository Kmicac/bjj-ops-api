import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { AccessControlService } from '../../auth/access-control.service';
import type { AuthenticatedPrincipal } from '../../auth/authenticated-principal.interface';
import {
  MembershipRole,
  MembershipScopeType,
  PromotionRank,
  PromotionRecommendation,
  PromotionRequestStatus,
  PromotionTrack,
  PromotionType,
} from '../../generated/prisma/enums';
import { CreatePromotionRequestDto } from '../dto/create-promotion-request.dto';
import {
  ADULT_TRACK_MIN_AGE,
  getAgeInYearsOnDate,
  getInitialPromotionRank,
  getMaxStripesForRank,
  getNextPromotionRank,
  getPromotionTrackForRank,
} from './promotion-rank-catalog';

type BranchAccessTarget = {
  id: string;
  organizationId: string;
  headCoachMembershipId: string | null;
};

type StudentPromotionState = {
  promotionTrack: PromotionTrack;
  dateOfBirth: Date | null;
  startedBjjAt: Date | null;
  joinedOrganizationAt: Date | null;
  currentBelt: PromotionRank | null;
  currentStripes: number;
};

type PromotionAccessTarget = {
  id: string;
  branch: BranchAccessTarget;
  type: PromotionType;
  status: PromotionRequestStatus;
  trackSnapshot: PromotionTrack;
  currentBeltSnapshot: PromotionRank | null;
  currentStripesSnapshot: number;
  targetBelt: PromotionRank | null;
  targetStripes: number | null;
  evaluation: {
    recommendation: PromotionRecommendation | null;
  } | null;
  student: StudentPromotionState;
};

const ROLE_RANK: Record<MembershipRole, number> = {
  [MembershipRole.MESTRE]: 70,
  [MembershipRole.ORG_ADMIN]: 60,
  [MembershipRole.ACADEMY_MANAGER]: 50,
  [MembershipRole.HEAD_COACH]: 40,
  [MembershipRole.INSTRUCTOR]: 30,
  [MembershipRole.STAFF]: 20,
  [MembershipRole.STUDENT]: 10,
};

@Injectable()
export class PromotionsPolicy {
  constructor(private readonly accessControl: AccessControlService) {}

  ensureCanPropose(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureInstructorBranchAccess(principal, organizationId, branch);
  }

  ensureCanList(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget | null,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);

    if (branch) {
      this.ensureInstructorBranchAccess(principal, organizationId, branch);
      return;
    }

    if (
      this.getHighestAssignedRoleRank(principal.assignedRoles) <
      ROLE_RANK[MembershipRole.INSTRUCTOR]
    ) {
      throw new ForbiddenException('Insufficient organization role');
    }
  }

  ensureCanRead(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    promotion: PromotionAccessTarget,
  ) {
    this.ensureInstructorBranchAccess(principal, organizationId, promotion.branch);
  }

  ensureCanEditEvaluation(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    promotion: PromotionAccessTarget,
  ) {
    this.ensurePendingPromotion(promotion);
    this.ensureInstructorBranchAccess(principal, organizationId, promotion.branch);
  }

  ensureCanApprove(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    promotion: PromotionAccessTarget,
  ) {
    this.ensurePendingPromotion(promotion);

    if (promotion.type === PromotionType.STRIPE) {
      this.accessControl.ensureBranchAccess(
        principal,
        promotion.branch,
        MembershipRole.HEAD_COACH,
      );
      return;
    }

    this.ensureSensitivePromotionApprover(principal, organizationId);
  }

  ensureCanReject(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    promotion: PromotionAccessTarget,
  ) {
    this.ensureCanApprove(principal, organizationId, promotion);
  }

  ensureValidRequestedPromotion(
    dto: CreatePromotionRequestDto,
    student: StudentPromotionState,
    referenceDate = new Date(),
  ) {
    this.ensureStudentTrackCompatibility(student.promotionTrack, student.dateOfBirth, referenceDate);
    this.ensureStudentRankState(student);

    if (dto.type === PromotionType.BELT) {
      this.ensureValidBeltPromotionRequest(
        student,
        dto.targetBelt ?? null,
        dto.targetStripes,
        referenceDate,
      );
      return;
    }

    this.ensureValidStripePromotionRequest(
      student,
      dto.targetBelt,
      dto.targetStripes,
    );
  }

  ensureNoPendingPromotionConflict(existingPromotion: { id: string } | null) {
    if (existingPromotion) {
      throw new ConflictException(
        'Student already has a pending promotion request',
      );
    }
  }

  ensureEvaluationSupportsApproval(promotion: PromotionAccessTarget) {
    const recommendation = promotion.evaluation?.recommendation;

    if (!recommendation) {
      throw new ConflictException(
        'A promotion evaluation with recommendation is required before approval',
      );
    }

    if (
      recommendation !== PromotionRecommendation.RECOMMEND &&
      recommendation !== PromotionRecommendation.STRONGLY_RECOMMEND
    ) {
      throw new ConflictException(
        'Promotion evaluation recommendation does not support approval',
      );
    }
  }

  buildApprovedStudentState(
    promotion: PromotionAccessTarget,
    effectiveDate: Date,
  ) {
    this.ensurePromotionSnapshotMatchesStudentState(promotion);
    this.ensureStudentTimelineCompatibility(promotion.student, effectiveDate);
    this.ensureValidExistingPromotionTarget(promotion, effectiveDate);

    if (promotion.type === PromotionType.BELT) {
      if (!promotion.targetBelt) {
        throw new ConflictException('Belt promotion target is required');
      }

      const nextTrack = getPromotionTrackForRank(promotion.targetBelt);

      if (!nextTrack) {
        throw new ConflictException('Promotion target belt is invalid');
      }

      return {
        promotionTrack: nextTrack,
        currentBelt: promotion.targetBelt,
        currentStripes: 0,
      };
    }

    if (promotion.targetStripes === null) {
      throw new ConflictException('Stripe promotion target is required');
    }

    return {
      promotionTrack: promotion.student.promotionTrack,
      currentBelt: promotion.student.currentBelt,
      currentStripes: promotion.targetStripes,
    };
  }

  private ensurePendingPromotion(promotion: PromotionAccessTarget) {
    if (promotion.status !== PromotionRequestStatus.PENDING_REVIEW) {
      throw new ConflictException(
        'Only pending promotion requests can be modified',
      );
    }
  }

  private ensureSensitivePromotionApprover(
    principal: AuthenticatedPrincipal,
    organizationId: string,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);

    if (principal.scopeType !== MembershipScopeType.ORGANIZATION_WIDE) {
      throw new ForbiddenException(
        'Organization-wide scope is required for sensitive promotion approval',
      );
    }

    if (
      this.getHighestAssignedRoleRank(principal.assignedRoles) <
      ROLE_RANK[MembershipRole.ORG_ADMIN]
    ) {
      throw new ForbiddenException('Insufficient organization role');
    }
  }

  private ensureInstructorBranchAccess(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);
    this.accessControl.ensureBranchAccess(
      principal,
      branch,
      MembershipRole.INSTRUCTOR,
    );
  }

  private getHighestAssignedRoleRank(roles: MembershipRole[]) {
    if (!roles.length) {
      return 0;
    }

    const highestRole = [...roles].sort(
      (left, right) => ROLE_RANK[right] - ROLE_RANK[left],
    )[0];

    return ROLE_RANK[highestRole];
  }

  private ensureStudentTrackCompatibility(
    track: PromotionTrack,
    dateOfBirth: Date | null,
    referenceDate: Date,
  ) {
    const age = getAgeInYearsOnDate(dateOfBirth, referenceDate);

    if (age === null) {
      return;
    }

    if (track === PromotionTrack.KIDS && age >= ADULT_TRACK_MIN_AGE) {
      throw new ConflictException(
        'Students aged 16 or older must use the ADULT promotion track',
      );
    }

    if (track === PromotionTrack.ADULT && age < ADULT_TRACK_MIN_AGE) {
      throw new ConflictException(
        'Students under 16 must use the KIDS promotion track',
      );
    }
  }

  private ensureStudentRankState(student: StudentPromotionState) {
    if (!student.currentBelt) {
      if (student.currentStripes !== 0) {
        throw new ConflictException(
          'Students without a current belt cannot have stripes',
        );
      }

      return;
    }

    const beltTrack = getPromotionTrackForRank(student.currentBelt);

    if (!beltTrack || beltTrack !== student.promotionTrack) {
      throw new ConflictException(
        'Student current belt does not match the current promotion track',
      );
    }

    const maxStripes = getMaxStripesForRank(student.currentBelt);

    if (student.currentStripes < 0 || student.currentStripes > maxStripes) {
      throw new ConflictException(
        'Student stripe count exceeds the limit for the current belt',
      );
    }
  }

  private ensureValidBeltPromotionRequest(
    student: StudentPromotionState,
    targetBelt: PromotionRank | null,
    targetStripes: number | undefined,
    referenceDate: Date,
  ) {
    if (!targetBelt) {
      throw new ConflictException('targetBelt is required for belt promotions');
    }

    if (targetStripes !== undefined) {
      throw new ConflictException(
        'targetStripes must not be provided for belt promotions',
      );
    }

    if (student.currentBelt === targetBelt) {
      throw new ConflictException(
        'targetBelt must be different from the current belt',
      );
    }

    const targetTrack = getPromotionTrackForRank(targetBelt);

    if (!targetTrack) {
      throw new ConflictException('targetBelt is invalid');
    }

    if (targetTrack === student.promotionTrack) {
      if (!student.currentBelt) {
        if (targetBelt !== getInitialPromotionRank(student.promotionTrack)) {
          throw new ConflictException(
            'Initial belt promotion must start at the first rank of the student track',
          );
        }

        return;
      }

      const nextRank = getNextPromotionRank(student.currentBelt);

      if (!nextRank || nextRank !== targetBelt) {
        throw new ConflictException(
          'Belt promotion must advance to the next valid rank in the same track',
        );
      }

      return;
    }

    if (
      student.promotionTrack === PromotionTrack.KIDS &&
      targetTrack === PromotionTrack.ADULT
    ) {
      this.ensureStudentTrackCompatibility(
        PromotionTrack.ADULT,
        student.dateOfBirth,
        referenceDate,
      );

      if (targetBelt !== PromotionRank.ADULT_WHITE) {
        throw new ConflictException(
          'KIDS to ADULT transition must start at ADULT_WHITE',
        );
      }

      return;
    }

    throw new ConflictException(
      'targetBelt does not belong to a valid promotion track progression',
    );
  }

  private ensureValidStripePromotionRequest(
    student: StudentPromotionState,
    targetBelt: PromotionRank | undefined,
    targetStripes: number | undefined,
  ) {
    if (targetBelt !== undefined) {
      throw new ConflictException(
        'targetBelt must not be provided for stripe promotions',
      );
    }

    if (targetStripes === undefined) {
      throw new ConflictException(
        'targetStripes is required for stripe promotions',
      );
    }

    if (!student.currentBelt) {
      throw new ConflictException(
        'Stripe promotions require a current belt',
      );
    }

    const maxStripes = getMaxStripesForRank(student.currentBelt);

    if (maxStripes <= 0) {
      throw new ConflictException(
        'The current belt does not support stripe promotions in this phase',
      );
    }

    if (targetStripes !== student.currentStripes + 1) {
      throw new ConflictException(
        'Stripe promotions must advance exactly one stripe at a time',
      );
    }

    if (targetStripes > maxStripes) {
      throw new ConflictException(
        'targetStripes exceeds the limit for the current belt',
      );
    }
  }

  private ensurePromotionSnapshotMatchesStudentState(
    promotion: PromotionAccessTarget,
  ) {
    if (promotion.trackSnapshot !== promotion.student.promotionTrack) {
      throw new ConflictException(
        'The student promotion track changed after the promotion was proposed',
      );
    }

    if (promotion.currentBeltSnapshot !== promotion.student.currentBelt) {
      throw new ConflictException(
        'The student current belt changed after the promotion was proposed',
      );
    }

    if (
      promotion.currentStripesSnapshot !== promotion.student.currentStripes
    ) {
      throw new ConflictException(
        'The student current stripes changed after the promotion was proposed',
      );
    }
  }

  private ensureStudentTimelineCompatibility(
    student: StudentPromotionState,
    effectiveDate: Date,
  ) {
    if (student.startedBjjAt && effectiveDate < student.startedBjjAt) {
      throw new ConflictException(
        'effectiveDate cannot be earlier than the student startedBjjAt date',
      );
    }

    if (
      student.joinedOrganizationAt &&
      effectiveDate < student.joinedOrganizationAt
    ) {
      throw new ConflictException(
        'effectiveDate cannot be earlier than the student joinedOrganizationAt date',
      );
    }
  }

  private ensureValidExistingPromotionTarget(
    promotion: PromotionAccessTarget,
    effectiveDate: Date,
  ) {
    this.ensureValidRequestedPromotion(
      {
        type: promotion.type,
        targetBelt: promotion.targetBelt ?? undefined,
        targetStripes: promotion.targetStripes ?? undefined,
        proposalNotes: undefined,
      },
      promotion.student,
      effectiveDate,
    );
  }
}
