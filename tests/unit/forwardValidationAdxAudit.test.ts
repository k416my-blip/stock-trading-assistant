/**
 * npx vitest run tests/unit/forwardValidationAdxAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  adxDistributionBucket,
  auditAdxDetail,
} from '../../src/services/forwardValidation/forwardValidationAdxAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

function flatBars(start: string, days: number, price: number): OhlcvBar[] {
  const out: OhlcvBar[] = [];
  const d0 = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    const d = new Date(d0);
    d.setUTCDate(d0.getUTCDate() + i);
    out.push({
      date: d.toISOString().slice(0, 10),
      open: price,
      high: price * 1.01,
      low: price * 0.99,
      close: price,
    });
  }
  return out;
}

function mockBundle(): ForwardOhlcvBundle {
  const etfBars = {
    SCHD: flatBars('2024-01-01', 600, 80),
    VYM: flatBars('2024-01-01', 600, 110),
    DGRO: flatBars('2024-01-01', 600, 50),
    SPLG: flatBars('2024-01-01', 600, 60),
  };
  const spyBars = flatBars('2024-01-01', 600, 450);
  const tradingDates = etfBars.SCHD.map((b) => b.date);
  return {
    etfBars,
    spyBars,
    latestDate: tradingDates[tradingDates.length - 1]!,
    tradingDates,
    fetchLog: { fetchedAt: new Date().toISOString(), successCount: 5, failureCount: 0, symbols: [] },
    symbolLatestDates: {},
  };
}

describe('forwardValidationAdxAudit', () => {
  it('adxDistributionBucket maps values to labels', () => {
    expect(adxDistributionBucket(5)).toBe('0-10');
    expect(adxDistributionBucket(24.9)).toBe('20-25');
    expect(adxDistributionBucket(42)).toBe('40+');
  });

  it('auditAdxDetail returns distribution and per-etf stats', () => {
    const report = auditAdxDetail({ bundle: mockBundle(), fromDate: '2024-01-01', toDate: '2024-06-01' });
    expect(report.distribution).toHaveLength(7);
    expect(report.distribution.reduce((a, b) => a + b.count, 0)).toBe(report.adxAvailableCount);
    expect(report.perEtf).toHaveLength(4);
    expect(report.humanSummaryJa).toContain('ADX詳細監査');
  });
});
