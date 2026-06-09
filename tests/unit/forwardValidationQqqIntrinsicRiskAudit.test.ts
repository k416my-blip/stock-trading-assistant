/**
 * npx vitest run tests/unit/forwardValidationQqqIntrinsicRiskAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  matchesRiskSlice,
  shouldSkipQqqRiskStopSim,
} from '../../src/services/forwardValidation/forwardValidationQqqIntrinsicRiskAudit';
import type { EnrichedSidewaysTrade } from '../../src/services/forwardValidation/forwardValidationSpySidewaysValidityAudit';

function trade(
  symbol: string,
  signalDate: string,
  vix: number,
): EnrichedSidewaysTrade {
  return {
    id: '1',
    symbol: symbol as EnrichedSidewaysTrade['symbol'],
    signalDate,
    entryDate: signalDate,
    exitDate: '2022-03-01',
    entryPrice: 100,
    exitPrice: 90,
    returnPct: -5,
    holdDays: 10,
    exitReason: 'max_hold',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -6,
    bucket: 'sideways_deep',
    spyRegime: 'sideways',
    vixAtSignal: vix,
    spy63Pct: -3,
  };
}

describe('forwardValidationQqqIntrinsicRiskAudit', () => {
  it('matches hike vix2426 slice', () => {
    const t = trade('QQQ', '2022-02-04', 24.5);
    expect(matchesRiskSlice(t, 'hike_vix2426')).toBe(true);
    expect(matchesRiskSlice(t, 'y2022')).toBe(true);
  });

  it('skips QQQ hike 0-3m only for stop E', () => {
    const qqq = trade('QQQ', '2022-02-04', 25);
    const hdv = trade('HDV', '2022-02-04', 25);
    expect(shouldSkipQqqRiskStopSim(qqq, 'stop_qqq_hike_0_3m')).toBe(true);
    expect(shouldSkipQqqRiskStopSim(hdv, 'stop_qqq_hike_0_3m')).toBe(false);
    expect(shouldSkipQqqRiskStopSim(qqq, 'stop_qqq')).toBe(true);
  });
});
