import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';
import { resolveRsiForAiEvaluator } from '../../src/services/aiSecondEvaluatorRsiResolver';
import { fetchMergedNewsForAiEvaluator } from '../../src/services/aiSecondEvaluatorMergedNews';
import type { StockFundamentals } from '../../src/types';

const evidenceStub: ConciergeSymbolEvidence = {
  symbol: '1155',
  market: 'bursa',
  displayLabelJa: '1155',
  companyName: 'Malayan Banking',
  currentPrice: 10,
  previousClose: 10,
  intradayChangePct: 0,
  volume: 1_000_000,
  volumeSurgeRatio: 1,
  newsSummaryJa: 'test',
  newsSource: 'cache',
  latestFinancialNews: [],
  trendingKeywords: [],
  dataGapsJa: [],
  unusualActivityFlags: [],
  portfolioHolding: null,
  quoteAgeSeconds: 60,
  quoteIsStale: false,
  xSentiment: null,
};

vi.mock('../../src/services/quoteProviders/yahooFinancePriceHistory', () => ({
  fetchYahooFinancePriceHistory: vi.fn().mockRejectedValue(new Error('yahoo_down')),
}));

describe('operational fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Yahoo failure falls back to local_price_history for RSI', async () => {
    const pack = await resolveRsiForAiEvaluator(evidenceStub, true);
    expect(pack.rsiSource).toBe('local_price_history');
    expect(pack.priceHistoryBars).toBeGreaterThan(0);
    expect(pack.rsi14).not.toBeNull();
  });
});

const stock: StockFundamentals = {
  symbol: 'AAPL',
  name: 'Apple',
  market: 'us',
  currency: 'USD',
  price: 100,
  dividendYield: 0,
  per: 0,
  marketCap: 0,
  volume: 1_000_000,
  category: 'growth',
};

vi.mock('../../src/services/freeNewsFallback', () => ({
  fetchYahooFinanceRss: vi.fn().mockRejectedValue(new Error('yahoo_rss_down')),
  fetchGoogleNewsRss: vi.fn().mockRejectedValue(new Error('google_rss_down')),
}));

vi.mock('../../src/services/analysis/newsAnalysis', () => ({
  analyzeNews: vi.fn().mockResolvedValue({
    source: 'unavailable',
    headlines: [],
    sentiment: '中立',
    summary: 'news_api_down',
  }),
}));

describe('news fetch failure', () => {
  it('returns empty headlines with summary when all news sources fail', async () => {
    const merged = await fetchMergedNewsForAiEvaluator(stock, {
      newsApiKey: '',
      snsApiKey: '',
      earningsApiKey: '',
      redditApiKey: '',
      xApiKey: '',
    });
    expect(merged.headlines.length).toBe(0);
    expect(merged.newsSummaryJa).toContain('未取得');
    expect(merged.newsApiCount).toBe(0);
  });
});
