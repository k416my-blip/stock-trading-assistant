/**
 * npx vitest run tests/unit/forwardValidationOperationalRebacktestAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  gradeOperationalFeasibility,
  simulateOperationalTrades,
} from '../../src/services/forwardValidation/forwardValidationOperationalRebacktestAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(
  signalDate: string,
  entryDate: string,
  exitDate: string,
  symbol: 'SCHD' | 'VYM' | 'DGRO' | 'SPLG',
  returnPct = 3,
): ForwardPassedTradeRecord {
  return {
    id: `${signalDate}-${symbol}`,
    symbol,
    signalDate,
    entryDate,
    exitDate,
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

describe('forwardValidationOperationalRebacktestAudit', () => {
  it('picks one ETF per day and respects max 3 concurrent', () => {
    const trades = [
      mockTrade('2020-03-01', '2020-03-02', '2020-03-20', 'SCHD'),
      mockTrade('2020-03-01', '2020-03-02', '2020-03-20', 'DGRO'),
      mockTrade('2020-03-03', '2020-03-04', '2020-03-25', 'VYM'),
      mockTrade('2020-03-05', '2020-03-06', '2020-03-26', 'SPLG'),
      mockTrade('2020-03-07', '2020-03-08', '2020-03-28', 'SCHD'),
      mockTrade('2020-03-09', '2020-03-10', '2020-03-30', 'VYM'),
      mockTrade('2020-03-11', '2020-03-12', '2020-04-01', 'DGRO'),
    ];
    const { executed, skippedCount } = simulateOperationalTrades(trades);
    expect(executed.some((t) => t.symbol === 'DGRO' && t.signalDate === '2020-03-01')).toBe(true);
    expect(executed.some((t) => t.symbol === 'SCHD' && t.signalDate === '2020-03-01')).toBe(false);
    expect(skippedCount).toBeGreaterThan(0);
    expect(executed.length).toBeLessThan(trades.length);
  });

  it('grades A for strong operational metrics', () => {
    const grade = gradeOperationalFeasibility({
      labelJa: 'test',
      tradeCount: 50,
      winCount: 48,
      winRatePct: 96,
      avgReturnPct: 2.8,
      avgMaxDrawdownPct: -2,
      worstTradeMaxDrawdownPct: -5,
      cumulativeReturnPct: 120,
      skippedSignalCount: 10,
    });
    expect(grade.grade).toBe('A');
  });
});
