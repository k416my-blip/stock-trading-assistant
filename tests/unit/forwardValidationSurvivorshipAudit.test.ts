/**
 * npx vitest run tests/unit/forwardValidationSurvivorshipAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildExtendedPriority,
  buildExtendedUniverse,
  buildSurvivorshipCohortMetrics,
  dedupOneEtfPerDayWithPriority,
  evaluateSelectionBias,
  simulateOperationalTradesWithPriority,
} from '../../src/services/forwardValidation/forwardValidationSurvivorshipAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(signalDate: string, symbol: string, returnPct = 3): ForwardPassedTradeRecord {
  return {
    id: `${signalDate}-${symbol}`,
    symbol: symbol as ForwardPassedTradeRecord['symbol'],
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

describe('forwardValidationSurvivorshipAudit', () => {
  it('builds extended universe from fetched list', () => {
    const uni = buildExtendedUniverse(['SCHD', 'SPY', 'VOO']);
    expect(uni).toContain('SCHD');
    expect(uni).toContain('SPY');
    expect(uni).toContain('VOO');
  });

  it('prefers baseline priority on same day', () => {
    const priority = buildExtendedPriority(['DGRO', 'SPY']);
    const deduped = dedupOneEtfPerDayWithPriority(
      [mockTrade('2020-03-01', 'SPY'), mockTrade('2020-03-01', 'DGRO')],
      priority,
    );
    expect(deduped[0]!.symbol).toBe('DGRO');
  });

  it('evaluates not biased when metrics are close', () => {
    const base = buildSurvivorshipCohortMetrics('4', ['SCHD'], [mockTrade('2020-03-01', 'SCHD')]);
    const ext = buildSurvivorshipCohortMetrics(
      'ext',
      ['SCHD', 'SPY'],
      [mockTrade('2020-03-01', 'SPY')],
      new Set(['SCHD', 'VYM', 'DGRO', 'SPLG']),
    );
    const { verdict } = evaluateSelectionBias(base, ext);
    expect(verdict).toBe('not_biased');
  });

  it('simulates max concurrent when entries overlap', () => {
    const trades = [
      { ...mockTrade('2020-03-01', 'DGRO'), exitDate: '2020-03-20' },
      { ...mockTrade('2020-03-02', 'DGRO'), exitDate: '2020-03-21' },
      { ...mockTrade('2020-03-03', 'DGRO'), exitDate: '2020-03-22' },
      { ...mockTrade('2020-03-04', 'DGRO'), exitDate: '2020-03-23' },
    ];
    const { executed, skippedCount } = simulateOperationalTradesWithPriority(trades, { DGRO: 4 });
    expect(executed.length).toBe(3);
    expect(skippedCount).toBe(1);
  });
});
