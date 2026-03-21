import {
  PromotionRank,
  PromotionTrack,
} from '../../generated/prisma/enums';

export const ADULT_TRACK_MIN_AGE = 16;

type PromotionRankSpec = {
  code: PromotionRank;
  label: string;
  track: PromotionTrack;
  order: number;
  maxStripes: number;
};

const TRACK_LABELS: Record<PromotionTrack, string> = {
  [PromotionTrack.KIDS]: 'Kids',
  [PromotionTrack.ADULT]: 'Adult / Juvenile',
};

const PROMOTION_RANK_SPECS: PromotionRankSpec[] = [
  {
    code: PromotionRank.KIDS_WHITE,
    label: 'Kids White',
    track: PromotionTrack.KIDS,
    order: 10,
    maxStripes: 4,
  },
  {
    code: PromotionRank.KIDS_GREY_WHITE,
    label: 'Kids Grey/White',
    track: PromotionTrack.KIDS,
    order: 20,
    maxStripes: 4,
  },
  {
    code: PromotionRank.KIDS_GREY,
    label: 'Kids Grey',
    track: PromotionTrack.KIDS,
    order: 30,
    maxStripes: 4,
  },
  {
    code: PromotionRank.KIDS_GREY_BLACK,
    label: 'Kids Grey/Black',
    track: PromotionTrack.KIDS,
    order: 40,
    maxStripes: 4,
  },
  {
    code: PromotionRank.KIDS_YELLOW_WHITE,
    label: 'Kids Yellow/White',
    track: PromotionTrack.KIDS,
    order: 50,
    maxStripes: 4,
  },
  {
    code: PromotionRank.KIDS_YELLOW,
    label: 'Kids Yellow',
    track: PromotionTrack.KIDS,
    order: 60,
    maxStripes: 4,
  },
  {
    code: PromotionRank.KIDS_YELLOW_BLACK,
    label: 'Kids Yellow/Black',
    track: PromotionTrack.KIDS,
    order: 70,
    maxStripes: 4,
  },
  {
    code: PromotionRank.KIDS_ORANGE_WHITE,
    label: 'Kids Orange/White',
    track: PromotionTrack.KIDS,
    order: 80,
    maxStripes: 4,
  },
  {
    code: PromotionRank.KIDS_ORANGE,
    label: 'Kids Orange',
    track: PromotionTrack.KIDS,
    order: 90,
    maxStripes: 4,
  },
  {
    code: PromotionRank.KIDS_ORANGE_BLACK,
    label: 'Kids Orange/Black',
    track: PromotionTrack.KIDS,
    order: 100,
    maxStripes: 4,
  },
  {
    code: PromotionRank.KIDS_GREEN_WHITE,
    label: 'Kids Green/White',
    track: PromotionTrack.KIDS,
    order: 110,
    maxStripes: 4,
  },
  {
    code: PromotionRank.KIDS_GREEN,
    label: 'Kids Green',
    track: PromotionTrack.KIDS,
    order: 120,
    maxStripes: 4,
  },
  {
    code: PromotionRank.KIDS_GREEN_BLACK,
    label: 'Kids Green/Black',
    track: PromotionTrack.KIDS,
    order: 130,
    maxStripes: 4,
  },
  {
    code: PromotionRank.ADULT_WHITE,
    label: 'Adult White',
    track: PromotionTrack.ADULT,
    order: 10,
    maxStripes: 4,
  },
  {
    code: PromotionRank.ADULT_BLUE,
    label: 'Adult Blue',
    track: PromotionTrack.ADULT,
    order: 20,
    maxStripes: 4,
  },
  {
    code: PromotionRank.ADULT_PURPLE,
    label: 'Adult Purple',
    track: PromotionTrack.ADULT,
    order: 30,
    maxStripes: 4,
  },
  {
    code: PromotionRank.ADULT_BROWN,
    label: 'Adult Brown',
    track: PromotionTrack.ADULT,
    order: 40,
    maxStripes: 4,
  },
  {
    code: PromotionRank.ADULT_BLACK,
    label: 'Adult Black',
    track: PromotionTrack.ADULT,
    order: 50,
    maxStripes: 0,
  },
];

const RANK_SPEC_BY_CODE = new Map(
  PROMOTION_RANK_SPECS.map((spec) => [spec.code, spec] as const),
);

const INITIAL_RANK_BY_TRACK: Record<PromotionTrack, PromotionRank> = {
  [PromotionTrack.KIDS]: PromotionRank.KIDS_WHITE,
  [PromotionTrack.ADULT]: PromotionRank.ADULT_WHITE,
};

export function getPromotionTrackLabel(track: PromotionTrack) {
  return TRACK_LABELS[track];
}

export function getPromotionRankSpec(rank: PromotionRank) {
  return RANK_SPEC_BY_CODE.get(rank) ?? null;
}

export function getPromotionTrackForRank(rank: PromotionRank) {
  return getPromotionRankSpec(rank)?.track ?? null;
}

export function getPromotionRankLabel(rank: PromotionRank) {
  return getPromotionRankSpec(rank)?.label ?? null;
}

export function getInitialPromotionRank(track: PromotionTrack) {
  return INITIAL_RANK_BY_TRACK[track];
}

export function getNextPromotionRank(rank: PromotionRank) {
  const spec = getPromotionRankSpec(rank);

  if (!spec) {
    return null;
  }

  return (
    PROMOTION_RANK_SPECS.find(
      (candidate) =>
        candidate.track === spec.track && candidate.order === spec.order + 10,
    )?.code ?? null
  );
}

export function getMaxStripesForRank(rank: PromotionRank) {
  return getPromotionRankSpec(rank)?.maxStripes ?? 0;
}

export function listPromotionTrackCatalog() {
  return Object.values(PromotionTrack).map((track) => ({
    code: track,
    label: TRACK_LABELS[track],
    initialRank: getInitialPromotionRank(track),
    minAgeYears: track === PromotionTrack.ADULT ? ADULT_TRACK_MIN_AGE : null,
    maxAgeYears: track === PromotionTrack.KIDS ? ADULT_TRACK_MIN_AGE - 1 : null,
  }));
}

export function listPromotionRankCatalog() {
  return PROMOTION_RANK_SPECS.map((rank) => ({
    code: rank.code,
    label: rank.label,
    track: rank.track,
    trackLabel: TRACK_LABELS[rank.track],
    maxStripes: rank.maxStripes,
    order: rank.order,
    isInitialRank: getInitialPromotionRank(rank.track) === rank.code,
    isTerminalRank: getNextPromotionRank(rank.code) === null,
    nextValidRank: getNextPromotionRank(rank.code),
  }));
}

export function getAgeInYearsOnDate(
  dateOfBirth: Date | null | undefined,
  onDate: Date,
) {
  if (!dateOfBirth) {
    return null;
  }

  const years = onDate.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const beforeBirthday =
    onDate.getUTCMonth() < dateOfBirth.getUTCMonth() ||
    (onDate.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      onDate.getUTCDate() < dateOfBirth.getUTCDate());

  return beforeBirthday ? years - 1 : years;
}
