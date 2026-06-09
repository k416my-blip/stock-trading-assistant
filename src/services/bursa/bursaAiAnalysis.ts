/**
 * Bursa Phase 2 — 5年推移に基づく AI 判定（実データのみ）
 */
import type { AiGradeRank } from '../../types/aiStockReport';
import type { BursaDisclosureBundle } from '../../types/bursaDisclosure';
import { scoreToGrade } from '../aiRankingEngine';
import type { PartialDimensionScores } from '../aiRankingEngine';
import { computeBursaDimensionScores } from './bursaRankingMetrics';
import { buildBursaFiveYearTrend, type BursaFiveYearTrend } from './bursaTrendAnalysis';

export type BursaStarRating = 1 | 2 | 3 | 4 | 5;

export type BursaInvestmentType =
  | '超高配当'
  | '高配当'
  | '成長株'
  | '高成長株'
  | '景気敏感株'
  | 'ディフェンシブ株'
  | '割安株'
  | '成熟企業'
  | '注意企業';

export type BursaAiPhase2Analysis = {
  revenueGrowthStars: BursaStarRating | null;
  profitGrowthStars: BursaStarRating | null;
  dividendGrowthStars: BursaStarRating | null;
  financialHealthStars: BursaStarRating | null;
  overallRank: AiGradeRank | null;
  compositeScore: number | null;
  investmentType: BursaInvestmentType | null;
  judgmentReasons: string[];
  trend: BursaFiveYearTrend;
};

function countIncreases(values: (number | null)[]): number {
  let n = 0;
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1];
    const b = values[i];
    if (a != null && b != null && b > a) n++;
  }
  return n;
}

function starsFromIncreases(increases: number, totalPairs: number): BursaStarRating | null {
  if (totalPairs <= 0) return null;
  const ratio = increases / totalPairs;
  if (ratio >= 0.9) return 5;
  if (ratio >= 0.7) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
}

function starsFromRoeAndPayout(roe: (number | null)[], payout: (number | null)[]): BursaStarRating | null {
  const roeVals = roe.filter((v): v is number => v != null);
  if (roeVals.length === 0) return null;
  const avgRoe = roeVals.reduce((a, b) => a + b, 0) / roeVals.length;
  const latestPayout = [...payout].reverse().find((v) => v != null) ?? null;
  let score = 0;
  if (avgRoe >= 15) score += 2;
  else if (avgRoe >= 10) score += 1;
  if (latestPayout != null && latestPayout >= 40 && latestPayout <= 80) score += 1;
  if (avgRoe >= 12) score += 1;
  const stars = Math.min(5, Math.max(1, score + 1)) as BursaStarRating;
  return stars;
}

export function detectBursaInvestmentType(input: {
  sector: string | null;
  revenueIncreases: number;
  profitIncreases: number;
  dividendYieldPct: number | null;
  revenueDeclining: boolean;
  pe: number | null;
  peerMedianPe: number | null;
}): BursaInvestmentType | null {
  const sector = input.sector?.toLowerCase() ?? '';
  if (input.revenueDeclining && input.profitIncreases < 2) return '注意企業';
  if (input.dividendYieldPct != null && input.dividendYieldPct >= 6.5) return '超高配当';
  if (input.dividendYieldPct != null && input.dividendYieldPct >= 4.5) return '高配当';
  if (input.revenueIncreases >= 4 && input.profitIncreases >= 4) return '高成長株';
  if (input.revenueIncreases >= 3 && input.profitIncreases >= 3) return '成長株';
  if (
    input.pe != null &&
    input.peerMedianPe != null &&
    input.pe > 0 &&
    input.pe < input.peerMedianPe * 0.85
  ) {
    return '割安株';
  }
  if (/chemical|industrial|plantation|energy|oil|gas|mining|construction/.test(sector)) {
    return '景気敏感株';
  }
  if (/bank|utility|telecom|reit|consumer|healthcare/.test(sector)) return 'ディフェンシブ株';
  if (input.revenueIncreases >= 1 || input.profitIncreases >= 1) return '成熟企業';
  return '成熟企業';
}

