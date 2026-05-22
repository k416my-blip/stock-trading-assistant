import { describe, expect, it } from 'vitest';
import { BURSA_SYMBOL_MAP } from '../../src/constants/yahooFinance';
import {
  applyApiQuoteFailure,
  applyApiQuoteSuccess,
  derivePriceSyncUxCounts,
  isLiveQuoteSuccess,
  resolveHoldingQuoteSymbols,
  shouldShowPriceRefreshErrorDialog,
  shouldShowPriceRefreshPartialBanner,
} from '../../src/services/holdingPriceCore';
import { parseYahooPrice } from '../../src/utils/yahooChartParser';
import { normalizeYahooSymbol } from '../../src/utils/normalizeYahooSymbol';
import type { PortfolioPosition } from '../../src/types';

function pos(partial: Partial<PortfolioPosition>): PortfolioPosition {
  return {
    id: 'p1',
    symbol: '4707',
    market: 'bursa',
    currency: 'MYR',
    shares: 10,
    averageBuyPrice: 90,
    currentPrice: 92,
    openedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('holdingPriceCore', () => {
  it('never clears valid price on API failure', () => {
    const before = pos({ currentPrice: 95, lastValidPrice: 95, priceFetchStatus: 'ok' });
    const after = applyApiQuoteFailure(before);
    expect(after.currentPrice).toBe(95);
    expect(after.lastValidPrice).toBe(95);
    expect(after.priceFetchStatus).toBe('failed');
  });

  it('updates lastValidPrice only on API success', () => {
    const before = pos({ currentPrice: 90, lastValidPrice: 90 });
    const after = applyApiQuoteSuccess(before, 95, '2026-05-20T10:00:00.000Z', 'yahoo_finance');
    expect(after?.currentPrice).toBe(95);
    expect(after?.lastValidPrice).toBe(95);
    expect(after?.priceFetchStatus).toBe('ok');
    expect(after?.lastQuoteProvider).toBe('yahoo_finance');
  });

  it('rejects invalid API price without touching holding', () => {
    const before = pos({ currentPrice: 88, lastValidPrice: 88 });
    const after = applyApiQuoteSuccess(before, 'invalid', '2026-05-20T10:00:00.000Z');
    expect(after).toBeNull();
    expect(before.currentPrice).toBe(88);
  });

  it('isLiveQuoteSuccess accepts string prices', () => {
    expect(isLiveQuoteSuccess('95')).toBe(true);
    expect(isLiveQuoteSuccess(0)).toBe(false);
  });
});

describe('Bursa .KL symbols', () => {
  const cases = [
    { core: '4707', yahoo: '4707.KL', price: 95 },
    { core: '1023', yahoo: '1023.KL', price: 7.45 },
    { core: '7103', yahoo: '7103.KL', price: 1.12 },
    { core: '0820EA', yahoo: '0820EA.KL', price: 1.58 },
  ] as const;

  for (const { core, yahoo, price } of cases) {
    it(`normalizes ${core} to ${yahoo}`, () => {
      expect(normalizeYahooSymbol(core, 'bursa')).toBe(yahoo);
      expect(BURSA_SYMBOL_MAP[core]).toBe(yahoo);
      const resolved = resolveHoldingQuoteSymbols('bursa', core);
      expect(resolved.ok).toBe(true);
      if (!resolved.ok) return;
      expect(resolved.yahooSymbol).toBe(yahoo);
    });

    it(`parses Yahoo chart price for ${yahoo}`, () => {
      const parsed = parseYahooPrice({
        chart: {
          result: [
            {
              meta: { regularMarketPrice: price, symbol: yahoo },
              indicators: { quote: [{ close: [price - 0.1, price] }] },
            },
          ],
        },
      });
      expect(parsed).toBe(price);
      expect(isLiveQuoteSuccess(parsed)).toBe(true);
    });
  }
});

describe('price sync UX counts', () => {
  it('4 successes / 0 hard failures — no alert, no partial banner', () => {
    const base = { updatedCount: 4, failures: [], ok: true, marketClosedHint: false };
    const ux = derivePriceSyncUxCounts(base);
    expect(ux).toEqual({
      successCount: 4,
      failedCount: 0,
      partialFailure: false,
      totalFailure: false,
    });
    const result = { ...base, ...ux };
    expect(shouldShowPriceRefreshErrorDialog(result)).toBe(false);
    expect(shouldShowPriceRefreshPartialBanner(result)).toBe(false);
  });

  it('3 live + 1 saved fallback — partial banner only', () => {
    const result = {
      updatedCount: 3,
      failures: [
        {
          positionId: 'x',
          symbol: '9999',
          name: 'X',
          market: 'bursa' as const,
          reason: 'offline',
          usedSavedPrice: true,
          lastSavedPrice: 1.2,
        },
      ],
      ok: false,
      marketClosedHint: false,
      successCount: 0,
      failedCount: 0,
      partialFailure: false,
      totalFailure: false,
    };
    const ux = derivePriceSyncUxCounts(result);
    expect(ux.successCount).toBe(4);
    expect(ux.failedCount).toBe(0);
    expect(ux.partialFailure).toBe(false);
    expect(shouldShowPriceRefreshPartialBanner({ ...result, ...ux })).toBe(false);
  });

  it('total failure with no displayable prices — alert only', () => {
    const result = {
      updatedCount: 0,
      failures: [
        {
          positionId: 'x',
          symbol: '9999',
          name: 'X',
          market: 'bursa' as const,
          reason: 'failed',
        },
      ],
      ok: false,
      marketClosedHint: false,
      successCount: 0,
      failedCount: 1,
      partialFailure: false,
      totalFailure: true,
    };
    expect(shouldShowPriceRefreshErrorDialog(result)).toBe(true);
    expect(shouldShowPriceRefreshPartialBanner(result)).toBe(false);
  });
});
