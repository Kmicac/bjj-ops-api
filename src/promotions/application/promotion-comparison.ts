import {
  PromotionRank,
  PromotionRequestStatus,
  PromotionTrack,
  PromotionType,
} from '../../generated/prisma/enums';
import {
  getPromotionRankLabel,
  getPromotionTrackForRank,
  getPromotionTrackLabel,
} from '../domain/promotion-rank-catalog';

export type ComparablePromotionState = {
  track: PromotionTrack;
  trackLabel: string;
  belt: PromotionRank | null;
  beltLabel: string | null;
  stripes: number;
};

type ComparablePromotionRequest = {
  type: PromotionType;
  status?: PromotionRequestStatus;
  trackSnapshot: PromotionTrack;
  currentBeltSnapshot: PromotionRank | null;
  currentStripesSnapshot: number;
  targetBelt: PromotionRank | null;
  targetStripes: number | null;
};

export function buildComparablePromotionState(input: {
  track: PromotionTrack;
  belt: PromotionRank | null;
  stripes: number;
}): ComparablePromotionState {
  return {
    track: input.track,
    trackLabel: getPromotionTrackLabel(input.track),
    belt: input.belt,
    beltLabel: input.belt ? getPromotionRankLabel(input.belt) : null,
    stripes: input.stripes,
  };
}

export function buildResultingStateFromPromotion(
  promotion: ComparablePromotionRequest,
): ComparablePromotionState {
  if (promotion.type === PromotionType.BELT) {
    if (!promotion.targetBelt) {
      return buildComparablePromotionState({
        track: promotion.trackSnapshot,
        belt: promotion.currentBeltSnapshot,
        stripes: 0,
      });
    }

    return buildComparablePromotionState({
      track:
        getPromotionTrackForRank(promotion.targetBelt) ?? promotion.trackSnapshot,
      belt: promotion.targetBelt,
      stripes: 0,
    });
  }

  return buildComparablePromotionState({
    track: promotion.trackSnapshot,
    belt: promotion.currentBeltSnapshot,
    stripes: promotion.targetStripes ?? 0,
  });
}

export function buildPromotionStateDelta(
  baseline: ComparablePromotionState,
  next: ComparablePromotionState,
) {
  return {
    changesTrack: baseline.track !== next.track,
    changesBelt: baseline.belt !== next.belt,
    changesStripes: baseline.stripes !== next.stripes,
  };
}

export function buildPendingPromotionComparisonSummary(params: {
  status: PromotionRequestStatus;
  type: PromotionType;
  trackSnapshot: PromotionTrack;
  currentBeltSnapshot: PromotionRank | null;
  currentStripesSnapshot: number;
  targetBelt: PromotionRank | null;
  targetStripes: number | null;
  student: {
    promotionTrack: PromotionTrack;
    currentBelt: PromotionRank | null;
    currentStripes: number;
  };
}) {
  if (params.status !== PromotionRequestStatus.PENDING_REVIEW) {
    return null;
  }

  const fromSnapshot = buildComparablePromotionState({
    track: params.trackSnapshot,
    belt: params.currentBeltSnapshot,
    stripes: params.currentStripesSnapshot,
  });
  const currentState = buildComparablePromotionState({
    track: params.student.promotionTrack,
    belt: params.student.currentBelt,
    stripes: params.student.currentStripes,
  });
  const requestedState = buildResultingStateFromPromotion(params);
  const snapshotVsCurrent = buildPromotionStateDelta(fromSnapshot, currentState);
  const requestedVsCurrent = buildPromotionStateDelta(currentState, requestedState);

  return {
    fromSnapshot,
    currentState,
    requestedState,
    snapshotOutOfDate:
      snapshotVsCurrent.changesTrack ||
      snapshotVsCurrent.changesBelt ||
      snapshotVsCurrent.changesStripes,
    deltas: {
      snapshotVsCurrent,
      requestedVsCurrent,
    },
  };
}
