/**
 * npx vitest run tests/unit/forwardValidationRateHikePhaseAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  classifyRatePhase,
  isQqqVix2426,
  shouldSkipRateHikeStopSim,
} from '../../src/services/forwardValidation/forwardValidationRateHikePhaseAudit';
import type { EnrichedSidewaysTrade } from '../../src/services/forwardValidation/forwardValidationSpySidewaysValidityAudit';

describe('forwardValidationRateHikePhaseAudit', () => {
  it('classifies 2022 hike phases', () => {
    expect(classifyRatePhase('2022-02-04')).toBe('hike_0_3m');
    expect(classifyRatePhase('2022-05-01')).toBe('hike_3_6m');
    expect(classifyRatePhase('2022-10-01')).toBe('hike_6_12m');
    expect(classifyRatePhase('2023-06-01')).toBe('hike_1y_plus');
    expect(classifyRatePhase('2019-06-01')).toBe('pre_hike');
  });

  it('detects QQQ VIX 24-26', () => {
    const t: EnrichedSidewaysTrade = {
      id: '1',
      symbol: 'QQQ',
      signalDate: '2022-02-04',
      entryDate: '2022-02-04',
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
      vixAtSignal: 24.5,
      spy63Pct: -3,
    };
    expect(isQqqVix2426(t)).toBe(true);
    expect(shouldSkipRateHikeStopSim(t, 'stop_hike_0_3m_vix2426')).toBe(true);
  });
});
