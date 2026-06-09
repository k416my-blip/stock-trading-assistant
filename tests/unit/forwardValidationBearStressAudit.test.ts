/**
 * npx vitest run tests/unit/forwardValidationBearStressAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildBearRm3000Row,
  evaluateRuleVariantsInStress,
  gradeBearResilience,
  maxConsecutiveLosses,
} from '../../src/services/forwardValidation/forwardValidationBearStressAudit';
import type {
  ForwardBearStressPeriodMetrics,
  ForwardPassedTradeRecord,
} from '../../src/types/forwardValidation';

function trade(returnPct: number, exitDate: string): ForwardPassedTradeRecord {
  return {
    id: `t_${returnPct}_${exitDate}`,
    symbol: 'HDV' as ForwardPassedTradeRecord['symbol'],
    signalDate: '2020-03-01',
    entryDate: '2020-03-02',
    exitDate,
    entryPrice: 100,
    exitPrice: 100 + returnPct,
    returnPct,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -3,
    bucket: 'deep',
    spyRegime: 'down',
  };
}

function periodMetrics(
  overrides: Partial<ForwardBearStressPeriodMetrics>,
): ForwardBearStressPeriodMetrics {
  return {
    periodId: 'covid2020',
    labelJa: 'test',
    fromDate: '2020-02-01',
    toDate: '2020-06-30',
    tradeCount: 5,
    winRatePct: 80,
    avgReturnPct: 2,
    cumulativeReturnPct: 10,
    profitFactor: 2,
    sharpe: 1,
    maxDrawdownPct: -5,
    maxConsecutiveLosses: 1,
    ...overrides,
  };
}

describe('forwardValidationBearStressAudit', () => {
  it('counts max consecutive losses by exit order', () => {
    const trades = [
      trade(-2, '2020-03-10'),
      trade(-1, '2020-03-15'),
      trade(4, '2020-03-20'),
      trade(-3, '2020-04-01'),
    ];
    expect(maxConsecutiveLosses(trades)).toBe(2);
  });

  it('grades resilience A when all periods positive', () => {
    const { grade } = gradeBearResilience([
      periodMetrics({ periodId: 'covid2020', cumulativeReturnPct: 12, winRatePct: 85 }),
      periodMetrics({ periodId: 'bear2022', cumulativeReturnPct: 8, winRatePct: 82 }),
      periodMetrics({ periodId: 'since2025', cumulativeReturnPct: 6, winRatePct: 80 }),
    ]);
    expect(grade).toBe('A');
  });

  it('flags ineffective rule when variant without filter outperforms baseline', () => {
    const base = Array.from({ length: 10 }, (_, i) => trade(-4, `2020-03-${10 + i}`));
    const noVixWins = Array.from({ length: 10 }, (_, i) => trade(4, `2020-04-${10 + i}`));
    const { ineffectiveJa } = evaluateRuleVariantsInStress({
      variants: [
        { id: 'baseline', labelJa: '基準', trades: base },
        { id: 'no_vix', labelJa: 'VIX OFF', trades: noVixWins },
      ],
      baselineId: 'baseline',
    });
    expect(ineffectiveJa).toContain('VIX');
  });

  it('builds RM3000 row with lower lot for grade C', () => {
    const c = buildBearRm3000Row([periodMetrics({ cumulativeReturnPct: -2 })], 'C');
    const d = buildBearRm3000Row([periodMetrics({ cumulativeReturnPct: -10 })], 'D');
    expect(c.bearMarketLotMYR).toBeGreaterThan(d.bearMarketLotMYR);
    expect(c.recommendedCashPct).toBeLessThan(d.recommendedCashPct);
  });
});
