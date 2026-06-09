/**
 * npx vitest run tests/unit/forwardValidationBacktestQualityAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  dedupOneEtfPerDay,
  maxConcurrentHoldingsStats,
  maxSameDaySignalStats,
  simulateCapitalConstraint,
} from '../../src/services/forwardValidation/forwardValidationBacktestQualityAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(
  signalDate: string,
  symbol: 'SCHD' | 'VYM' | 'DGRO' | 'SPLG',
  entryPrice = 25,
): ForwardPassedTradeRecord {
  return {
    id: `${signalDate}-${symbol}`,
    symbol,
    signalDate,
    entryDate: signalDate,
    exitDate: signalDate,
    entryPrice,
    exitPrice: entryPrice * 1.03,
    returnPct: 3,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 30,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime: 'down',
  };
}

describe('forwardValidationBacktestQualityAudit', () => {
  it('counts max same-day signals', () => {
    const trades = [
      mockTrade('2020-03-01', 'SCHD'),
      mockTrade('2020-03-01', 'VYM'),
      mockTrade('2020-03-01', 'DGRO'),
      mockTrade('2020-03-02', 'SPLG'),
    ];
    const stats = maxSameDaySignalStats(trades);
    expect(stats.maxCount).toBe(3);
    expect(stats.maxDate).toBe('2020-03-01');
  });

  it('dedups one ETF per day by priority', () => {
    const trades = [
      mockTrade('2020-03-01', 'SCHD'),
      mockTrade('2020-03-01', 'VYM'),
      mockTrade('2020-03-01', 'DGRO'),
    ];
    const deduped = dedupOneEtfPerDay(trades);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.symbol).toBe('DGRO');
  });

  it('tracks max concurrent holdings', () => {
    const trades: ForwardPassedTradeRecord[] = [
      { ...mockTrade('2020-01-01', 'SCHD'), exitDate: '2020-01-10' },
      { ...mockTrade('2020-01-05', 'VYM'), exitDate: '2020-01-15' },
      { ...mockTrade('2020-01-08', 'DGRO'), exitDate: '2020-01-20' },
      { ...mockTrade('2020-01-09', 'SPLG'), exitDate: '2020-01-12' },
    ];
    const stats = maxConcurrentHoldingsStats(trades, [
      '2020-01-01',
      '2020-01-05',
      '2020-01-08',
      '2020-01-09',
      '2020-01-10',
      '2020-01-12',
      '2020-01-15',
    ]);
    expect(stats.maxConcurrent).toBeGreaterThanOrEqual(3);
  });

  it('skips trades when capital per slot is insufficient', () => {
    const trades = [mockTrade('2020-03-01', 'SCHD', 3000)];
    const sim = simulateCapitalConstraint(trades, 1_000_000);
    expect(sim.skippedCapital).toBe(1);
    expect(sim.executedCount).toBe(0);
  });
});
