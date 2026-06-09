import { describe, expect, it } from 'vitest';
import {
  buildLehmanCauseRanking,
  buildLehmanCommonFactors,
  deriveLehmanAvoidancePredicate,
  gradeLehmanFix,
} from '../../src/services/forwardValidation/forwardValidationLehmanBreakdownAudit';
import type { ForwardLehmanCounterfactualMetrics } from '../../src/types/forwardValidation';

function lossTrade(returnPct: number, symbol = 'QQQ') {
  return {
    signalDate: '2022-02-03',
    symbol,
    returnPct,
    vixAtSignal: 25,
    qqqMa200DevPct: -12,
    ndxDist52Pct: -18,
    cpiYoyPct: 8.5,
    us10yPct: 4.8,
    bucket: 'down',
    adx14: 30,
  } as never;
}

describe('forwardValidationLehmanBreakdownAudit', () => {
  it('buildLehmanCommonFactors counts QQQ in top losses', () => {
    const rows = buildLehmanCommonFactors([
      lossTrade(-11),
      lossTrade(-10, 'QQQ'),
      lossTrade(-9, 'HDV'),
    ]);
    const qqq = rows.find((r) => r.factorJa.includes('QQQ'));
    expect(qqq?.hitCount).toBeGreaterThanOrEqual(2);
  });

  it('buildLehmanCauseRanking orders by loss share', () => {
    const losses = [lossTrade(-15), lossTrade(-12), lossTrade(-8, 'HDV')];
    const all = [...losses, { ...lossTrade(4, 'SCHD'), returnPct: 4 }];
    const ranks = buildLehmanCauseRanking(losses, all);
    expect(ranks[0]!.rank).toBe(1);
    expect(ranks[0]!.lossSharePct).toBeGreaterThan(0);
  });

  it('gradeLehmanFix returns C when improvement small', () => {
    const base: ForwardLehmanCounterfactualMetrics = {
      labelJa: 'b',
      avoidConditionJa: '—',
      skippedCount: 0,
      tradeCount: 20,
      winRatePct: 80,
      profitFactor: 0.6,
      sharpe: -0.2,
      maxDrawdownPct: -47,
      cumulativeReturnPct: -18,
    };
    const cf = { ...base, cumulativeReturnPct: -16, maxDrawdownPct: -40, skippedCount: 2 };
    const { grade } = gradeLehmanFix({
      baseline: base,
      counterfactual: cf,
      primaryCause: null,
      coreDangerSkipped: 2,
    });
    expect(grade).toBe('C');
  });

  it('deriveLehmanAvoidancePredicate returns condition', () => {
    const { conditionJa } = deriveLehmanAvoidancePredicate(
      [{ causeId: 'vix', labelJa: 'A VIX', rank: 1, lossSharePct: 40, hitCount: 2, noteJa: '' }],
      [{ factorJa: 'VIX24-26', hitCount: 2, hitRatePct: 100 }],
    );
    expect(conditionJa.length).toBeGreaterThan(0);
  });
});
