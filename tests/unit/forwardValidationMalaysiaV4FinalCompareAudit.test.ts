import { describe, expect, it } from 'vitest';
import {
  COMPOSITE_WEIGHTS,
  computeCompositeScores,
  gradeFinalCompareAdoption,
  MALAYSIA_V4_FINAL_COMPARE_CANDIDATES,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4FinalCompareAudit';
import type { ForwardMalaysiaV4FinalCompareRow } from '../../src/types/forwardValidation';

function stubRow(
  id: ForwardMalaysiaV4FinalCompareRow['candidateId'],
  label: string,
  input: Partial<ForwardMalaysiaV4FinalCompareRow>,
): ForwardMalaysiaV4FinalCompareRow {
  return {
    candidateId: id,
    candidateLabelJa: label,
    candidateSymbol: '0000',
    cumulativeReturnPct: 0,
    sharpe: null,
    profitFactor: null,
    maxDrawdownPct: 0,
    minEquityMYR: 0,
    delistBankruptcyRatePct: 0,
    delistP5MinEquityMYR: 0,
    oosCumulativeReturnPct: 0,
    oosCandidatePnlMYR: 0,
    oosTradeCount: 0,
    oosWinRatePct: 0,
    oosProfitFactor: null,
    bootstrap1000: {
      runs: 1000,
      meanCumulativePct: 0,
      p5CumulativePct: 0,
      meanCandidatePnlMYR: 0,
      oosNegativeRatePct: 0,
    },
    monteCarlo10000: {
      runs: 10000,
      bankruptcyRatePct: 0,
      meanCumulativePct: 0,
      p5CumulativePct: 0,
    },
    compositeScore: 0,
    compositeRank: 0,
    fetchOk: true,
    ...input,
  };
}

describe('forwardValidationMalaysiaV4FinalCompareAudit', () => {
  it('defines five final compare candidates including IJM', () => {
    expect(MALAYSIA_V4_FINAL_COMPARE_CANDIDATES).toHaveLength(5);
    expect(MALAYSIA_V4_FINAL_COMPARE_CANDIDATES.map((c) => c.labelJa)).toEqual([
      'IJM',
      'CELCOMDIGI',
      'MISC',
      'MAYBANK',
      'INARI',
    ]);
  });

  it('composite weights sum to 1', () => {
    const sum =
      COMPOSITE_WEIGHTS.cumulative +
      COMPOSITE_WEIGHTS.delistMc +
      COMPOSITE_WEIGHTS.maxDd +
      COMPOSITE_WEIGHTS.oos;
    expect(sum).toBeCloseTo(1, 5);
  });

  it('computeCompositeScores ranks IJM first when MC advantage dominates', () => {
    const rows = [
      stubRow('v4_ijm', 'IJM', {
        cumulativeReturnPct: 38.4,
        maxDrawdownPct: -6,
        delistBankruptcyRatePct: 4.4,
        oosCumulativeReturnPct: 2,
      }),
      stubRow('v4_celcomdigi', 'CELCOMDIGI', {
        cumulativeReturnPct: 43.6,
        maxDrawdownPct: -12,
        delistBankruptcyRatePct: 24.1,
        oosCumulativeReturnPct: 1,
      }),
    ];
    computeCompositeScores(rows);
    const ijm = rows.find((r) => r.candidateId === 'v4_ijm')!;
    const cel = rows.find((r) => r.candidateId === 'v4_celcomdigi')!;
    expect(ijm.compositeRank).toBe(1);
    expect(ijm.compositeScore).toBeGreaterThan(cel.compositeScore);
  });

  it('gradeFinalCompareAdoption returns A for IJM meeting targets', () => {
    const ijm = stubRow('v4_ijm', 'IJM', {
      cumulativeReturnPct: 38.4,
      delistBankruptcyRatePct: 4.4,
      compositeScore: 72,
      compositeRank: 1,
    });
    const { grade } = gradeFinalCompareAdoption({ best: ijm, ijm });
    expect(grade).toBe('A');
  });

  it('gradeFinalCompareAdoption returns B for high cum but elevated MC', () => {
    const cel = stubRow('v4_celcomdigi', 'CELCOMDIGI', {
      cumulativeReturnPct: 43.6,
      delistBankruptcyRatePct: 8,
      compositeScore: 60,
      compositeRank: 1,
    });
    const { grade } = gradeFinalCompareAdoption({ best: cel, ijm: null });
    expect(grade).toBe('B');
  });
});
