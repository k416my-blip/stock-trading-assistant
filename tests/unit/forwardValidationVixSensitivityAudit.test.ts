/**
 * npx vitest run tests/unit/forwardValidationVixSensitivityAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildVixSensitivityRow,
  evaluateVix24Optimality,
  filterVixGteTrades,
} from '../../src/services/forwardValidation/forwardValidationVixSensitivityAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

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

describe('forwardValidationVixSensitivityAudit', () => {
  it('filters by VIX threshold', () => {
    const vixBars = [
      { date: '2020-03-01', open: 21, high: 21, low: 21, close: 21 },
      { date: '2020-03-02', open: 25, high: 25, low: 25, close: 25 },
    ];
    const trades = [mockTrade('2020-03-01', 3), mockTrade('2020-03-02', 3)];
    expect(filterVixGteTrades(trades, vixBars, 24)).toHaveLength(1);
    expect(filterVixGteTrades(trades, vixBars, 20)).toHaveLength(2);
  });

  it('computes profit efficiency when drawdown exists', () => {
    const row = buildVixSensitivityRow(24, [
      mockTrade('2020-03-01', 3),
      mockTrade('2020-03-02', -5),
    ]);
    expect(row.cumulativeReturnPct).toBe(-2);
    expect(row.profitEfficiency).not.toBeNull();
  });

  it('evaluates robust range when multiple thresholds similar', () => {
    const rows = [20, 22, 24, 26, 28, 30].map((th) => ({
      vixThreshold: th,
      labelJa: `VIX≥${th}`,
      tradeCount: 50 - th,
      winRatePct: 90 + (th === 24 ? 2 : 0),
      avgReturnPct: 2.5,
      maxDrawdownPct: -20,
      cumulativeReturnPct: 100 - th,
      profitEfficiency: 5,
    }));
    const { verdict } = evaluateVix24Optimality(rows);
    expect(['robust_range', 'optimal_24']).toContain(verdict);
  });
});
