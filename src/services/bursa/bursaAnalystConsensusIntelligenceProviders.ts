/**
 * Phase24 — Analyst Consensus Intelligence プロバイダー（Step 3: mock / fixture / Phase14 派生のみ）
 * 外部 API 接続は Step 4 以降。本 Step では live fetch 禁止。
 */
import type { BursaAnalystConsensusAnalysis } from '../../types/bursaAnalystConsensus';
import type {
  AnalystConsensusIntelligenceSource,
  AnalystConsensusRatingLabel,
  AnalystRevisionDirectionLabel,
} from '../../types/bursaAnalystConsensusIntelligence';

export type AnalystConsensusIntelligencePartial = {
  source: AnalystConsensusIntelligenceSource;
  analystCount: number | null;
  buyCount: number | null;
  holdCount: number | null;
  sellCount: number | null;
  consensusRating: AnalystConsensusRatingLabel | null;
  targetPrice: number | null;
  currentPrice: number | null;
  impliedUpsidePct: number | null;
  targetRevisionDirection: AnalystRevisionDirectionLabel | null;
  targetRevisionPct: number | null;
  ratingRevisionDirection: AnalystRevisionDirectionLabel | null;
  consensusDispersion: number | null;
  updatedAt: string | null;
  providerError: string | null;
};

export type AnalystConsensusIntelligenceProvider = {
  id: AnalystConsensusIntelligenceSource;
  label: string;
  fetch: (stockCode: string) => Promise<AnalystConsensusIntelligencePartial | null>;
};

/** 監査・unit test 用 fixture（1155 Maybank 相当） */
export const MOCK_ANALYST_CONSENSUS_FIXTURE: AnalystConsensusIntelligencePartial = {
  source: 'mock_fixture',
  analystCount: 18,
  buyCount: 12,
  holdCount: 5,
  sellCount: 1,
  consensusRating: 'Buy',
  targetPrice: 11.85,
  currentPrice: 10.2,
  impliedUpsidePct: 16.2,
  targetRevisionDirection: 'Upgraded',
  targetRevisionPct: 4.5,
  ratingRevisionDirection: 'Upgraded',
  consensusDispersion: 28,
  updatedAt: new Date().toISOString(),
  providerError: null,
};

export function createMockFixtureProvider(
  fixture: AnalystConsensusIntelligencePartial = MOCK_ANALYST_CONSENSUS_FIXTURE,
): AnalystConsensusIntelligenceProvider {
  return {
    id: 'mock_fixture',
    label: 'Mock Fixture',
    fetch: async () => ({ ...fixture }),
  };
}

export function createUnavailableProvider(
  reason = 'Provider unavailable (Step 3 skeleton)',
): AnalystConsensusIntelligenceProvider {
  return {
    id: 'none',
    label: 'Unavailable',
    fetch: async () => ({
      source: 'none',
      analystCount: null,
      buyCount: null,
      holdCount: null,
      sellCount: null,
      consensusRating: null,
      targetPrice: null,
      currentPrice: null,
      impliedUpsidePct: null,
      targetRevisionDirection: null,
      targetRevisionPct: null,
      ratingRevisionDirection: null,
      consensusDispersion: null,
      updatedAt: null,
      providerError: reason,
    }),
  };
}

function mapPhase14Rating(
  rating: BursaAnalystConsensusAnalysis['rating'],
): AnalystConsensusRatingLabel | null {
  if (!rating) return null;
  return rating;
}

function mapPhase14Trend(
  trend: BursaAnalystConsensusAnalysis['consensusTrend'],
): AnalystRevisionDirectionLabel | null {
  if (!trend) return null;
  if (trend === 'Maintained') return 'Stable';
  return trend;
}

function dispersionFromCounts(counts: BursaAnalystConsensusAnalysis['ratingCounts']): number | null {
  if (!counts || counts.analystCount <= 0) return null;
  const total = counts.analystCount;
  const shares = [
    counts.strongBuy / total,
    counts.buy / total,
    counts.hold / total,
    counts.sell / total,
    counts.strongSell / total,
  ];
  const maxShare = Math.max(...shares);
  return Math.round((1 - maxShare) * 100);
}

