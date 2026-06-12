/**
 * Phase24 — Analyst Consensus Intelligence プロバイダー
 * Step 4: mock fixture 6銘柄 · Phase14 派生強化 · live fetch 禁止
 */
import type { BursaAnalystConsensusAnalysis } from '../../types/bursaAnalystConsensus';
import type {
  AnalystConsensusIntelligenceSource,
  AnalystConsensusRatingLabel,
  AnalystRevisionDirectionLabel,
} from '../../types/bursaAnalystConsensusIntelligence';
import { AUDIT_ANALYST_CONSENSUS_STOCKS } from '../../constants/bursaAnalystConsensusIntelligence';

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

const FIXTURE_NOW = new Date().toISOString();

/** 監査・unit test 用 fixture（1155 Maybank — 後方互換） */
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
  updatedAt: FIXTURE_NOW,
  providerError: null,
};

/** 6銘柄 offline audit fixture（外部 API なし） */
export const AUDIT_MOCK_FIXTURES: Record<string, AnalystConsensusIntelligencePartial> = {
  '1155': { ...MOCK_ANALYST_CONSENSUS_FIXTURE },
  '1023': {
    source: 'mock_fixture',
    analystCount: 16,
    buyCount: 10,
    holdCount: 4,
    sellCount: 2,
    consensusRating: 'Buy',
    targetPrice: 8.45,
    currentPrice: 7.62,
    impliedUpsidePct: 10.9,
    targetRevisionDirection: 'Stable',
    targetRevisionPct: 0.8,
    ratingRevisionDirection: 'Maintained' as never,
    consensusDispersion: 32,
    updatedAt: FIXTURE_NOW,
    providerError: null,
  },
  '1295': {
    source: 'mock_fixture',
    analystCount: 14,
    buyCount: 8,
    holdCount: 5,
    sellCount: 1,
    consensusRating: 'Hold',
    targetPrice: 4.55,
    currentPrice: 4.38,
    impliedUpsidePct: 3.9,
    targetRevisionDirection: 'Stable',
    targetRevisionPct: null,
    ratingRevisionDirection: 'Stable',
    consensusDispersion: 38,
    updatedAt: FIXTURE_NOW,
    providerError: null,
  },
  '5347': {
    source: 'mock_fixture',
    analystCount: 12,
    buyCount: 7,
    holdCount: 4,
    sellCount: 1,
    consensusRating: 'Buy',
    targetPrice: 14.2,
    currentPrice: 12.85,
    impliedUpsidePct: 10.5,
    targetRevisionDirection: 'Upgraded',
    targetRevisionPct: 3.2,
    ratingRevisionDirection: 'Upgraded',
    consensusDispersion: 35,
    updatedAt: FIXTURE_NOW,
    providerError: null,
  },
  '4707': {
    source: 'mock_fixture',
    analystCount: 10,
    buyCount: 3,
    holdCount: 5,
    sellCount: 2,
    consensusRating: 'Hold',
    targetPrice: 98.5,
    currentPrice: 102.3,
    impliedUpsidePct: -3.7,
    targetRevisionDirection: 'Downgraded',
    targetRevisionPct: -2.1,
    ratingRevisionDirection: 'Downgraded',
    consensusDispersion: 48,
    updatedAt: FIXTURE_NOW,
    providerError: null,
  },
  '6033': {
    source: 'mock_fixture',
    analystCount: 9,
    buyCount: 5,
    holdCount: 3,
    sellCount: 1,
    consensusRating: 'Buy',
    targetPrice: 19.8,
    currentPrice: 18.1,
    impliedUpsidePct: 9.4,
    targetRevisionDirection: 'Stable',
    targetRevisionPct: 1.2,
    ratingRevisionDirection: 'Stable',
    consensusDispersion: 42,
    updatedAt: FIXTURE_NOW,
    providerError: null,
  },
};

// Fix 1023 ratingRevisionDirection - 'Maintained' is not valid, use Stable
AUDIT_MOCK_FIXTURES['1023'].ratingRevisionDirection = 'Stable';

export function normalizeAuditStockCode(stockCode: string): string {
  return stockCode.replace(/\.KL$/i, '').trim();
}

export function getMockFixtureForStock(stockCode: string): AnalystConsensusIntelligencePartial | null {
  const code = normalizeAuditStockCode(stockCode);
  const fixture = AUDIT_MOCK_FIXTURES[code];
  return fixture ? { ...fixture } : null;
}

export function isAuditMockStock(stockCode: string): boolean {
  return AUDIT_ANALYST_CONSENSUS_STOCKS.includes(
    normalizeAuditStockCode(stockCode) as (typeof AUDIT_ANALYST_CONSENSUS_STOCKS)[number],
  );
}

