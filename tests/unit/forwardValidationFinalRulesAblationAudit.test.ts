/**
 * npx vitest run tests/unit/forwardValidationFinalRulesAblationAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildRuleRankings,
  buildTierRows,
  classifyRuleTier,
  evaluateFinalRulesAblation,
  FINAL_RULES_ABLATION_SCENARIOS,
} from '../../src/services/forwardValidation/forwardValidationFinalRulesAblationAudit';
import type { ForwardFinalRulesAblationMetrics } from '../../src/types/forwardValidation';

function mockMetrics(
  scenarioId: ForwardFinalRulesAblationMetrics['scenarioId'],
  labelJa: string,
  cum: number,
  wr: number,
  dd: number,
): ForwardFinalRulesAblationMetrics {
  return {
    scenarioId,
    labelJa,
    tradeCount: 50,
    winRatePct: wr,
    avgReturnPct: 2,
    maxDrawdownPct: dd,
    cumulativeReturnPct: cum,
    profitEfficiency: cum / Math.abs(dd),
    cumulativePctOfBaseline: 100,
    winRatePctOfBaseline: 100,
    profitEfficiencyPctOfBaseline: 100,
  };
}

describe('forwardValidationFinalRulesAblationAudit', () => {
  it('defines 12 scenarios including baseline and all_off', () => {
    expect(FINAL_RULES_ABLATION_SCENARIOS).toHaveLength(12);
    expect(FINAL_RULES_ABLATION_SCENARIOS.map((s) => s.id)).toContain('all_off');
  });

  it('ranks rules by cumulative degradation when removed', () => {
    const baseline = mockMetrics('baseline', '全ON', 130, 94, -19);
    const rows = [
      baseline,
      mockMetrics('no_adx', 'ADX OFF', 80, 85, -30),
      mockMetrics('no_vix', 'VIX OFF', 100, 80, -32),
      mockMetrics('no_52w', '52w OFF', 120, 88, -21),
      mockMetrics('no_spy63', 'SPY63 OFF', 125, 91, -19),
    ];
    const rankings = buildRuleRankings(baseline, rows);
    const top = [...rankings].sort((a, b) => a.profitRank - b.profitRank)[0];
    expect(top?.ruleId).toBe('adx');
  });

  it('classifies high-impact rules as required', () => {
    const tier = classifyRuleTier({
      ruleId: 'adx',
      labelJa: 'ADX>20',
      cumulativeDegradationPct: 38,
      maxDrawdownWorseningPct: 58,
      winRateDegradationPct: 9,
      qualityScore: 67,
      profitRank: 1,
      qualityRank: 1,
    });
    expect(tier).toBe('required');
  });

  it('evaluates final form when most rules are required', () => {
    const baseline = mockMetrics('baseline', '全ON', 134, 94.5, -19.4);
    const rankings = buildRuleRankings(baseline, [
      baseline,
      mockMetrics('no_adx', 'ADX OFF', 90, 88, -25),
      mockMetrics('no_vix', 'VIX OFF', 110, 80, -32),
      mockMetrics('no_52w', '52w OFF', 121, 88, -21),
      mockMetrics('no_spy63', 'SPY63 OFF', 128, 91, -19.4),
    ]);
    const tierRows = buildTierRows(rankings);
    const r = evaluateFinalRulesAblation({
      baseline,
      rows: [baseline, mockMetrics('all_off', '全部OFF', 200, 75, -40)],
      ruleRankings: rankings,
      tierRows,
    });
    expect(r.answer1Ja).toContain('ADX');
  });
});
