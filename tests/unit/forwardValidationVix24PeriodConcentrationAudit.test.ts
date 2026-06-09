/**
 * npx vitest run tests/unit/forwardValidationVix24PeriodConcentrationAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  classifySignalPeriod,
  countVixOccurrences,
} from '../../src/services/forwardValidation/forwardValidationVix24PeriodConcentrationAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';

describe('forwardValidationVix24PeriodConcentrationAudit', () => {
  it('classifies signal dates into four periods', () => {
    expect(classifySignalPeriod('2024-06-01', '2026-06-02')).toBe('y2024');
    expect(classifySignalPeriod('2025-02-15', '2026-06-02')).toBe('y2025_q1');
    expect(classifySignalPeriod('2025-04-20', '2026-06-02')).toBe('y2025_apr_may');
    expect(classifySignalPeriod('2026-04-06', '2026-06-02')).toBe('y2025_jun_plus');
  });

  it('counts VIX threshold days', () => {
    const bars: OhlcvBar[] = [
      { date: '2025-04-01', open: 20, high: 20, low: 20, close: 20 },
      { date: '2025-04-02', open: 25, high: 25, low: 25, close: 25 },
      { date: '2025-04-03', open: 31, high: 31, low: 31, close: 31 },
      { date: '2025-04-04', open: 36, high: 36, low: 36, close: 36 },
    ];
    const counts = countVixOccurrences(bars, bars.map((b) => b.date), '2025-04-01', '2025-04-04');
    expect(counts.vixGte24Days).toBe(3);
    expect(counts.vixGte30Days).toBe(2);
    expect(counts.vixGte35Days).toBe(1);
  });
});
