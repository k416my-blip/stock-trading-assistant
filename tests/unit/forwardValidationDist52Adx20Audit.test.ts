/**
 * npx vitest run tests/unit/forwardValidationDist52Adx20Audit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildAddedTrades,
  buildAddedYearRows,
  evaluateDist52Adx20Recommendation,
} from '../../src/services/forwardValidation/forwardValidationDist52Adx20Audit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(id: string, signalDate: string, returnPct: number): ForwardPassedTradeRecord {
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
    spyRegime: 'down',
  };
}

describe('forwardValidationDist52Adx20Audit', () => {
  it('finds added trades when 52w removed', () => {
    const with52w = [mockTrade('a', '2020-04-08', 3)];
    const without52w = [mockTrade('a', '2020-04-08', 3), mockTrade('b', '2022-05-25', -5)];
    const added = buildAddedTrades(with52w, without52w);
    expect(added).toHaveLength(1);
    expect(added[0]!.returnPct).toBe(-5);
  });

  it('builds year rows for added trades', () => {
    const added = buildAddedTrades(
      [mockTrade('a', '2020-04-08', 3)],
      [mockTrade('a', '2020-04-08', 3), mockTrade('b', '2022-05-25', 3)],
    );
    const years = buildAddedYearRows(added, ['2020', '2022', '2025', '2026'], '2026-06-03');
    expect(years.find((y) => y.year === '2022')!.tradeCount).toBe(1);
    expect(years.find((y) => y.year === '2020')!.tradeCount).toBe(0);
  });

  it('recommends maintain when with52w cumulative is higher', () => {
    const r = evaluateDist52Adx20Recommendation({
      with52w: {
        labelJa: 'with',
        tradeCount: 50,
        winRatePct: 90,
        avgReturnPct: 2,
        maxDrawdownPct: -10,
        cumulativeReturnPct: 120,
        profitEfficiency: 12,
      },
      without52w: {
        labelJa: 'without',
        tradeCount: 60,
        winRatePct: 85,
        avgReturnPct: 1.5,
        maxDrawdownPct: -15,
        cumulativeReturnPct: 100,
        profitEfficiency: 6.7,
      },
      addedTrades: [{ signalDate: '2022-01-01', symbol: 'DGRO', returnPct: -20, holdDays: 25 }],
      ablationRankings: [
        { ruleId: 'dist52', labelJa: '52週', cumulativeDegradationPct: 30, overallDegradationPct: 25 },
        { ruleId: 'macd', labelJa: 'MACD', cumulativeDegradationPct: 20, overallDegradationPct: 15 },
      ],
      addedByYear: [{ year: '2022', tradeCount: 1, winRatePct: 0, cumulativeReturnPct: -20 }],
    });
    expect(r.recommendation).toBe('maintain');
    expect(r.is52wMostImportant).toBe(true);
  });
});
