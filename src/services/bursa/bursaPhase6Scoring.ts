/**
 * Bursa Phase 6 — 銘柄スコアリング（6次元統合）
 */
import type { BursaDisclosureBundle, BursaPeerSnapshot } from '../../types/bursaDisclosure';
import type { PartialDimensionScores } from '../aiRankingEngine';
import { computeBursaDimensionScores, extractBursaDerivedMetrics } from './bursaRankingMetrics';
import { rankAmongPeers } from './bursaPeerComparison';
import { getSectorPeerCodes } from './bursaSectorPeers';
import type { BursaInvestmentStyleId } from './bursaStockUniverse';

export type BursaStockScoreBreakdown = PartialDimensionScores & {
  competitiveAdvantage: number | null;
};

export type BursaScoredStock = {
  stockCode: string;
  companyName: string | null;
  sector: string | null;
  compositeScore: number | null;
  breakdown: BursaStockScoreBreakdown;
  dividendYieldPct: number | null;
  marketCap: number | null;
  currentPrice: number | null;
  dataStatus: 'ok' | 'partial' | 'failed';
};

const PHASE6_WEIGHTS = {
  growth: 0.17,
  profitability: 0.17,
  stability: 0.17,
  value: 0.17,
  dividendAppeal: 0.16,
  competitiveAdvantage: 0.16,
} as const;

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeCompetitiveAdvantageScore(
  stockCode: string,
  snapshots: BursaPeerSnapshot[],
  sector: string | null,
): number | null {
  const peerCodes = new Set(getSectorPeerCodes(sector, stockCode));
  const sectorSnaps = snapshots.filter(
    (s) => peerCodes.has(s.stockCode) && s.status !== 'failed',
  );
  if (sectorSnaps.length < 2) return null;

  const keys = ['marketCap', 'netProfit', 'roePct', 'dividendYieldPct'] as const;
  const percentiles: number[] = [];
  for (const key of keys) {
    const { rank, peerCount } = rankAmongPeers(stockCode, sectorSnaps, key);
    if (rank != null && peerCount > 0) {
      percentiles.push(((peerCount - rank + 1) / peerCount) * 100);
    }
  }
  if (percentiles.length === 0) return null;
  return clampScore(percentiles.reduce((a, b) => a + b, 0) / percentiles.length);
}

export function computePhase6CompositeScore(breakdown: BursaStockScoreBreakdown): number | null {
  let weighted = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(PHASE6_WEIGHTS) as [
    keyof typeof PHASE6_WEIGHTS,
    number,
  ][]) {
    const v = breakdown[key];
    if (v != null && Number.isFinite(v)) {
      weighted += v * weight;
      weightSum += weight;
    }
  }
  if (weightSum <= 0) return null;
  return clampScore(weighted / weightSum);
}

export function scoreBursaStock(input: {
  bundle: BursaDisclosureBundle;
  allSnapshots: BursaPeerSnapshot[];
  currentPrice?: number | null;
  volume?: number | null;
}): BursaScoredStock {
  const { bundle, allSnapshots } = input;
  const derived = extractBursaDerivedMetrics(bundle, input.currentPrice ?? null);
  const partial = computeBursaDimensionScores(bundle, derived.price, input.volume ?? null);

  const competitiveAdvantage = computeCompetitiveAdvantageScore(
    bundle.stockCode,
    allSnapshots,
    bundle.profile.sector,
  );

  const breakdown: BursaStockScoreBreakdown = {
    ...partial,
    competitiveAdvantage,
  };

  const compositeScore = computePhase6CompositeScore(breakdown);

  const dataStatus: BursaScoredStock['dataStatus'] =
    bundle.dataSource === 'none'
      ? 'failed'
      : compositeScore != null
        ? 'ok'
        : 'partial';

  return {
    stockCode: bundle.stockCode,
    companyName: bundle.profile.companyName,
    sector: bundle.profile.sector,
    compositeScore,
    breakdown,
    dividendYieldPct: derived.dividendYieldPct ?? bundle.profile.dividendYieldPct,
    marketCap: derived.marketCap ?? bundle.profile.marketCap,
    currentPrice: derived.price,
    dataStatus,
  };
}

export function styleSortKey(
  style: BursaInvestmentStyleId,
  stock: BursaScoredStock,
): number | null {
  const b = stock.breakdown;
  switch (style) {
    case 'composite':
      return stock.compositeScore;
    case 'dividend':
      return b.dividendAppeal;
    case 'growth':
      return b.growth;
    case 'value':
      return b.value;
    case 'stability':
      return b.stability;
    case 'beginner':
      if (stock.compositeScore == null) return null;
      if (b.stability == null || b.stability < 45) return null;
      if (stock.marketCap != null && stock.marketCap < 5_000_000_000) return null;
      return stock.compositeScore;
    default:
      return stock.compositeScore;
  }
}

export function matchesBeginnerStyle(stock: BursaScoredStock): boolean {
  return styleSortKey('beginner', stock) != null;
}
