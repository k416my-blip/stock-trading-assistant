import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MARKET_DATA_MESSAGES,
  PORTFOLIO_REFRESH_TIMEOUT_MS,
  QUOTE_ATTEMPT_TIMEOUT_MS,
  BURSA_TWELVE_DATA_UNSUPPORTED,
} from '../../src/constants/marketData';
import { MarketDataError, resetStuckMarketDataQueue } from '../../src/services/marketDataService';
import {
  listRefreshingSymbols,
  sanitizePortfolio,
  syncPortfolioPrices,
} from '../../src/services/portfolioPriceUpdate';
import { derivePriceSyncDisplayStatus } from '../../src/services/priceSyncDisplay';
import { validatePositionSymbol } from '../../src/services/marketDataValidation';
import { marketDataRequestQueue } from '../../src/services/marketDataRequestQueue';
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

function makePosition(overrides: Partial<PortfolioPosition> = {}): PortfolioPosition {
  return {
    id: 'pos-1',
    symbol: '4707',
    market: 'bursa',
    currency: 'MYR',
    shares: 100,
    averageBuyPrice: 1.5,
    currentPrice: 1.6,
    priceSource: 'api',
    priceFetchStatus: 'ok',
    openedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('portfolio price refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchQuoteViaProviderChain.mockReset();
    getExchangeRate.mockReset();
    getEmergencyCachedQuote.mockReset();
    getExchangeRate.mockResolvedValue({ from: 'MYR', to: 'MYR', rate: 1 });
    getEmergencyCachedQuote.mockResolvedValue(null);
    marketDataRequestQueue.resetCooldownsForTest();
  });

  afterEach(() => {
    resetStuckMarketDataQueue();
  });

  it('successful refresh clears pending flags', async () => {
    fetchQuoteViaProviderChain.mockResolvedValue({
      quote: {
        price: 1.75,
        symbol: '4707.KL',
        exchange: '',
        currency: 'MYR',
        provider: 'yahoo_finance',
      },
      attempts: [],
      usedFallback: false,
    });
    const before = [makePosition()];
    const { portfolio, result } = await syncPortfolioPrices('test-api-key-12345', before);

    expect(result.updatedCount).toBe(1);
    expect(result.displayStatus).toBe('complete');
    expect(listRefreshingSymbols(portfolio)).toHaveLength(0);
    expect(portfolio[0].priceFetchStatus).toBe('ok');
    expect(derivePriceSyncDisplayStatus(false, result)).toBe('complete');
  });

  it('failed refresh clears pending and keeps last price', async () => {
    fetchQuoteViaProviderChain.mockRejectedValue(
      new MarketDataError('api_key', MARKET_DATA_MESSAGES.apiKeyInvalid),
    );
    const before = [makePosition({ currentPrice: 2.1 })];
    const { portfolio, result } = await syncPortfolioPrices('bad-key', before);

    expect(result.failures.length).toBeGreaterThan(0);
    expect(listRefreshingSymbols(portfolio)).toHaveLength(0);
    expect(portfolio[0].currentPrice).toBe(2.1);
    expect(derivePriceSyncDisplayStatus(false, result)).not.toBe('fetching');
  });

  it('timeout clears loading state semantics (no perpetual pending)', async () => {
    fetchQuoteViaProviderChain.mockRejectedValue(
      new MarketDataError('network_timeout', MARKET_DATA_MESSAGES.refreshTimeout),
    );
    const { portfolio, result } = await syncPortfolioPrices('test-api-key-12345', [
      makePosition({ symbol: '4707' }),
    ]);

    expect(result.failures.length).toBeGreaterThan(0);
    expect(listRefreshingSymbols(portfolio)).toHaveLength(0);
    expect(derivePriceSyncDisplayStatus(false, result)).not.toBe('fetching');
  });

  it('partial success updates available prices', async () => {
    fetchQuoteViaProviderChain.mockImplementation(async (input: { positionSymbol: string }) => {
      if (input.positionSymbol === '4707') {
        return {
          quote: {
            price: 1.8,
            symbol: '4707.KL',
            exchange: '',
            currency: 'MYR',
            provider: 'yahoo_finance',
          },
          attempts: [],
          usedFallback: false,
        };
      }
      return {
        quote: null,
        attempts: [
          {
            provider: 'yahoo_finance',
            shortLabel: 'YF',
            ok: false,
            errorKind: 'symbol_invalid',
          },
        ],
        usedFallback: false,
      };
    });

    const before = [
      makePosition({ symbol: '4707', currentPrice: 1.5 }),
      makePosition({
        id: 'pos-2',
        symbol: '0820EA',
        currentPrice: null as unknown as number,
        averageBuyPrice: 0,
        priceFetchStatus: 'failed',
      }),
    ];
    const { portfolio, result } = await syncPortfolioPrices('test-api-key-12345', before);

    expect(result.updatedCount).toBeGreaterThanOrEqual(1);
    expect(result.partialSuccess).toBe(true);
    expect(result.failures.length).toBeGreaterThan(0);
    const p4707 = portfolio.find((p) => p.symbol === '4707');
    expect(p4707?.currentPrice).toBe(1.8);
    expect(result.displayStatus).toBe('partial_failure');
  });

  it('empty Twelve Data key still attempts Yahoo provider chain', async () => {
    fetchQuoteViaProviderChain.mockResolvedValue({
      quote: {
        price: 1.7,
        symbol: '4707.KL',
        exchange: '',
        currency: 'MYR',
        provider: 'yahoo_finance',
      },
      attempts: [],
      usedFallback: false,
    });
    const { result } = await syncPortfolioPrices('', [makePosition()]);
    expect(fetchQuoteViaProviderChain).toHaveBeenCalled();
    expect(result.updatedCount).toBe(1);
    expect(result.lastPriceProvider).toBe('yahoo_finance');
  });

  it('unsupported Bursa symbol shows Twelve Data warning on symbol_invalid', async () => {
    fetchQuoteViaProviderChain.mockRejectedValue(
      new MarketDataError('symbol_invalid', 'invalid symbol'),
    );
    const { result } = await syncPortfolioPrices('test-api-key-12345', [
      makePosition({ symbol: '0820EA' }),
    ]);
    expect(result.failures[0]?.reason).toBe(BURSA_TWELVE_DATA_UNSUPPORTED);
    expect(result.failures[0]?.rawMessage).toBe('invalid symbol');
  });

  it('validates Bursa symbols 0820EA 4707 1023 7103 with .KL apiSymbol', () => {
    for (const symbol of ['0820EA', '4707', '1023', '7103']) {
      const v = validatePositionSymbol('bursa', symbol);
      expect(v.ok, symbol).toBe(true);
      if (v.ok) {
        expect(v.normalizedSymbol.length).toBeGreaterThan(0);
        expect(v.apiSymbol).toBe(`${v.normalizedSymbol}.KL`);
      }
    }
  });

  it('stuck queue can reset and accept new requests', async () => {
    const cleared = resetStuckMarketDataQueue();
    expect(cleared).toHaveProperty('clearedPending');
    expect(marketDataRequestQueue.getSnapshot().pending).toBe(0);

    const result = await marketDataRequestQueue.enqueue('quote:test:RESET', () =>
      Promise.resolve('ok'),
    );
    expect(result).toBe('ok');
  });

  it('sanitize clears NaN prices', () => {
    const cleaned = sanitizePortfolio([
      makePosition({ currentPrice: Number.NaN, averageBuyPrice: 1.2 }),
    ]);
    expect(Number.isFinite(cleaned[0].currentPrice)).toBe(true);
    expect(cleaned[0].priceFetchStatus).toBe('ok');
  });
});
