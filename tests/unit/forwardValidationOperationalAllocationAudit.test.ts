/**
 * npx vitest run tests/unit/forwardValidationOperationalAllocationAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  enrichTradesWithWeights,
  portfolioMaxDrawdownPct,
  weightForScheme,
} from '../../src/services/forwardValidation/forwardValidationOperationalAllocationAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

function mockTrade(signalDate: string, returnPct: number): ForwardPassedTradeRecord {
  return {
    id: signalDate,
    symbol: 'DGRO',
    signalDate,
    entryDate: signalDate,
    exitDate: signalDate,
    entryPrice: 25,
    exitPrice: 25 * (1 + returnPct / 100),
    returnPct,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 30,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime: 'down',
  };
}

const mockBundle = {
  vixBars: [
    { date: '2020-03-01', open: 25, high: 25, low: 25, close: 25 },
    { date: '2020-03-02', open: 30, high: 30, low: 30, close: 30 },
    { date: '2020-03-03', open: 40, high: 40, low: 40, close: 40 },
  ],
  etfBars: {
    DGRO: [{ date: '2020-03-01', open: 25, high: 26, low: 24, close: 25 }],
  },
} as unknown as ForwardOhlcvBundle;

describe('forwardValidationOperationalAllocationAudit', () => {
  it('assigns VIX band weights for scheme B and C', () => {
    expect(weightForScheme('A', 30)).toBe(1);
    expect(weightForScheme('B', 25)).toBe(1);
    expect(weightForScheme('B', 30)).toBe(1.5);
    expect(weightForScheme('B', 36)).toBe(2);
    expect(weightForScheme('C', 30)).toBe(2);
    expect(weightForScheme('C', 36)).toBe(3);
  });

  it('scales weighted returns by scheme', () => {
    const trades = [mockTrade('2020-03-03', 3)];
    const weighted = enrichTradesWithWeights(trades, mockBundle, 'C');
    expect(weighted[0]!.weightedReturnPct).toBe(9);
  });

  it('computes portfolio drawdown on weighted cumulative returns', () => {
    const dd = portfolioMaxDrawdownPct([10, -5, 3]);
    expect(dd).toBeLessThan(0);
  });
});
