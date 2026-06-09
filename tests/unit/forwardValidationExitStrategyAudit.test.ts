/**
 * npx vitest run tests/unit/forwardValidationExitStrategyAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  simulateExitWithStop,
  stopLossLabel,
} from '../../src/services/forwardValidation/forwardValidationExitStrategyAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';

function barsFromCloses(closes: number[], startDate = '2020-01-01'): OhlcvBar[] {
  return closes.map((close, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    return { date, open: close, high: close * 1.01, low: close * 0.99, close };
  });
}

describe('forwardValidationExitStrategyAudit', () => {
  it('labels stop loss configs', () => {
    expect(stopLossLabel({ kind: 'none' })).toBe('なし');
    expect(stopLossLabel({ kind: 'fixed', stopLossPct: 7 })).toBe('-7%');
    expect(stopLossLabel({ kind: 'atr', multiplier: 1.5 })).toBe('ATR×1.5');
  });

  it('hits take profit before max hold', () => {
    const bars = barsFromCloses([100, 100, 103, 104]);
    bars[2]!.high = 104;
    const exit = simulateExitWithStop(bars, 0, 5, 3, { kind: 'none' });
    expect(exit?.reason).toBe('take_profit');
    expect(exit?.returnPct).toBe(3);
  });

  it('hits fixed stop loss', () => {
    const bars = barsFromCloses([100, 100, 100, 100]);
    bars[2]!.low = 92;
    bars[2]!.high = 101;
    const exit = simulateExitWithStop(bars, 0, 5, 3, { kind: 'fixed', stopLossPct: 5 });
    expect(exit?.reason).toBe('stop_loss');
    expect(exit!.returnPct).toBeLessThan(0);
  });
});
