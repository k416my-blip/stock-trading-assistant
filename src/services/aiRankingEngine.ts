/**
 * AI四季報 総合スコア計算（実データのみ）
 */
import type { AiDimensionScores, AiGradeRank } from '../types/aiStockReport';

export const AI_RANKING_WEIGHTS = {
  growth: 0.2,
  profitability: 0.2,
  stability: 0.2,
  value: 0.2,
  dividendAppeal: 0.2,
} as const;

export const AI_RANK_THRESHOLDS: { rank: AiGradeRank; minScore: number }[] = [
  { rank: 'S', minScore: 85 },
  { rank: 'A', minScore: 70 },
  { rank: 'B', minScore: 55 },
  { rank: 'C', minScore: 40 },
  { rank: 'D', minScore: 0 },
];

export type RealMetricInput = {
  per: number | null;
  dividendYieldPct: number | null;
  marketCap: number | null;
  volume: number | null;
  revenueGrowthPct: number | null;
  profitMarginPct: number | null;
};

export type PartialDimensionScores = {
  growth: number | null;
  profitability: number | null;
  stability: number | null;
  value: number | null;
  dividendAppeal: number | null;
};

export type DimensionAvailability = Record<keyof AiDimensionScores, boolean>;

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreToGrade(score: number): AiGradeRank {
  for (const { rank, minScore } of AI_RANK_THRESHOLDS) {
    if (score >= minScore) return rank;
  }
  return 'D';
}

export function computeDimensionScoresFromRealData(
  metrics: RealMetricInput,
): PartialDimensionScores {
  let growth: number | null = null;
  if (metrics.revenueGrowthPct != null) {
    growth = clampScore(50 + metrics.revenueGrowthPct * 2);
  }

  let profitability: number | null = null;
  if (metrics.profitMarginPct != null) {
    profitability = clampScore(metrics.profitMarginPct * 2.5 + 20);
  } else if (metrics.per != null && metrics.per > 0) {
    profitability = clampScore(120 - metrics.per * 4);
  }

  let stability: number | null = null;
  const capScore =
    metrics.marketCap != null ? clampScore(Math.log10(metrics.marketCap + 1) * 12) : null;
  const volScore =
    metrics.volume != null ? clampScore(Math.log10(metrics.volume + 1) * 10 - 20) : null;
  if (capScore != null && volScore != null) {
    stability = clampScore(capScore * 0.6 + volScore * 0.4);
  } else if (capScore != null) {
    stability = capScore;
  } else if (volScore != null) {
    stability = volScore;
  }

  let value: number | null = null;
  if (metrics.per != null && metrics.per > 0) {
    value = clampScore(110 - metrics.per * 4);
  }

  let dividendAppeal: number | null = null;
  if (metrics.dividendYieldPct != null) {
    dividendAppeal = clampScore(metrics.dividendYieldPct * 12);
  }

  return { growth, profitability, stability, value, dividendAppeal };
}

export function dimensionAvailability(scores: PartialDimensionScores): DimensionAvailability {
  return {
    growth: scores.growth != null,
    profitability: scores.profitability != null,
    stability: scores.stability != null,
    value: scores.value != null,
    dividendAppeal: scores.dividendAppeal != null,
  };
}

export function computeCompositeFromPartial(scores: PartialDimensionScores): {
  compositeScore: number | null;
  displayScores: AiDimensionScores;
  availability: DimensionAvailability;
} {
  const availability = dimensionAvailability(scores);
  const keys = Object.keys(AI_RANKING_WEIGHTS) as (keyof AiDimensionScores)[];
  let weightSum = 0;
  let weighted = 0;

  for (const k of keys) {
    const v = scores[k];
    if (v != null) {
      weighted += v * AI_RANKING_WEIGHTS[k];
      weightSum += AI_RANKING_WEIGHTS[k];
    }
  }

  const displayScores: AiDimensionScores = {
    growth: scores.growth ?? 0,
    profitability: scores.profitability ?? 0,
    stability: scores.stability ?? 0,
    value: scores.value ?? 0,
    dividendAppeal: scores.dividendAppeal ?? 0,
  };

  if (weightSum <= 0) {
    return { compositeScore: null, displayScores, availability };
  }

  return {
    compositeScore: clampScore(weighted / weightSum),
    displayScores,
    availability,
  };
}

export function computeSubGradesFromPartial(scores: PartialDimensionScores): {
  dividend: AiGradeRank | null;
  financial: AiGradeRank | null;
  risk: AiGradeRank | null;
  businessStability: AiGradeRank | null;
  competitive: AiGradeRank | null;
} {
  const riskBase =
    scores.stability != null && scores.profitability != null
      ? clampScore(scores.stability * 0.55 + scores.profitability * 0.45)
      : scores.stability;
  const competitiveBase =
    scores.growth != null && scores.profitability != null && scores.value != null
      ? clampScore(scores.growth * 0.35 + scores.profitability * 0.35 + scores.value * 0.3)
      : null;

  return {
    dividend: scores.dividendAppeal != null ? scoreToGrade(scores.dividendAppeal) : null,
    financial: scores.profitability != null ? scoreToGrade(scores.profitability) : null,
    risk: riskBase != null ? scoreToGrade(riskBase) : null,
    businessStability: scores.stability != null ? scoreToGrade(scores.stability) : null,
    competitive: competitiveBase != null ? scoreToGrade(competitiveBase) : null,
  };
}
