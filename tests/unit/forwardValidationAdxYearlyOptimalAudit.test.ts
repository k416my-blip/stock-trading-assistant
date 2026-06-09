/**
 * npx vitest run tests/unit/forwardValidationAdxYearlyOptimalAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildAdxYearlyCompareRow,
  buildAdxYearlyThresholdMetrics,
  evaluateAdxYearlyOptimal,
  evaluateYearSuperiority,
  tradesInSignalYear,
} from '../../src/services/forwardValidation/forwardValidationAdxYearlyOptimalAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(signalDate: string, returnPct: number): ForwardPassedTradeRecord {
  return {
    id: `${signalDate}_DGRO`,
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

describe('forwardValidationAdxYearlyOptimalAudit', () => {
  it('filters trades by signal year', () => {
    const trades = [mockTrade('2020-04-08', 3), mockTrade('2022-05-25', -5)];
    expect(tradesInSignalYear(trades, '2020', '2026-06-03')).toHaveLength(1);
    expect(tradesInSignalYear(trades, '2022', '2026-06-03')).toHaveLength(1);
  });

  it('builds yearly metrics', () => {
    const m = buildAdxYearlyThresholdMetrics([mockTrade('2020-04-08', 3), mockTrade('2020-04-09', -2)]);
    expect(m.tradeCount).toBe(2);
    expect(m.winRatePct).toBe(50);
    expect(m.cumulativeReturnPct).toBe(1);
  });

  it('compares year superiority by cumulative return', () => {
    const row = buildAdxYearlyCompareRow(
      '2020',
      [mockTrade('2020-04-08', 3), mockTrade('2020-04-09', 3)],
      [mockTrade('2020-04-08', 3)],
    );
    expect(row.superiorThreshold).toBe('adx20');
    expect(row.cumulativeDelta20Minus25).toBe(3);
    expect(evaluateYearSuperiority(row.adx20, row.adx25)).toBe('adx20');
  });

  it('evaluates year_2020_only verdict', () => {
    const yearlyRows = [
      buildAdxYearlyCompareRow('2020', [mockTrade('2020-04-08', 9)], [mockTrade('2020-04-08', 3)]),
      buildAdxYearlyCompareRow('2022', [mockTrade('2022-05-25', -5)], [mockTrade('2022-05-25', 3)]),
    ];
    const { verdict } = evaluateAdxYearlyOptimal({
      yearlyRows,
      adx20SuperiorYearCount: 1,
      adx25SuperiorYearCount: 1,
      adx20SuperiorYears: ['2020'],
      adx25SuperiorYears: ['2022'],
    });
    expect(verdict).toBe('year_2020_only');
  });

  it('evaluates multi_year_adx20 verdict', () => {
    const yearlyRows = [
      buildAdxYearlyCompareRow('2020', [mockTrade('2020-04-08', 9)], [mockTrade('2020-04-08', 3)]),
      buildAdxYearlyCompareRow('2022', [mockTrade('2022-05-25', 6)], [mockTrade('2022-05-25', 3)]),
    ];
    const { verdict } = evaluateAdxYearlyOptimal({
      yearlyRows,
      adx20SuperiorYearCount: 2,
      adx25SuperiorYearCount: 1,
      adx20SuperiorYears: ['2020', '2022'],
      adx25SuperiorYears: ['2021'],
    });
    expect(verdict).toBe('multi_year_adx20');
  });
});
