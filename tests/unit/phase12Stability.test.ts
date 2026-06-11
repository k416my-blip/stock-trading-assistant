/**
 * Phase12 Stability — Node-side load / failure / bloat checks
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseBursaCompanyProfileFromHtml } from '../../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../../src/services/bursa/bursaDividendService';
import { buildBursaPhase11FromBundles } from '../../src/services/bursa/bursaPhase11Analysis';
import { readBursaCache, writeBursaCache } from '../../src/services/bursa/bursaDisclosureCache';
import { runNewsApiEverythingTest } from '../../src/services/newsApiEverythingTest';
import { runXApiSearchRecentTest } from '../../src/services/xApiSearchRecentTest';
import {
  resetStuckMarketDataQueue,
} from '../../src/services/marketDataService';
import { syncPortfolioPrices } from '../../src/services/portfolioPriceUpdate';
import { marketDataRequestQueue } from '../../src/services/marketDataRequestQueue';
import type { BursaDisclosureBundle } from '../../src/types/bursaDisclosure';
import type { PortfolioPosition } from '../../src/types';

const fetchQuoteViaProviderChain = vi.fn();
const getExchangeRate = vi.fn();
const getEmergencyCachedQuote = vi.fn();

vi.mock('../../src/services/quoteCache', () => ({
  getEmergencyCachedQuote: (...args: unknown[]) => getEmergencyCachedQuote(...args),
  saveCachedQuote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/quoteProviderChain', () => ({
  fetchQuoteViaProviderChain: (...args: unknown[]) => fetchQuoteViaProviderChain(...args),
  resetProviderRateLimits: vi.fn(),
}));

vi.mock('../../src/services/marketDataService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/marketDataService')>();
  return {
    ...actual,
    getExchangeRate: (...args: unknown[]) => getExchangeRate(...args),
  };
});

const VERIFY_CODES = ['1155', '1066', '5819', '5183'];

function loadFixture(code: string): BursaDisclosureBundle | null {
  const path = join(process.cwd(), `scripts/klse-sample-${code}.html`);
  if (!existsSync(path)) return null;
  const html = readFileSync(path, 'utf8');
  return {
    stockCode: code,
    profile: parseBursaCompanyProfileFromHtml(html, code),
    quarterly: parseBursaQuarterlyFromHtml(html, code),
    dividend: parseBursaDividendFromHtml(html, code),
    dataSource: 'klse_screener',
    fetchedFields: [],
    missingFields: [],
    apiNotes: [],
  };
}

function makePosition(code: string, label: string): PortfolioPosition {
  return {
    id: `p12-${code}`,
    symbol: code,
    market: 'bursa',
    currency: 'MYR',
    shares: 1000,
    averageBuyPrice: 1.5,
    currentPrice: 1.6,
    priceSource: 'api',
    priceFetchStatus: 'ok',
    openedAt: new Date().toISOString(),
    companyName: label,
  };
}

describe('Phase12 stability (Node)', () => {
  const bundles = VERIFY_CODES.map(loadFixture).filter(Boolean) as BursaDisclosureBundle[];
  const holdings = VERIFY_CODES.map((c, i) =>
    makePosition(c, ['Maybank', 'RHB', 'Hong Leong', 'Petronas'][i] ?? c),
  );
  const stockHtmlByCode = Object.fromEntries(
    VERIFY_CODES.map((code) => {
      const path = join(process.cwd(), `scripts/klse-sample-${code}.html`);
      return [code, existsSync(path) ? readFileSync(path, 'utf8') : ''];
    }),
  );

  beforeEach(() => {
    vi.clearAllMocks();
    fetchQuoteViaProviderChain.mockReset();
    getExchangeRate.mockReset();
    getEmergencyCachedQuote.mockReset();
    getExchangeRate.mockResolvedValue({ from: 'MYR', to: 'MYR', rate: 1 });
    getEmergencyCachedQuote.mockResolvedValue(null);
    marketDataRequestQueue.resetCooldownsForTest();
    fetchQuoteViaProviderChain.mockResolvedValue({
      quote: {
        price: 1.75,
        symbol: '1155.KL',
        exchange: '',
        currency: 'MYR',
        provider: 'yahoo_finance',
      },
      provider: 'yahoo_finance',
    });
  });

  afterEach(() => {
    resetStuckMarketDataQueue();
  });

  it('AI analysis 100 consecutive runs without throw', async () => {
    expect(bundles.length).toBeGreaterThanOrEqual(4);
    let lastStockCount = 0;
    for (let i = 0; i < 100; i++) {
      const result = await buildBursaPhase11FromBundles({
        bundles,
        holdings,
        stockHtmlByCode,
        apiKeys: { newsApiKey: '', snsApiKey: '', earningsApiKey: '', redditApiKey: '', xApiKey: '' },
        fetchLiveExternal: false,
      });
      expect(result.stocks.length).toBeGreaterThan(0);
      lastStockCount = result.stocks.length;
    }
    expect(lastStockCount).toBeGreaterThan(0);
  }, 120_000);

  it('price refresh 100 consecutive runs without throw', async () => {
    const positions = [makePosition('1155', 'Maybank')];
    for (let i = 0; i < 100; i++) {
      const { portfolio, result } = await syncPortfolioPrices('test-api-key-12345', positions);
      expect(portfolio.length).toBe(1);
      expect(result.updatedCount).toBeGreaterThanOrEqual(1);
    }
  }, 120_000);

  it('News API failure returns graceful error (no throw)', async () => {
    const result = await runNewsApiEverythingTest('phase12-invalid-news-key-xxxxxxxx');
    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBeGreaterThanOrEqual(0);
    expect(result.errorReason).toBeTruthy();
  });

  it('X API failure returns graceful error (no throw)', async () => {
    const result = await runXApiSearchRecentTest('phase12-invalid-x-token-xxxxxxxx');
    expect(result.ok).toBe(false);
    expect(result.tweetCount).toBe(0);
    expect(result.errorReason).toBeTruthy();
  });

  it('AsyncStorage bloat — 200 cache entries then analysis still works', async () => {
    const bigPayload = {
      stockCode: '9999',
      annualRecords: Array.from({ length: 50 }, (_, i) => ({
        fiscalYear: 2020 + (i % 5),
        revenue: 1_000_000 + i,
        netProfit: 100_000 + i,
      })),
      quarterlyHistory: Array.from({ length: 20 }, (_, i) => ({
        quarterLabel: `Q${(i % 4) + 1}`,
        revenue: 250_000,
        netProfit: 25_000,
      })),
      fetchedFields: ['revenue', 'netProfit'],
      missingFields: [],
      sourceStatus: {},
    };
    for (let i = 0; i < 200; i++) {
      const code = String(9000 + (i % 100)).padStart(4, '0');
      await writeBursaCache('quarterly', code, {
        ...bigPayload,
        stockCode: code,
        filler: 'x'.repeat(512),
      });
    }
    const readBack = await readBursaCache<typeof bigPayload>('quarterly', '9000');
    expect(readBack?.payload.stockCode).toBe('9000');
    expect(Array.isArray(readBack?.payload.annualRecords)).toBe(true);

    const result = await buildBursaPhase11FromBundles({
      bundles,
      holdings,
      stockHtmlByCode,
      apiKeys: { newsApiKey: '', snsApiKey: '', earningsApiKey: '', redditApiKey: '', xApiKey: '' },
      fetchLiveExternal: false,
    });
    expect(result.stocks.length).toBeGreaterThan(0);
  }, 60_000);
});
