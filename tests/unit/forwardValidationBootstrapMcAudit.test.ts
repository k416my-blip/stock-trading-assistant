import { describe, expect, it } from 'vitest';
import {
  bootstrapSampleTrades,
  BOOTSTRAP_MC_RUNS,
  gradeBootstrapMcOperational,
  pickMinimumSafeCapital,
} from '../../src/services/forwardValidation/forwardValidationBootstrapMcAudit';
import type { ForwardBootstrapMcCapitalRow } from '../../src/types/forwardValidation';

function trade(id: string, ret: number) {
  return {
    id,
    symbol: 'QQQ',
    signalDate: '2020-01-01',
    entryDate: '2020-01-02',
    exitDate: '2020-02-01',
    returnPct: ret,
    holdDays: 20,
  } as never;
}

describe('forwardValidationBootstrapMcAudit', () => {
  it('bootstrapSampleTrades returns sampleSize items with unique ids', () => {
    const pool = [trade('a', 5), trade('b', -3), trade('c', 8)];
    let seed = 0;
    const sample = bootstrapSampleTrades(pool, () => (seed = (seed + 0.37) % 1), 0, 5);
    expect(sample).toHaveLength(5);
    expect(new Set(sample.map((t) => t.id)).size).toBe(5);
  });

  it('pickMinimumSafeCapital picks lowest capital with low bankruptcy', () => {
    const rows: ForwardBootstrapMcCapitalRow[] = [
      {
        capitalId: 'rm1000',
        capitalMYR: 1000,
        labelJa: 'RM1000',
        metrics: {
          runs: 100,
          sampleSize: 48,
          meanCumulativePct: 0,
          medianCumulativePct: 0,
          worstCumulativePct: -50,
          p5CumulativePct: -10,
          p1CumulativePct: -20,
          meanMaxDrawdownPct: -30,
          worstMaxDrawdownPct: -60,
          bankruptcyRatePct: 15,
          bankruptCount: 15,
        },
      },
      {
        capitalId: 'rm2000',
        capitalMYR: 2000,
        labelJa: 'RM2000',
        metrics: {
          runs: 100,
          sampleSize: 48,
          meanCumulativePct: 10,
          medianCumulativePct: 10,
          worstCumulativePct: -5,
          p5CumulativePct: 3,
          p1CumulativePct: 1,
          meanMaxDrawdownPct: -8,
          worstMaxDrawdownPct: -20,
          bankruptcyRatePct: 0,
          bankruptCount: 0,
        },
      },
    ];
    expect(pickMinimumSafeCapital(rows)).toBe(2000);
  });

  it('gradeBootstrapMcOperational returns A for zero bankruptcy', () => {
    const { grade } = gradeBootstrapMcOperational({
      rm3000: {
        runs: BOOTSTRAP_MC_RUNS,
        sampleSize: 48,
        meanCumulativePct: 20,
        medianCumulativePct: 18,
        worstCumulativePct: -5,
        p5CumulativePct: 8,
        p1CumulativePct: 3,
        meanMaxDrawdownPct: -10,
        worstMaxDrawdownPct: -25,
        bankruptcyRatePct: 0,
        bankruptCount: 0,
      },
      minimumSafeCapitalMYR: 2000,
    });
    expect(grade).toBe('A');
  });

  it('BOOTSTRAP_MC_RUNS is 1000', () => {
    expect(BOOTSTRAP_MC_RUNS).toBe(1000);
  });
});
