import { describe, expect, it } from 'vitest';
import {
  BOOTSTRAP_MC_67_RUNS,
  gradeMalaysiaV2Diversification,
  MALAYSIA_V2_DIVERSIFICATION_PATTERNS,
  pickRecommendedPattern,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV2DiversificationAudit';
import type { ForwardMalaysiaV2DiversificationPatternRow } from '../../types/forwardValidation';

function row(
  patternId: ForwardMalaysiaV2DiversificationPatternRow['patternId'],
  cumulative: number,
  maxDep: number,
  sharpe = 1.5,
): ForwardMalaysiaV2DiversificationPatternRow {
  return {
    patternId,
    labelJa: patternId,
    symbols: [],
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

describe('forwardValidationMalaysiaV2DiversificationAudit', () => {
  it('has 4 diversification patterns', () => {
    expect(MALAYSIA_V2_DIVERSIFICATION_PATTERNS).toHaveLength(4);
  });

  it('BOOTSTRAP_MC_67_RUNS is 10000', () => {
    expect(BOOTSTRAP_MC_67_RUNS).toBe(10_000);
  });

  it('pickRecommendedPattern prefers dependency under 50%', () => {
    const id = pickRecommendedPattern([
      row('p2', 140, 86),
      row('p4', 120, 42, 1.8),
    ]);
    expect(id).toBe('p4');
  });

  it('gradeMalaysiaV2Diversification returns A when under50 and durable', () => {
    const patterns = [row('p2', 140, 86), row('p4', 130, 45)];
    const { grade } = gradeMalaysiaV2Diversification({
      patterns,
      recommendedId: 'p4',
      dependencyUnder50Pct: true,
    });
    expect(grade).toBe('A');
  });
});
