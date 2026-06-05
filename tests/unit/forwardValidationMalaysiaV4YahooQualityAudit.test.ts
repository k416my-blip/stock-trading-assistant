import { describe, expect, it } from 'vitest';
import {
  analyzeBarQuality,
  gradeYahooProduction,
  V4_YAHOO_QUALITY_SYMBOLS,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4YahooQualityAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';

function makeBars(count: number): OhlcvBar[] {
  const bars: OhlcvBar[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date('2020-01-01T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    bars.push({
      date: d.toISOString().slice(0, 10),
      open: 10,
      high: 10.5,
      low: 9.5,
      close: 10 + i * 0.01,
      volume: 1000,
    });
  }
  return bars;
}

describe('forwardValidationMalaysiaV4YahooQualityAudit', () => {
  it('covers five v4 symbols', () => {
    expect(V4_YAHOO_QUALITY_SYMBOLS).toHaveLength(5);
  });

  it('analyzeBarQuality returns low missing for dense bars', () => {
    const q = analyzeBarQuality(makeBars(200));
    expect(q.missingRatePct).toBeLessThan(20);
    expect(q.anomalyRatePct).toBeLessThan(100);
  });

  it('analyzeBarQuality returns 100 missing for empty', () => {
    const q = analyzeBarQuality([]);
    expect(q.missingRatePct).toBe(100);
  });

  it('gradeYahooProduction returns A for excellent metrics', () => {
    const { grade } = gradeYahooProduction({
      missingRatePct: 2,
      anomalyRatePct: 1,
      updateDelayDays: 1,
      successRatePct: 100,
      twelveAvailable: false,
      avgCorrelation: null,
    });
    expect(grade).toBe('A');
  });
});
