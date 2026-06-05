import { describe, expect, it } from 'vitest';
import {
  applyYtlStressTrades,
  BOOTSTRAP_MC_74_RUNS,
  buildPhase4WithoutYtl,
  buildReplacementPhaseWeights,
  gradeMalaysiaV3YtlDependency,
  MALAYSIA_V3_YTL_STRESS_SCENARIOS,
  pickTopReplacements,
  pickWorstYtlScenario,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV3YtlDependencyAudit';
import type { ForwardMalaysiaV3YtlReplacementRow, ForwardMalaysiaV3YtlStressScenarioRow } from '../../types/forwardValidation';

function stressRow(
  scenarioId: ForwardMalaysiaV3YtlStressScenarioRow['scenarioId'],
  cumulative: number,
  bankruptcy: number,
): ForwardMalaysiaV3YtlStressScenarioRow {
  return {
    scenarioId,
    labelJa: scenarioId,
    cumulativeReturnPct: cumulative,
    maxDrawdownPct: -20,
    minEquityMYR: 5000,
    finalEquityMYR: 50000,
    profitContributionPct: {},
    ytlNetContributionPct: 54,
    ytlPositiveDependencyPct: 20,
    bootstrap: {
      runs: 10000,
      bankruptcyRatePct: bankruptcy,
      p5MinEquityMYR: 4000,
      worstMinEquityMYR: 3000,
    },
    survived: cumulative > -50,
  };
}

describe('forwardValidationMalaysiaV3YtlDependencyAudit', () => {
  it('has 6 YTL stress scenarios', () => {
    expect(MALAYSIA_V3_YTL_STRESS_SCENARIOS).toHaveLength(6);
  });

  it('BOOTSTRAP_MC_74_RUNS is 10000', () => {
    expect(BOOTSTRAP_MC_74_RUNS).toBe(10_000);
  });

  it('applyYtlStressTrades delists YTL', () => {
    const out = applyYtlStressTrades([{ symbol: '6742', returnPct: 10 }] as never[], 'ytl_delist');
    expect(out[0]!.returnPct).toBe(-100);
  });

  it('buildPhase4WithoutYtl removes YTL weight', () => {
    const w = buildPhase4WithoutYtl();
    expect(w.phase4['6742']).toBe(0);
    expect(w.phase4['5347']).toBeGreaterThan(28);
  });

  it('buildReplacementPhaseWeights swaps YTL slot', () => {
    const w = buildReplacementPhaseWeights('3816');
    expect(w.phase4['6742']).toBe(0);
    expect(w.phase4['3816']).toBeCloseTo(28.333, 1);
  });

  it('pickWorstYtlScenario picks highest bankruptcy', () => {
    const worst = pickWorstYtlScenario([
      stressRow('baseline', 37, 0),
      stressRow('ytl_delist', -50, 25),
      stressRow('ytl_minus70', 10, 5),
    ]);
    expect(worst.scenarioId).toBe('ytl_delist');
  });

  it('pickTopReplacements ranks by score', () => {
    const top = pickTopReplacements([
      {
        replacementId: 'r_misc',
        labelJa: 'MISC',
        symbol: '3816',
        cumulativeReturnPct: 30,
        maxDrawdownPct: -10,
        sharpe: 1.2,
        replacementNetContributionPct: 20,
        ytlNetContributionPct: 0,
        fetchOk: true,
      },
      {
        replacementId: 'r_maybank',
        labelJa: 'MAYBANK',
        symbol: '1155',
        cumulativeReturnPct: 35,
        maxDrawdownPct: -8,
        sharpe: 1.4,
        replacementNetContributionPct: 25,
        ytlNetContributionPct: 0,
        fetchOk: true,
      },
    ] as ForwardMalaysiaV3YtlReplacementRow[]);
    expect(top[0]!.replacementId).toBe('r_maybank');
  });

  it('gradeMalaysiaV3YtlDependency returns C when YTL dependent', () => {
    const baseline = stressRow('baseline', 37, 0);
    const worst = stressRow('ytl_delist', -30, 20);
    const { grade } = gradeMalaysiaV3YtlDependency({
      baseline,
      worst,
      ytlNetContributionPct: 54,
      topReplacements: [],
    });
    expect(grade).toBe('C');
  });
});
