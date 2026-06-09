import { describe, expect, it } from 'vitest';
import {
  BOOTSTRAP_MC_68_RUNS,
  gradeMalaysiaV2Weight,
  MALAYSIA_V2_WEIGHT_PATTERNS,
  pickAdoptedWeightPattern,
  pickRecommendedWeightPattern,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV2WeightAudit';
import type { ForwardMalaysiaV2WeightPatternRow } from '../../types/forwardValidation';

function row(
  patternId: ForwardMalaysiaV2WeightPatternRow['patternId'],
  cumulative: number,
  maxDep: number,
  sharpe = 1.5,
  weights: Record<string, number> = { '5347': 33, '5398': 33, '1023': 34 },
): ForwardMalaysiaV2WeightPatternRow {
  return {
    patternId,
    labelJa: patternId,
    weights,
    weightLabelJa: 'TENAGA/GAMUDA/CIMB',
    tradeCount: 20,
    cumulativeReturnPct: cumulative,
    cumulativeWithDividendPct: cumulative + 2,
    winRatePct: 80,
    profitFactor: 2,
    sharpe,
    maxDrawdownPct: -10,
    cagr: 8,
    bootstrap: {
      runs: 10000,
      bankruptcyRatePct: 0,
      p5CumulativePct: 10,
      worstCumulativePct: 5,
      worstMaxDrawdownPct: -12,
    },
    wfOos: {
      trainCumulativePct: 60,
      testCumulativePct: 15,
      cumulativeDegradationPct: 30,
      overfitVerdictJa: 'ok',
    },
    symbolDependencyPct: { '5398': maxDep },
    maxSingleDependencyPct: maxDep,
  };
}

describe('forwardValidationMalaysiaV2WeightAudit', () => {
  it('has 7 weight patterns', () => {
    expect(MALAYSIA_V2_WEIGHT_PATTERNS).toHaveLength(7);
  });

  it('BOOTSTRAP_MC_68_RUNS is 10000', () => {
    expect(BOOTSTRAP_MC_68_RUNS).toBe(10_000);
  });

  it('pickRecommendedWeightPattern prefers dependency under 60%', () => {
    const id = pickRecommendedWeightPattern([
      row('w33_33_33', 110, 58),
      row('w15_70_15', 120, 72),
    ]);
    expect(id).toBe('w33_33_33');
  });

  it('pickAdoptedWeightPattern keeps recommended when durable', () => {
    const patterns = [row('w33_33_33', 110, 58), row('w40_40_20', 105, 52)];
    const id = pickAdoptedWeightPattern({
      patterns,
      recommendedId: 'w40_40_20',
      dependencyUnder60Pct: true,
    });
    expect(id).toBe('w40_40_20');
  });

  it('gradeMalaysiaV2Weight returns A when under60 and durable', () => {
    const patterns = [row('w33_33_33', 110, 58), row('w40_40_20', 105, 52)];
    const { grade } = gradeMalaysiaV2Weight({
      patterns,
      recommendedId: 'w40_40_20',
      adoptedId: 'w40_40_20',
      dependencyUnder60Pct: true,
    });
    expect(grade).toBe('A');
  });
});
