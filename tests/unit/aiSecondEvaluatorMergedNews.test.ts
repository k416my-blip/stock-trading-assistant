import { describe, expect, it, vi } from 'vitest';
import { fetchMergedNewsForAiEvaluator } from '../../src/services/aiSecondEvaluatorMergedNews';
import type { StockFundamentals } from '../../src/types';

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
  fetchYahooFinanceRss: vi.fn().mockResolvedValue([
    { title: 'Yahoo headline', source: 'Yahoo Finance RSS', sentiment: '中立' },
  ]),
  fetchGoogleNewsRss: vi.fn().mockResolvedValue([
    { title: 'Google headline', source: 'Google News RSS', sentiment: '中立' },
  ]),
}));

vi.mock('../../src/services/analysis/newsAnalysis', () => ({
  analyzeNews: vi.fn().mockResolvedValue({
    source: 'available',
    headlines: [{ title: 'NewsAPI headline', sentiment: '中立' }],
    sentiment: '中立',
    summary: 'ok',
  }),
}));

describe('fetchMergedNewsForAiEvaluator', () => {
  it('merges Yahoo, Google, and NewsAPI sources', async () => {
    const merged = await fetchMergedNewsForAiEvaluator(stock, {
      newsApiKey: 'test-key',
      snsApiKey: '',
      earningsApiKey: '',
      redditApiKey: '',
      xApiKey: '',
    });
    expect(merged.newsApiCount).toBe(1);
    expect(merged.newsApiTitles).toEqual(['NewsAPI headline']);
    expect(merged.headlines.length).toBeGreaterThanOrEqual(3);
    expect(merged.newsSource).toContain('Yahoo Finance RSS');
    expect(merged.newsSource).toContain('Google News RSS');
    expect(merged.newsSource).toContain('NewsAPI');
  });
});
