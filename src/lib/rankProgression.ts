export type GuildRankCode = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export type RankThreshold = {
  rank: GuildRankCode;
  label: string;
  minimumXp: number;
  examinationRequired: boolean;
  future?: boolean;
};

export const RANK_THRESHOLDS: RankThreshold[] = [
  { rank: 'F', label: 'F Rank', minimumXp: 0, examinationRequired: false },
  { rank: 'E', label: 'E Rank', minimumXp: 1000, examinationRequired: true },
  { rank: 'D', label: 'D Rank', minimumXp: 10000, examinationRequired: true },
  { rank: 'C', label: 'C Rank', minimumXp: 25000, examinationRequired: true },
  { rank: 'B', label: 'B Rank', minimumXp: 100000, examinationRequired: true },
  { rank: 'A', label: 'A Rank', minimumXp: Number.POSITIVE_INFINITY, examinationRequired: true, future: true },
  { rank: 'S', label: 'S Rank', minimumXp: Number.POSITIVE_INFINITY, examinationRequired: true, future: true },
  { rank: 'SS', label: 'SS Rank', minimumXp: Number.POSITIVE_INFINITY, examinationRequired: true, future: true },
  { rank: 'SSS', label: 'SSS Rank', minimumXp: Number.POSITIVE_INFINITY, examinationRequired: true, future: true },
];

export function getCurrentRankThreshold(rank?: string) {
  return RANK_THRESHOLDS.find((item) => item.rank === rank) || RANK_THRESHOLDS[0];
}

export function getNextRankThreshold(rank?: string) {
  const currentIndex = RANK_THRESHOLDS.findIndex((item) => item.rank === rank);
  const next = RANK_THRESHOLDS[currentIndex >= 0 ? currentIndex + 1 : 1];
  return next && Number.isFinite(next.minimumXp) ? next : undefined;
}

export function getRankProgress(rank: string | undefined, xp: number) {
  const current = getCurrentRankThreshold(rank);
  const next = getNextRankThreshold(current.rank);

  if (!next) {
    return {
      current,
      next: undefined,
      xp,
      xpIntoRank: Math.max(0, xp - current.minimumXp),
      xpToNext: 0,
      percent: 100,
      eligibleForExam: false,
    };
  }

  const span = Math.max(1, next.minimumXp - current.minimumXp);
  const xpIntoRank = Math.max(0, xp - current.minimumXp);
  const xpToNext = Math.max(0, next.minimumXp - xp);

  return {
    current,
    next,
    xp,
    xpIntoRank,
    xpToNext,
    percent: Math.min(100, Math.round((xpIntoRank / span) * 100)),
    eligibleForExam: xp >= next.minimumXp && next.examinationRequired,
  };
}

