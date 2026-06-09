import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BURSA_TEST_YAHOO_SYMBOLS } from '../../src/constants/quoteProviders';
import { getQuoteProviderOrder } from '../../src/constants/quoteProviders';
import {
  fetchQuoteViaProviderChain,
  isProviderRateLimited,
  noteProviderRateLimit,
  resetProviderRateLimits,
} from '../../src/services/quoteProviderChain';
import * as yahoo from '../../src/services/quoteProviders/yahooFinanceQuote';
import * as alpha from '../../src/services/quoteProviders/alphaVantageQuote';
import * as stooq from '../../src/services/quoteProviders/stooqQuote';
import * as rapid from '../../src/services/quoteProviders/rapidApiYahooQuote';
import { MarketDataError } from '../../src/services/marketDataService';
import { resetQuoteProviderStats } from '../../src/services/quoteProviderStats';
import * as yahooBursa from '../../src/services/quoteProviders/yahooFinanceBursa';

vi.mock('../../src/services/quoteProviders/yahooFinanceQuote');
vi.mock('../../src/services/quoteProviders/yahooFinanceBursa', async () => {
  const { MarketDataError: MdErr } = await import('../../src/services/marketDataService');
  return {
    fetchYahooFinanceQuoteForBursa: vi.fn().mockRejectedValue(
      new MdErr('symbol_invalid', 'yahoo bursa fail', { lastProvider: 'yahoo_finance' }),
    ),
  };
});
vi.mock('../../src/services/quoteProviders/alphaVantageQuote');
vi.mock('../../src/services/quoteProviders/stooqQuote');
vi.mock('../../src/services/quoteProviders/rapidApiYahooQuote');
vi.mock('../../src/services/marketDataService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/marketDataService')>();
  return {
    ...actual,
    getQuoteForMarket: vi.fn(),
  };
});

describe('quoteProviderChain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQuoteProviderStats();
    resetProviderRateLimits();
    vi.mocked(yahooBursa.fetchYahooFinanceQuoteForBursa).mockRejectedValue(
      new MarketDataError('symbol_invalid', 'yahoo bursa fail', { lastProvider: 'yahoo_finance' }),
    );
  });

  afterEach(() => {
    resetProviderRateLimits();
  });

  it('order is Yahoo then Twelve then Alpha regardless of API key', () => {
    expect(getQuoteProviderOrder('bursa', 'test-key-12345678')).toEqual([
      'yahoo_finance',
      'twelve_data',
      'alpha_vantage',
    ]);
    expect(getQuoteProviderOrder('us', '')).toEqual([
      'yahoo_finance',
      'twelve_data',
      'alpha_vantage',
    ]);
  });

  it('uses Yahoo first when key is set and Yahoo succeeds', async () => {
    vi.mocked(yahooBursa.fetchYahooFinanceQuoteForBursa).mockResolvedValue({
      symbol: '5183.KL',
      exchange: '',
      currency: 'MYR',
      price: 8.5,
      provider: 'yahoo_finance',
    });
    const { getQuoteForMarket } = await import('../../src/services/marketDataService');

    const result = await fetchQuoteViaProviderChain({
      market: 'bursa',
      positionSymbol: '5183',
      apiSymbol: '5183.KL',
      normalizedSymbol: '5183',
      currency: 'MYR',
      twelveDataApiKey: 'test-key-12345678',
      timeoutMs: 5000,
    });

    expect(result.quote?.provider).toBe('yahoo_finance');
    expect(result.quote?.price).toBe(8.5);
    expect(getQuoteForMarket).not.toHaveBeenCalled();
  });

  it('returns fallback price without throwing when all providers fail', async () => {
    const { getQuoteForMarket } = await import('../../src/services/marketDataService');
    vi.mocked(getQuoteForMarket).mockRejectedValue(
      new MarketDataError('network_timeout', 'timeout'),
    );
    vi.mocked(alpha.fetchAlphaVantageQuote).mockRejectedValue({
      kind: 'symbol_invalid',
      message: 'no symbol',
      rawMessage: 'no symbol',
    });

    const result = await fetchQuoteViaProviderChain({
      market: 'bursa',
      positionSymbol: '5183',
      apiSymbol: '5183.KL',
      normalizedSymbol: '5183',
      currency: 'MYR',
      twelveDataApiKey: 'test-key-12345678',
      timeoutMs: 5000,
      fallbackPrice: 7.25,
    });

    expect(result.quote).toBeNull();
    expect(result.usedFallback).toBe(true);
    expect(result.fallbackPrice).toBe(7.25);
    expect(result.attempts.length).toBeGreaterThan(0);
  });

  it('skips rate-limited Yahoo when key is missing', async () => {
    noteProviderRateLimit('yahoo_finance');
    expect(isProviderRateLimited('yahoo_finance')).toBe(true);

    vi.mocked(alpha.fetchAlphaVantageQuote).mockResolvedValue({
      symbol: '1023.KL',
      exchange: '',
      currency: 'MYR',
      price: 2.1,
      provider: 'alpha_vantage',
    });

    const result = await fetchQuoteViaProviderChain({
      market: 'bursa',
      positionSymbol: '1023',
      apiSymbol: '1023.KL',
      normalizedSymbol: '1023',
      currency: 'MYR',
      twelveDataApiKey: '',
      timeoutMs: 5000,
    });

    expect(result.quote?.provider).toBe('alpha_vantage');
  });

  it('test symbols list covers Bursa ETFs and numerics', () => {
    expect(BURSA_TEST_YAHOO_SYMBOLS).toEqual([
      '1023.KL',
      '4707.KL',
      '5183.KL',
      '0820EA.KL',
    ]);
  });
});
