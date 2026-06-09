import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildAnalysisDiagnostics } from '../../src/services/conciergeSymbolFetchDiagnostics';
import type { ConciergeSymbolActionGuide } from '../../src/types/conciergeActionGuide';
import type { ConciergeFetchResultRow, ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';

const sym: ConciergeSymbolEvidence = {
  symbol: '1155',
  companyName: 'Malayan Banking Berhad',
  market: 'bursa',
  displayLabelJa: '1155 Maybank',
  currentPrice: 10.2,
  previousClose: 10.1,
  intradayChangePct: 0.5,
  volume: 1_000_000,
  volumeSurgeRatio: 1.1,
  quoteAgeSeconds: 60,
  quoteIsStale: false,
  portfolioHolding: null,
  latestFinancialNews: [{ title: 'Test headline', sentiment: '中立' }],
  newsSummaryJa: '',
  newsSource: 'NewsAPI',
  xSentiment: {
    postCount: 3,
    bullishPct: 40,
    bearishPct: 30,
    panicPct: 10,
    hypePct: 20,
    trendWords: [],
    postSurgeRatePct: null,
    summaryJa: '',
    analysisBasis: '',
    fromCache: true,
  },
  trendingKeywords: [],
  unusualActivityFlags: [],
  dataGapsJa: [],
};

const guide = {
  symbol: '1155',
  market: 'bursa',
  displayLabelJa: '1155',
  primaryCategory: 'watch',
  categories: ['watch'],
  marketStance: 'neutral',
  marketStanceLabelJa: '中立',
  reasonBulletsJa: [],
  recommendedActionsJa: [],
  attentionPointsJa: [],
  riskSummaryJa: '',
  confidencePct: 50,
  insufficientData: false,
  insufficientDataLabelJa: null,
  evidenceScores: {
    priceAction: 6,
    volume: 10,
    news: 40,
    xSentiment: 25,
    volatility: 5,
  },
  notificationPriority: 'low',
  notificationWhyJa: '',
} satisfies ConciergeSymbolActionGuide;

const fetchRows: ConciergeFetchResultRow[] = [
  {
    source: 'twelve_data',
    ok: true,
    detailJa: 'provider=yahoo_finance price=92',
    provider: 'yahoo_finance',
    price: 92,
  },
  { source: 'yahoo', ok: true, detailJa: 'ok', provider: 'yahoo_finance', price: 92 },
  { source: 'newsapi', ok: true, detailJa: '1件', headlineCount: 1 },
  { source: 'x', ok: true, detailJa: '3件', postCount: 3 },
];

describe('conciergeSymbolFetchDiagnostics', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs structured [CONCIERGE_SYMBOL_FETCH] summary', () => {
    const d = buildAnalysisDiagnostics({
      userMessage: 'Maybankを分析して',
      symbol: '1155',
      market: 'bursa',
      fetchRows,
      sym,
      guide,
      confidenceBasisJa: 'test',
    });

    expect(d.symbol).toBe('Maybank');
    expect(d.resolvedSymbol).toBe('1155');
    expect(d.twelveOk).toBe(true);
    expect(d.yahooOk).toBe(true);
    expect(d.newsOk).toBe(true);
    expect(d.xOk).toBe(true);
    expect(d.newsCount).toBe(1);
    expect(d.xCount).toBe(3);

    const warn = vi.mocked(console.warn).mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0] === '[CONCIERGE_SYMBOL_FETCH]',
    );
    expect(warn).toBeDefined();
    const payload = JSON.parse(String(warn![1]));
    expect(payload.symbol).toBe('Maybank');
    expect(payload.resolvedSymbol).toBe('1155');
    expect(payload.twelve_ok).toBe(true);
    expect(payload.price_ok).toBe(true);
    expect(payload.twelveError == null).toBe(true);
    expect(payload.yahoo_ok).toBe(true);
    expect(payload.news_ok).toBe(true);
    expect(payload.x_ok).toBe(true);
    expect(d.twelveError).toBeUndefined();
    expect(payload.newsCount).toBe(1);
    expect(payload.xCount).toBe(3);
    expect(payload.confidenceScore).toBe(50);
    expect(payload.confidenceBreakdown).toBeDefined();
    expect(payload.query).toBe('Malayan Banking Berhad');
  });
});
