import { describe, expect, it } from 'vitest';
import {
  BOOTSTRAP_MC_70_RUNS,
  gradeMalaysiaV3Dca,
  MALAYSIA_V3_DCA_PLANS,
  pickBestDcaPlan,
  simulateMalaysiaV3DcaPath,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV3DcaAudit';
import type { ForwardMalaysiaV3DcaPlanRow } from '../../types/forwardValidation';

function planRow(
  planId: ForwardMalaysiaV3DcaPlanRow['planId'],
  monthly: number,
  final: number,
  m10k: number | null,
): ForwardMalaysiaV3DcaPlanRow {
  return {
    planId,
    labelJa: planId,
    monthlyContributionMYR: monthly,
    initialCapitalMYR: 3000,
    totalContributedMYR: 3000 + monthly * 24,
    finalEquityMYR: final,
    equityAt1yr: 4000,
    equityAt3yr: 8000,
    equityAt5yr: 12000,
    maxDrawdownPct: -10,
    cagr: 8,
    sharpe: 1.1,
    monthsToRm10000: m10k,
    monthsToRm30000: 48,
    monthsToRm100000: 96,
    ytlAddedMonth: 12,
    ytlAddedDate: '2017-06-01',
    bootstrap: {
      runs: 10000,
      bankruptcyRatePct: 0,
      p5FinalEquityMYR: final * 0.8,
      worstFinalEquityMYR: final * 0.5,
      worstMaxDrawdownPct: -15,
    },
    wfOos: {
      testFinalEquityMYR: 5000,
      testContributedMYR: 4000,
      testReturnPct: 25,
      overfitVerdictJa: 'ok',
    },
  };
}

describe('forwardValidationMalaysiaV3DcaAudit', () => {
  it('has 4 DCA plans including lump sum', () => {
    expect(MALAYSIA_V3_DCA_PLANS).toHaveLength(4);
  });

  it('BOOTSTRAP_MC_70_RUNS is 10000', () => {
    expect(BOOTSTRAP_MC_70_RUNS).toBe(10_000);
  });

  it('simulateMalaysiaV3DcaPath increases equity with monthly contribution', () => {
    const trades = [
      {
        id: 't1',
        symbol: '5347',
        signalDate: '2018-01-15',
        entryDate: '2018-01-16',
        exitDate: '2018-02-10',
        returnPct: 5,
        entryPrice: 10,
        adx14: 25,
        macdHistPct: 1,
        dist52wPct: 0,
      },
    ] as never[];
    const lump = simulateMalaysiaV3DcaPath({
      trades,
      fromDate: '2018-01-01',
      toDate: '2019-12-31',
      monthlyContributionMYR: 0,
    });
    const dca = simulateMalaysiaV3DcaPath({
      trades,
      fromDate: '2018-01-01',
      toDate: '2019-12-31',
      monthlyContributionMYR: 500,
    });
    expect(dca.totalContributedMYR).toBeGreaterThan(lump.totalContributedMYR);
    expect(dca.finalEquityMYR).toBeGreaterThanOrEqual(lump.finalEquityMYR);
  });

  it('pickBestDcaPlan prefers higher final equity among DCA plans', () => {
    const id = pickBestDcaPlan([
      planRow('lump_sum', 0, 8000, 36),
      planRow('dca_500', 500, 12000, 24),
      planRow('dca_1000', 1000, 18000, 18),
    ]);
    expect(id).toBe('dca_1000');
  });

  it('gradeMalaysiaV3Dca returns A when fast and durable', () => {
    const plans = [planRow('lump_sum', 0, 8000, 36), planRow('dca_1000', 1000, 20000, 18)];
    const { grade } = gradeMalaysiaV3Dca({ plans, bestPlanId: 'dca_1000' });
    expect(grade).toBe('A');
  });
});