export function createMockFixtureProvider(
  fixture: AnalystConsensusIntelligencePartial = MOCK_ANALYST_CONSENSUS_FIXTURE,
): AnalystConsensusIntelligenceProvider {
  return {
    id: 'mock_fixture',
    label: 'Mock Fixture',
    fetch: async () => ({ ...fixture }),
  };
}

export const UNAVAILABLE_PROVIDER_REASON =
  'Analyst consensus provider unavailable — live fetch disabled (Step 4 offline)';

export function createUnavailableProvider(
  reason: string = UNAVAILABLE_PROVIDER_REASON,
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

export function dispersionFromRatingCounts(
  counts: BursaAnalystConsensusAnalysis['ratingCounts'],
): number | null {
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

function deriveConsensusRatingFromCounts(
  counts: BursaAnalystConsensusAnalysis['ratingCounts'],
): AnalystConsensusRatingLabel | null {
  if (!counts || counts.analystCount <= 0) return null;
  const total = counts.analystCount;
  const strongBuyPct = counts.strongBuy / total;
  const buyPct = (counts.strongBuy + counts.buy) / total;
  const sellPct = (counts.sell + counts.strongSell) / total;
  if (strongBuyPct >= 0.35) return 'Strong Buy';
  if (buyPct >= 0.55) return 'Buy';
  if (sellPct >= 0.35) return 'Strong Sell';
  if (sellPct >= 0.2) return 'Sell';
  return 'Hold';
}

/** Phase14 Analyst Consensus から partial を構築（API 呼び出しなし） */
export function buildAnalystConsensusPartialFromPhase14(
  consensus: BursaAnalystConsensusAnalysis | null | undefined,
): AnalystConsensusIntelligencePartial | null {
  if (!consensus || consensus.availability !== 'available') return null;

  const counts = consensus.ratingCounts;
  const buyCount = counts ? (counts.strongBuy ?? 0) + (counts.buy ?? 0) : null;
  const holdCount = counts?.hold ?? null;
  const sellCount = counts ? (counts.sell ?? 0) + (counts.strongSell ?? 0) : null;

  const consensusRating =
    mapPhase14Rating(consensus.rating) ?? deriveConsensusRatingFromCounts(counts);

  const hasAny =
    counts != null ||
    consensus.averageTargetPrice != null ||
    consensusRating != null ||
    consensus.targetPriceUpsidePct != null ||
    consensus.currentPrice != null;

  if (!hasAny) return null;

  return {
    source: 'phase14_consensus',
    analystCount: counts?.analystCount ?? null,
    buyCount,
    holdCount,
    sellCount,
    consensusRating,
    targetPrice: consensus.averageTargetPrice,
    currentPrice: consensus.currentPrice,
    impliedUpsidePct: consensus.targetPriceUpsidePct,
    targetRevisionDirection: null,
    targetRevisionPct: null,
    ratingRevisionDirection: mapPhase14Trend(consensus.consensusTrend),
    consensusDispersion: dispersionFromRatingCounts(counts),
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
  const usable = partials.filter(
    (p) =>
      p.analystCount != null ||
      p.targetPrice != null ||
      p.consensusRating != null ||
      p.impliedUpsidePct != null ||
      p.buyCount != null,
  );
  if (usable.length === 0) return null;

  const ordered = [...usable].sort((a, b) => {
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

  return merged;
}

export async function fetchAllAnalystConsensusIntelligencePartials(input: {
  stockCode: string;
  analystConsensus?: BursaAnalystConsensusAnalysis | null;
  useMockFixture?: boolean;
  fetchLiveExternal?: boolean;
}): Promise<AnalystConsensusIntelligencePartial | null> {
  const partials: AnalystConsensusIntelligencePartial[] = [];

  const wantMock =
    input.useMockFixture === true ||
    (input.useMockFixture !== false && isAuditMockStock(input.stockCode));

  if (wantMock) {
    const mock = getMockFixtureForStock(input.stockCode) ?? { ...MOCK_ANALYST_CONSENSUS_FIXTURE };
    partials.push(mock);
  }

  const fromPhase14 = buildAnalystConsensusPartialFromPhase14(input.analystConsensus);
  if (fromPhase14) partials.push(fromPhase14);

  // Step 4: live external fetch 禁止（adapter stub のみ）
  if (input.fetchLiveExternal) {
    const unavailable = await createUnavailableProvider(
      'Live external fetch disabled in Step 4 — use Phase14 or mock fixture',
    ).fetch(input.stockCode);
    if (unavailable) partials.push(unavailable);
  }

  const merged = mergeAnalystConsensusIntelligencePartials(partials);
  const externalProviderError = input.fetchLiveExternal
    ? partials.find((p) => p.providerError)?.providerError
    : null;
  if (merged && externalProviderError && !merged.providerError) {
    merged.providerError = externalProviderError;
  }
  return merged ?? partials.find((p) => p.providerError) ?? null;
}
