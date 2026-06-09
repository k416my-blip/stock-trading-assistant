/**
 * npx vitest run tests/unit/forwardValidationRateHike2022QqqClusterAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  isRateHike,
  isVix24_30,
  matchesQqqCondition,
  shouldSkipQqqStopSim,
} from '../../src/services/forwardValidation/forwardValidationRateHike2022QqqClusterAudit';
import type { EnrichedSidewaysTrade } from '../../src/services/forwardValidation/forwardValidationSpySidewaysValidityAudit';

function qqqTrade(signalDate: string, vix: number): EnrichedSidewaysTrade {
  return {
    id: '1',
    symbol: 'QQQ',
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

describe('forwardValidationRateHike2022QqqClusterAudit', () => {
  it('detects rate hike window', () => {
    expect(isRateHike('2022-06-01')).toBe(true);
    expect(isRateHike('2024-01-01')).toBe(false);
  });

  it('matches QQQ hike vix condition', () => {
    const t = qqqTrade('2022-02-04', 25);
    expect(matchesQqqCondition(t, 'qqq_hike_vix24')).toBe(true);
    expect(isVix24_30(25)).toBe(true);
  });

  it('skips 2022 QQQ only for stop_2022_qqq', () => {
    const t2022 = qqqTrade('2022-02-04', 25);
    const t2023 = qqqTrade('2023-02-04', 25);
    expect(shouldSkipQqqStopSim(t2022, 'stop_2022_qqq')).toBe(true);
    expect(shouldSkipQqqStopSim(t2023, 'stop_2022_qqq')).toBe(false);
  });
});