function detectInvestmentType(input: {
  sector: string | null;
  revenueIncreases: number;
  profitIncreases: number;
  dividendYieldPct: number | null;
  revenueDeclining: boolean;
  pe?: number | null;
  peerMedianPe?: number | null;
}): BursaInvestmentType | null {
  return detectBursaInvestmentType({
    sector: input.sector,
    revenueIncreases: input.revenueIncreases,
    profitIncreases: input.profitIncreases,
    dividendYieldPct: input.dividendYieldPct,
    revenueDeclining: input.revenueDeclining,
    pe: input.pe ?? null,
    peerMedianPe: input.peerMedianPe ?? null,
  });
}

function buildReasons(input: {
  type: BursaInvestmentType | null;
  trend: BursaFiveYearTrend;
  revenueStars: BursaStarRating | null;
  profitStars: BursaStarRating | null;
  avgRoe: number | null;
}): string[] {
  if (!input.type) return [];
  const reasons: string[] = [];
  const revInc = countIncreases(input.trend.revenue);
  const epsInc = countIncreases(input.trend.eps);
  if (revInc >= 3) reasons.push(`売上${revInc}期連続増加`);
  else if (input.trend.revenue.some((v) => v != null)) reasons.push(`売上5年推移データ ${input.trend.years.length}年分`);
  if (epsInc >= 3) reasons.push('EPS右肩上がり');
  else if (input.trend.eps.some((v) => v != null)) reasons.push(`EPS推移あり（${epsInc}期増）`);
  if (input.avgRoe != null && input.avgRoe >= 15) reasons.push(`ROE ${input.avgRoe.toFixed(1)}%以上維持`);
  else if (input.profitStars != null && input.profitStars >= 4) reasons.push('利益成長が安定');
  if (reasons.length < 3 && input.revenueStars != null && input.revenueStars >= 4) {
    reasons.push('売上成長トレンド良好');
  }
  return reasons.slice(0, 3);
}

export function buildBursaAiPhase2Analysis(
  bundle: BursaDisclosureBundle,
  currentPrice: number | null,
  volume: number | null,
): BursaAiPhase2Analysis {
  const trend = buildBursaFiveYearTrend(bundle);
  const pairs = Math.max(0, trend.years.length - 1);

  const revenueIncreases = countIncreases(trend.revenue);
  const profitIncreases = countIncreases(trend.netProfit);
  const dividendIncreases = countIncreases(trend.dividend);

  const revenueGrowthStars = starsFromIncreases(revenueIncreases, pairs);
  const profitGrowthStars = starsFromIncreases(profitIncreases, pairs);
  const dividendGrowthStars = starsFromIncreases(dividendIncreases, pairs);
  const financialHealthStars = starsFromRoeAndPayout(trend.roePct, trend.dividendPayoutPct);

  const partial: PartialDimensionScores = computeBursaDimensionScores(bundle, currentPrice, volume);
  const { compositeScore } = (() => {
    const keys = ['growth', 'profitability', 'stability', 'value', 'dividendAppeal'] as const;
    let w = 0;
    let s = 0;
    for (const k of keys) {
      const v = partial[k];
      if (v != null) {
        s += v * 0.2;
        w += 0.2;
      }
    }
    return { compositeScore: w > 0 ? Math.round(s / w) : null };
  })();

  const overallRank = compositeScore != null ? scoreToGrade(compositeScore) : null;

  const revVals = trend.revenue.filter((v): v is number => v != null);
  const revenueDeclining =
    revVals.length >= 2 && revVals[revVals.length - 1] < revVals[revVals.length - 2];

  const investmentType = detectInvestmentType({
    sector: bundle.profile.sector,
    revenueIncreases,
    profitIncreases,
    dividendYieldPct: bundle.profile.dividendYieldPct,
    revenueDeclining,
  });

  const roeVals = trend.roePct.filter((v): v is number => v != null);
  const avgRoe = roeVals.length > 0 ? roeVals.reduce((a, b) => a + b, 0) / roeVals.length : null;

  return {
    revenueGrowthStars,
    profitGrowthStars,
    dividendGrowthStars,
    financialHealthStars,
    overallRank,
    compositeScore,
    investmentType,
    judgmentReasons: buildReasons({
      type: investmentType,
      trend,
      revenueStars: revenueGrowthStars,
      profitStars: profitGrowthStars,
      avgRoe,
    }),
    trend,
  };
}

export function starsLabel(stars: BursaStarRating | null): string {
  if (stars == null) return 'データ未取得';
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}
