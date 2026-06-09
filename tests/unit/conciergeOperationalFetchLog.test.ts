import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchConciergeXEvidence } from '../../src/services/conciergeXFetchProbe';
import type { StockFundamentals } from '../../src/types';

const stock: StockFundamentals = {
  symbol: '1155',
  name: 'Maybank',
  market: 'bursa',
  currency: 'MYR',
  price: 10,
  dividendYield: 0,
  per: 0,
  marketCap: 0,
  volume: 0,
  category: 'growth',
  beginnerFriendly: false,
};

describe('conciergeOperationalFetchLog', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs [X_FETCH] when live fetch skipped', async () => {
    await fetchConciergeXEvidence(stock, { newsApiKey: '', snsApiKey: '', earningsApiKey: '', redditApiKey: '', xApiKey: '' }, false);
    const xLog = vi.mocked(console.warn).mock.calls.find((c) => c[0] === '[X_FETCH]');
    expect(xLog).toBeDefined();
    const payload = JSON.parse(String(xLog![1]));
    expect(payload.query).toBeTruthy();
    expect(payload.requestUrl).toBe('(cache-only)');
    expect(payload.status).toBe('skipped');
    expect(payload.error).toContain('no X intent');
  });
});
