/**
 * npx vitest run tests/unit/forwardValidationWalkForward31Audit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildWalkForward31PhaseMetrics,
  dedupOneEtfPerDayWinRateWithHistory,
  isCollapsedTestPhase,
  simulateOperationalWinRateWithSeed,
} from '../../src/services/forwardValidation/forwardValidationWalkForward31Audit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function trade(
  signalDate: string,
  symbol: string,
  returnPct: number,
  entryDate?: string,
  exitDate?: string,
): ForwardPassedTradeRecord {
  return {
    id: `${signalDate}_${symbol}`,
    symbol: symbol as ForwardPassedTradeRecord['symbol'],
    signalDate,
    entryDate: entryDate ?? signalDate,
    exitDate: exitDate ?? signalDate,
    entryPrice: 100,
    exitPrice: 100 + returnPct,
    returnPct,
    holdDays: 1,
    exitReason: 'take_profit',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -3,
    bucket: 'deep',
    spyRegime: 'down',
  };
}

describe('forwardValidationWalkForward31Audit', () => {
  it('uses seed history for win-rate dedup', () => {
    const seed = [trade('2020-01-01', 'HDV', 4), trade('2020-01-02', 'HDV', 4)];
    const day = [
      trade('2021-01-05', 'HDV', 4),
      trade('2021-01-05', 'QQQ', 4),
    ];
    const deduped = dedupOneEtfPerDayWinRateWithHistory(day, ['HDV', 'QQQ'], seed);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.symbol).toBe('HDV');
  });

  it('detects collapsed test phase', () => {
    const train = buildWalkForward31PhaseMetrics('train', '2018-01-01', '2020-12-31', [
      trade('2019-01-01', 'HDV', 4),
    ]);
    const test = buildWalkForward31PhaseMetrics('test', '2021-01-01', '2021-12-31', [
      trade('2021-06-01', 'HDV', -5),
    ]);
    expect(isCollapsedTestPhase(train, test)).toBe(true);
  });

  it('runs operational sim with seed without throwing', () => {
    const executed = simulateOperationalWinRateWithSeed(
      [trade('2021-01-05', 'SCHD', 3, '2021-01-06', '2021-01-20')],
      ['SCHD', 'HDV'],
      [],
    );
    expect(executed.length).toBeGreaterThanOrEqual(0);
  });
});
