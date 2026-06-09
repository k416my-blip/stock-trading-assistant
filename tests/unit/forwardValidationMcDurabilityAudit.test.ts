import { describe, expect, it } from 'vitest';
import {
  gradeMcDurabilityOperational,
  MC_DURABILITY_RUNS,
} from '../../src/services/forwardValidation/forwardValidationMcDurabilityAudit';
import type {
  ForwardMcDurabilityBaseline,
  ForwardMcDurabilitySummary,
} from '../../types/forwardValidation';

function mc(overrides: Partial<ForwardMcDurabilitySummary> = {}): ForwardMcDurabilitySummary {
  return {
    runs: MC_DURABILITY_RUNS,
    meanCumulativePct: 25,
    medianCumulativePct: 24,
    worstCumulativePct: 5,
    p5CumulativePct: 15,
    p1CumulativePct: 8,
    meanMaxDrawdownPct: -8,
    worstMaxDrawdownPct: -25,
    bankruptcyRatePct: 0,
    bankruptCount: 0,
    ...overrides,
  };
}

function baseline(overrides: Partial<ForwardMcDurabilityBaseline> = {}): ForwardMcDurabilityBaseline {
  return {
    tradeCount: 48,
    cumulativeReturnPct: 30,
    maxDrawdownPct: -4.3,
    sharpe: 2.1,
    profitFactor: 5.2,
    minEquityPct: 100,
    finalEquityMYR: 3900,
    ...overrides,
  };
}

describe('forwardValidationMcDurabilityAudit', () => {
  it('gradeMcDurabilityOperational returns A for zero bankruptcy and strong p5', () => {
    const { grade } = gradeMcDurabilityOperational({
      mc: mc({ bankruptcyRatePct: 0, p5CumulativePct: 18, worstCumulativePct: 3 }),
      baseline: baseline({ minEquityPct: 95 }),
    });
    expect(grade).toBe('A');
  });

  it('gradeMcDurabilityOperational returns D for high bankruptcy', () => {
    const { grade } = gradeMcDurabilityOperational({
      mc: mc({ bankruptcyRatePct: 12, worstCumulativePct: -40, p5CumulativePct: -5 }),
      baseline: baseline(),
    });
    expect(grade).toBe('D');
  });

  it('gradeMcDurabilityOperational returns B for low bankruptcy and positive p5', () => {
    const { grade } = gradeMcDurabilityOperational({
      mc: mc({ bankruptcyRatePct: 0.5, p5CumulativePct: 6, worstCumulativePct: -5 }),
      baseline: baseline({ minEquityPct: 80 }),
    });
    expect(grade).toBe('B');
  });

  it('MC_DURABILITY_RUNS is 1000', () => {
    expect(MC_DURABILITY_RUNS).toBe(1000);
  });
});
