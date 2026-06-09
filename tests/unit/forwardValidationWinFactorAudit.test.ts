import { describe, expect, it } from 'vitest';
import {
  classifyWinCluster,
  classifyWinFactorCohort,
  matchesWinKeepFilter,
  WIN_FACTOR_CLUSTER_DEFS,
} from '../../src/services/forwardValidation/forwardValidationWinFactorAudit';
import type { ForwardWinFactorTradeRow } from '../../src/types/forwardValidation';

function row(partial: Partial<ForwardWinFactorTradeRow>): ForwardWinFactorTradeRow {
  return {
    signalDate: '2020-04-06',
    symbol: 'DGRO',
    returnPct: 4,
    isWin: true,
    cohortId: 'y2020',
    ndxDist52Pct: -18,
    spyDist52Pct: -20,
    qqqMa200DevPct: -2,
    vix: 45,
    vixMomPct: 20,
    us10yPct: 0.7,
    hikeDaysFromStart: null,
    cpiYoyPct: 1.5,
    spySideways: false,
    adx14: 36,
    clusterId: 'other',
    clusterLabelJa: 'その他',
    ...partial,
  };
}

describe('forwardValidationWinFactorAudit', () => {
  it('classifyWinFactorCohort', () => {
    expect(classifyWinFactorCohort('2020-04-06')).toBe('y2020');
    expect(classifyWinFactorCohort('2022-06-01')).toBe('y2022');
    expect(classifyWinFactorCohort('2025-05-01')).toBe('y2025_2026');
  });

  it('classifyWinCluster prioritizes cut cycle and high vix', () => {
    const cut = classifyWinCluster(row({ vix: 45 }));
    expect(cut.clusterId).toBe('cut_cycle');
    const vix = classifyWinCluster(
      row({ signalDate: '2023-06-01', vix: 40, returnPct: 4 }),
    );
    expect(WIN_FACTOR_CLUSTER_DEFS.some((d) => d.clusterId === vix.clusterId)).toBe(true);
  });

  it('matchesWinKeepFilter for deep ndx and high vix', () => {
    const medians = { ndxDist52Pct: -12, vix: 30, adx14: 25, spyDist52Pct: -12 };
    expect(matchesWinKeepFilter(row({ ndxDist52Pct: -16 }), 'keep_deep_ndx15', medians)).toBe(
      true,
    );
    expect(matchesWinKeepFilter(row({ vix: 35 }), 'keep_high_vix30', medians)).toBe(true);
    expect(matchesWinKeepFilter(row({ vix: 25 }), 'keep_high_vix30', medians)).toBe(false);
  });
});