/** Phase14 Analyst Consensus から partial を構築（API 呼び出しなし） */
export function buildAnalystConsensusPartialFromPhase14(
  consensus: BursaAnalystConsensusAnalysis | null | undefined,
): AnalystConsensusIntelligencePartial | null {
  if (!consensus || consensus.availability !== 'available') return null;

  const counts = consensus.ratingCounts;
  const buyCount = counts
    ? (counts.strongBuy ?? 0) + (counts.buy ?? 0)
    : null;
  const holdCount = counts?.hold ?? null;
  const sellCount = counts
    ? (counts.sell ?? 0) + (counts.strongSell ?? 0)
    : null;

  const hasAny =
    counts != null ||
    consensus.averageTargetPrice != null ||
    consensus.rating != null ||
    consensus.targetPriceUpsidePct != null;

  if (!hasAny) return null;

  return {
    source: 'phase14_consensus',
    analystCount: counts?.analystCount ?? null,
    buyCount,
    holdCount,
    sellCount,
    consensusRating: mapPhase14Rating(consensus.rating),
    targetPrice: consensus.averageTargetPrice,
    currentPrice: consensus.currentPrice,
    impliedUpsidePct: consensus.targetPriceUpsidePct,
    targetRevisionDirection: null,
    targetRevisionPct: null,
    ratingRevisionDirection: mapPhase14Trend(consensus.consensusTrend),
    consensusDispersion: dispersionFromCounts(counts),
    updatedAt: consensus.fetchedAt,
    providerError: null,
  };
}

function fillIfMissing<T>(current: T | null, incoming: T | null | undefined): T | null {
  return current ?? incoming ?? null;
}

export function mergeAnalystConsensusIntelligencePartials(
  partials: AnalystConsensusIntelligencePartial[],
): AnalystConsensusIntelligencePartial | null {
  if (partials.length === 0) return null;

  const ordered = [...partials].sort((a, b) => {
    const rank = (s: AnalystConsensusIntelligenceSource) => {
      if (s === 'yahoo_finance') return 0;
      if (s === 'finnhub') return 1;
      if (s === 'alpha_vantage') return 2;
      if (s === 'fmp') return 3;
      if (s === 'phase14_consensus') return 4;
      if (s === 'mock_fixture') return 5;
      return 9;
    };
    return rank(a.source) - rank(b.source);
  });

  const merged: AnalystConsensusIntelligencePartial = {
    source: ordered[0].source,
    analystCount: null,
    buyCount: null,
    holdCount: null,
    sellCount: null,
    consensusRating: null,
    targetPrice: null,
    currentPrice: null,
    impliedUpsidePct: null,
    targetRevisionDirection: null,
    targetRevisionPct: null,
    ratingRevisionDirection: null,
    consensusDispersion: null,
    updatedAt: null,
    providerError: null,
  };

  for (const p of ordered) {
    merged.analystCount = fillIfMissing(merged.analystCount, p.analystCount);
    merged.buyCount = fillIfMissing(merged.buyCount, p.buyCount);
    merged.holdCount = fillIfMissing(merged.holdCount, p.holdCount);
    merged.sellCount = fillIfMissing(merged.sellCount, p.sellCount);
    merged.consensusRating = fillIfMissing(merged.consensusRating, p.consensusRating);
    merged.targetPrice = fillIfMissing(merged.targetPrice, p.targetPrice);
    merged.currentPrice = fillIfMissing(merged.currentPrice, p.currentPrice);
    merged.impliedUpsidePct = fillIfMissing(merged.impliedUpsidePct, p.impliedUpsidePct);
    merged.targetRevisionDirection = fillIfMissing(
      merged.targetRevisionDirection,
      p.targetRevisionDirection,
    );
    merged.targetRevisionPct = fillIfMissing(merged.targetRevisionPct, p.targetRevisionPct);
    merged.ratingRevisionDirection = fillIfMissing(
      merged.ratingRevisionDirection,
      p.ratingRevisionDirection,
    );
    merged.consensusDispersion = fillIfMissing(merged.consensusDispersion, p.consensusDispersion);
    merged.updatedAt = fillIfMissing(merged.updatedAt, p.updatedAt);
    if (p.providerError && !merged.providerError) merged.providerError = p.providerError;
  }

  const hasData =
    merged.analystCount != null ||
    merged.targetPrice != null ||
    merged.consensusRating != null ||
    merged.impliedUpsidePct != null;

  return hasData ? merged : null;
}

export async function fetchAllAnalystConsensusIntelligencePartials(input: {
  stockCode: string;
  analystConsensus?: BursaAnalystConsensusAnalysis | null;
  useMockFixture?: boolean;
  fetchLiveExternal?: boolean;
}): Promise<AnalystConsensusIntelligencePartial | null> {
  const partials: AnalystConsensusIntelligencePartial[] = [];

  if (input.useMockFixture) {
    partials.push({ ...MOCK_ANALYST_CONSENSUS_FIXTURE });
  }

  const fromPhase14 = buildAnalystConsensusPartialFromPhase14(input.analystConsensus);
  if (fromPhase14) partials.push(fromPhase14);

  // Step 3: fetchLiveExternal は常に no-op（外部 API 未接続）
  if (input.fetchLiveExternal) {
    // reserved for Step 4 — Yahoo / Finnhub / AV / FMP providers
  }

  return mergeAnalystConsensusIntelligencePartials(partials);
}
