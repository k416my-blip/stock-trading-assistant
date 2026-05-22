import { describe, expect, it } from 'vitest';
import { evaluateProactiveAdvice } from '../../src/services/advisor-engine';
import { emptyPriceSyncResult } from '../../src/services/holdingPriceCore';
import type { PortfolioPosition } from '../../src/types';

function pos(partial: Partial<PortfolioPosition>): PortfolioPosition {
  return {
    id: 'p1',
    symbol: '4707',
    market: 'bursa',
    currency: 'MYR',
    shares: 10,
    averageBuyPrice: 90,
    currentPrice: 95,
    openedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('advisor-engine', () => {
  it('maps signals to candidates with reasonsJa', () => {
    const candidates = evaluateProactiveAdvice({
      holdings: [pos({ symbol: '1155' })],
      priceSync: {
        loading: false,
        marketClosedHint: false,
        lastResult: emptyPriceSyncResult(),
        lastSuccessAt: new Date().toISOString(),
      },
      urgencySignals: [],
      staleHoldingsCount: 0,
      degradedMode: false,
      buyCandidateTickers: [],
      sellCandidateTickers: [],
      previous: null,
      nowMs: Date.parse('2026-05-20T12:00:00.000Z'),
    });
    const withReasons = candidates.filter((c) => c.reasonsJa && c.reasonsJa.length > 0);
    expect(withReasons.length).toBeGreaterThan(0);
  });

  it('produces symbol-specific titles for holdings', () => {
    const candidates = evaluateProactiveAdvice({
      holdings: [pos({ symbol: '4707.KL', currentPrice: 95 })],
      priceSync: { loading: false, marketClosedHint: false, lastResult: emptyPriceSyncResult() },
      urgencySignals: [],
      staleHoldingsCount: 0,
      degradedMode: false,
      buyCandidateTickers: [],
      sellCandidateTickers: [],
      previous: null,
    });
    expect(candidates.some((c) => c.symbol === '4707.KL' || c.titleJa.includes('4707'))).toBe(true);
  });
});
