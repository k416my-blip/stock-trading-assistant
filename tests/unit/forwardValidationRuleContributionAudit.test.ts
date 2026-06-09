/**
 * npx vitest run tests/unit/forwardValidationRuleContributionAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  passesFinalRuleAblation,
  scanSignalAtBarAblation,
} from '../../src/services/forwardValidation/case4Indicators';
import {
  buildRuleContributionDegradation,
  buildRuleContributionRow,
  evaluateRuleContribution,
  RULE_CONTRIBUTION_SCENARIOS,
} from '../../src/services/forwardValidation/forwardValidationRuleContributionAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(returnPct: number): ForwardPassedTradeRecord {
  return {
    id: 't1',
    symbol: 'DGRO',
    signalDate: '2020-03-01',
    entryDate: '2020-03-02',
    exitDate: '2020-03-10',
    entryPrice: 25,
    exitPrice: 25.75,
    returnPct,
    holdDays: 6,
    exitReason: 'take_profit',
    adx14: 30,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime: 'down',
  };
}

describe('forwardValidationRuleContributionAudit', () => {
  it('defines six ablation scenarios', () => {
    expect(RULE_CONTRIBUTION_SCENARIOS).toHaveLength(6);
    expect(RULE_CONTRIBUTION_SCENARIOS.map((s) => s.id)).toContain('no_vix');
  });

  it('passes without dist52 when ablated', () => {
    expect(
      passesFinalRuleAblation(
        { bucket: 'down', dist52wPct: 0, adx14: 35, macdHistPct: 0.2 },
        { skipDist52: true },
      ),
    ).toBe(true);
  });

  it('computes degradation when rule excluded', () => {
    const baseline = buildRuleContributionRow(RULE_CONTRIBUTION_SCENARIOS[0]!, [
      mockTrade(3),
      mockTrade(3),
    ]);
    const noAdx = buildRuleContributionRow(RULE_CONTRIBUTION_SCENARIOS[1]!, [mockTrade(-2)]);
    const deg = buildRuleContributionDegradation(baseline, noAdx);
    expect(deg.cumulativeDegradationPct).toBeGreaterThan(0);
    expect(deg.overallDegradationPct).not.toBeNull();
  });

  it('evaluates multi rule critical when several ablations hurt', () => {
    const baseline = buildRuleContributionRow(RULE_CONTRIBUTION_SCENARIOS[0]!, [
      mockTrade(3),
      mockTrade(3),
      mockTrade(3),
    ]);
    const makeDeg = (id: (typeof RULE_CONTRIBUTION_SCENARIOS)[number], ret: number) => {
      const row = buildRuleContributionRow(id, [mockTrade(ret)]);
      return buildRuleContributionDegradation(baseline, row);
    };
    const degs = [
      {
        scenarioId: 'baseline' as const,
        labelJa: '基準',
        tradeCountDelta: 0,
        tradeCountDeltaPct: 0,
        winRateDegradationPct: 0,
        avgReturnDegradationPct: 0,
        maxDrawdownWorseningPct: 0,
        cumulativeDegradationPct: 0,
        profitEfficiencyDegradationPct: 0,
        overallDegradationPct: 0,
      },
      makeDeg(RULE_CONTRIBUTION_SCENARIOS[1]!, -5),
      makeDeg(RULE_CONTRIBUTION_SCENARIOS[2]!, -4),
      makeDeg(RULE_CONTRIBUTION_SCENARIOS[5]!, -3),
    ];
    degs[1]!.overallDegradationPct = 25;
    degs[2]!.overallDegradationPct = 20;
    degs[3]!.overallDegradationPct = 18;
    const { verdict } = evaluateRuleContribution(baseline, degs);
    expect(verdict).toBe('multi_rule_critical');
  });

  it('scanSignalAtBarAblation skips adx gate', () => {
    const bars = Array.from({ length: 120 }, (_, i) => ({
      date: `2020-01-${String((i % 28) + 1).padStart(2, '0')}`,
      open: 20,
      high: 21,
      low: 19,
      close: 20 + i * 0.01,
    }));
    const regimeMap = new Map<string, 'down'>();
    regimeMap.set(bars[119]!.date, 'down');
    const strict = scanSignalAtBarAblation(bars, 119, regimeMap, {});
    const noAdx = scanSignalAtBarAblation(bars, 119, regimeMap, { skipAdx: true });
    expect(noAdx).not.toBeNull();
    if (strict && noAdx) {
      expect(noAdx.passes || !strict.passes).toBe(true);
    }
  });
});
