/**
 * npx vitest run tests/unit/forwardValidationHoldPeriodSensitivityAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildHoldDistribution,
  buildHoldPeriodSensitivityRow,
  buildProfitCapturePoints,
  evaluateHold25Robustness,
  HOLD_PERIOD_SENSITIVITY_LEVELS,
} from '../../src/services/forwardValidation/forwardValidationHoldPeriodSensitivityAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(signalDate: string, returnPct: number, holdDays: number): ForwardPassedTradeRecord {
  return {
    id: signalDate,
    symbol: 'DGRO',
    signalDate,
    entryDate: signalDate,
    exitDate: signalDate,
    entryPrice: 25,
    exitPrice: 25 * (1 + returnPct / 100),
    returnPct,
    holdDays,
    exitReason: holdDays >= 20 ? 'max_hold' : 'take_profit',
    adx14: 30,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime: 'down',
  };
}

describe('forwardValidationHoldPeriodSensitivityAudit', () => {
  it('includes hold levels 10 through 40', () => {
    expect(HOLD_PERIOD_SENSITIVITY_LEVELS).toEqual([10, 15, 20, 25, 30, 40]);
  });

  it('builds hold distribution buckets', () => {
    const dist = buildHoldDistribution([
      mockTrade('2020-03-01', 3, 4),
      mockTrade('2020-03-02', 3, 8),
      mockTrade('2020-03-03', -1, 22),
    ]);
    expect(dist.find((d) => d.bucketLabelJa === '1-5日')?.tradeCount).toBe(1);
    expect(dist.find((d) => d.bucketLabelJa === '6-10日')?.tradeCount).toBe(1);
  });

  it('computes profit capture share', () => {
    const trades = [
      mockTrade('2020-03-01', 3, 5),
      mockTrade('2020-03-02', 3, 12),
      mockTrade('2020-03-03', -2, 24),
    ];
    const points = buildProfitCapturePoints(25, trades);
    const p10 = points.find((p) => p.withinDays === 10)!;
    expect(p10.tradeSharePct).toBeGreaterThan(0);
    expect(p10.returnSharePct).toBeGreaterThan(0);
  });

  it('evaluates robust hold25 when profit captured early', () => {
    const rows = [10, 15, 20, 25, 30, 40].map((d) =>
      buildHoldPeriodSensitivityRow(
        d,
        Array.from({ length: 45 }, (_, i) =>
          mockTrade(`2020-03-${String((i % 28) + 1).padStart(2, '0')}`, 3, 8),
        ),
      ),
    );
    rows[5] = buildHoldPeriodSensitivityRow(
      40,
      Array.from({ length: 48 }, (_, i) =>
        mockTrade(`2020-04-${String((i % 28) + 1).padStart(2, '0')}`, 3, 9),
      ),
    );
    const { verdict } = evaluateHold25Robustness(rows, [
      { withinDays: 20, tradeCount: 42, tradeSharePct: 93, returnSharePct: 90 },
    ]);
    expect(['robust_hold25', 'optimal_hold25']).toContain(verdict);
  });
});
