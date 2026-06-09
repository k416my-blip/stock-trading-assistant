/**
 * npx vitest run tests/unit/forwardValidationReproducibilityAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  classifyMacroCycle,
  matchesCoreDanger,
  shouldSkipReproStopSim,
} from '../../src/services/forwardValidation/forwardValidationReproducibilityAudit';
import type { EnrichedSidewaysTrade } from '../../src/services/forwardValidation/forwardValidationSpySidewaysValidityAudit';

describe('forwardValidationReproducibilityAudit', () => {
  it('classifies macro cycles', () => {
    expect(classifyMacroCycle('2022-02-04')).toBe('hike_2022');
    expect(classifyMacroCycle('2020-06-01')).toBe('cut_2020');
    expect(classifyMacroCycle('2024-01-01')).toBe('since_2023');
    expect(classifyMacroCycle('2025-04-01')).toBe('y2025_2026');
  });

  it('matches core danger condition', () => {
    const t: EnrichedSidewaysTrade = {
      id: '1',
      symbol: 'QQQ',
      signalDate: '2022-02-03',
      entryDate: '2022-02-04',
      exitDate: '2022-03-01',
      entryPrice: 100,
      exitPrice: 90,
      returnPct: -11,
      holdDays: 10,
      exitReason: 'max_hold',
      adx14: 25,
      macdHistPct: 0.2,
      dist52wPct: -6,
      bucket: 'sideways_deep',
      spyRegime: 'sideways',
      vixAtSignal: 24.35,
      spy63Pct: -3,
    };
    expect(matchesCoreDanger(t)).toBe(true);
    expect(shouldSkipReproStopSim(t, 'stop_2022_qqq_vix2426')).toBe(true);
  });
});
