/**
 * npx vitest run tests/unit/forwardValidationSpy63Adx20Audit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildSpy63AddedTrades,
  buildSpy63RegimeRows,
  evaluateSpy63Adx20Recommendation,
  normalizeSpyRegime,
} from '../../src/services/forwardValidation/forwardValidationSpy63Adx20Audit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(
  id: string,
  signalDate: string,
  returnPct: number,
  spyRegime = 'down',
): ForwardPassedTradeRecord {
  return {
    id,
    symbol: 'DGRO',
    signalDate,
    entryDate: signalDate,
    exitDate: signalDate,
    entryPrice: 25,
    exitPrice: 25.75,
    returnPct,
    holdDays: 8,
    exitReason: 'take_profit',
    adx14: 22,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime,
  };
}

describe('forwardValidationSpy63Adx20Audit', () => {
  it('normalizes SPY regime', () => {
    expect(normalizeSpyRegime('up')).toBe('up');
    expect(normalizeSpyRegime('sideways')).toBe('sideways');
    expect(normalizeSpyRegime('unknown')).toBe('unknown');
  });

  it('finds added trades when SPY63 filter removed', () => {
    const withSpy = [mockTrade('a', '2020-04-08', 3)];
    const withoutSpy = [mockTrade('a', '2020-04-08', 3), mockTrade('b', '2021-03-09', -2, 'up')];
    const added = buildSpy63AddedTrades(withSpy, withoutSpy);
    expect(added).toHaveLength(1);
    expect(added[0]!.returnPct).toBe(-2);
    expect(added[0]!.spyRegime).toBe('up');
  });

  it('builds regime rows for added trades', () => {
    const regimes = buildSpy63RegimeRows([
      { signalDate: '2020-01-01', symbol: 'DGRO', returnPct: 3, holdDays: 5, spyRegime: 'up' },
      { signalDate: '2020-02-01', symbol: 'SCHD', returnPct: -2, holdDays: 5, spyRegime: 'down' },
    ]);
    expect(regimes.find((r) => r.regime === 'up')!.tradeCount).toBe(1);
    expect(regimes.find((r) => r.regime === 'down')!.tradeCount).toBe(1);
  });

  it('recommends maintain when SPY63 improves WR and DD', () => {
    const metrics = (cum: number, wr: number, dd: number) => ({
      labelJa: 'x',
      tradeCount: 50,
      winRatePct: wr,
      avgReturnPct: 2,
      maxDrawdownPct: dd,
      cumulativeReturnPct: cum,
      profitEfficiency: 5,
    });
    const r = evaluateSpy63Adx20Recommendation({
      withSpy63: metrics(130, 94, -15),
      withoutSpy63: metrics(150, 85, -25),
      addedTrades: [{ signalDate: '2021-01-01', symbol: 'DGRO', returnPct: 5, holdDays: 8, spyRegime: 'up' }],
      addedByYear: [{ year: '2021', tradeCount: 1, winRatePct: 100, cumulativeReturnPct: 5 }],
      regimeRows: [
        { regime: 'up', labelJa: 'SPY up', tradeCount: 1, winRatePct: 100, cumulativeReturnPct: 5 },
        { regime: 'sideways', labelJa: 'SPY sideways', tradeCount: 0, winRatePct: 0, cumulativeReturnPct: 0 },
        { regime: 'down', labelJa: 'SPY down', tradeCount: 0, winRatePct: 0, cumulativeReturnPct: 0 },
      ],
      withSpy63Trades: [mockTrade('a', '2020-01-01', 3)],
      withoutSpy63Trades: [mockTrade('a', '2020-01-01', 3), mockTrade('b', '2021-01-01', 5, 'up')],
      toDate: '2026-06-02',
    });
    expect(r.recommendation).toBe('maintain');
  });
});
