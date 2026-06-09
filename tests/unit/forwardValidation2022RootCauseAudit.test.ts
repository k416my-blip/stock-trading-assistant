import { describe, expect, it } from 'vitest';
import {
  cpiYoyAt,
  computeTradeRootMetrics,
  shouldSkipRootCauseStopSim,
  classifyRootCauseCohort,
} from '../../src/services/forwardValidation/forwardValidation2022RootCauseAudit';
import type { EnrichedSidewaysTrade } from '../../src/services/forwardValidation/forwardValidationSpySidewaysValidityAudit';

function trade(partial: Partial<EnrichedSidewaysTrade>): EnrichedSidewaysTrade {
  return {
    signalDate: '2022-02-03',
    entryDate: '2022-02-04',
    exitDate: '2022-03-01',
    symbol: 'QQQ',
    returnPct: -11.128,
    adx14: 25,
    macdHistPct: 0.5,
    dist52wPct: -5,
    bucket: 'down',
    spyRegime: 'down',
    vixAtSignal: 24.35,
    spy63Pct: -5,
    holdDays: 25,
    exitReason: 'max_hold',
    ...partial,
  } as EnrichedSidewaysTrade;
}

describe('forwardValidation2022RootCauseAudit', () => {
  it('cpiYoyAt returns nearest month value', () => {
    expect(cpiYoyAt('2022-02-03')).toBe(7.9);
    expect(cpiYoyAt('2022-04-15')).toBe(8.5);
  });

  it('classifyRootCauseCohort identifies 2022 loss', () => {
    expect(classifyRootCauseCohort(trade({ returnPct: -5 }))).toBe('y2022_loss');
    expect(classifyRootCauseCohort(trade({ returnPct: 4, signalDate: '2022-06-01' }))).toBe(
      'y2022_other',
    );
    expect(
      classifyRootCauseCohort(
        trade({ signalDate: '2020-08-11', returnPct: 4, symbol: 'DGRO' }),
      ),
    ).toBe('cut2020_win');
  });

  it('shouldSkipRootCauseStopSim for core danger and ndx drawdown', () => {
    const metrics = computeTradeRootMetrics({
      trade: trade({ vixAtSignal: 24.35 }),
      qqqBars: [],
      spyBars: [],
      vixBars: [],
      tnxBars: [],
    });
    expect(shouldSkipRootCauseStopSim(metrics, trade({ vixAtSignal: 24.35 }), 'stop_hike03_qqq_vix2426')).toBe(
      true,
    );
    const deepMetrics = { ...metrics, ndxDist52Pct: -16 };
    expect(shouldSkipRootCauseStopSim(deepMetrics, trade({}), 'stop_ndx_dist15')).toBe(true);
    expect(shouldSkipRootCauseStopSim(deepMetrics, trade({}), 'stop_ndx_dist20')).toBe(false);
  });
});
