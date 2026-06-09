/**
 * npx vitest run tests/unit/forwardValidationMacdAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditMacdDetail,
  macdDistributionBucket,
} from '../../src/services/forwardValidation/forwardValidationMacdAudit';
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

describe('forwardValidationMacdAudit', () => {
  it('macdDistributionBucket maps histogram pct to labels', () => {
    expect(macdDistributionBucket(-0.1)).toBe('<0');
    expect(macdDistributionBucket(0.03)).toBe('0〜0.05%');
    expect(macdDistributionBucket(0.08)).toBe('0.05〜0.10%');
    expect(macdDistributionBucket(0.15)).toBe('0.10〜0.20%');
    expect(macdDistributionBucket(0.35)).toBe('0.20〜0.50%');
    expect(macdDistributionBucket(0.6)).toBe('0.50%以上');
  });

  it('auditMacdDetail returns distribution and adxPassThenMacdFailCount', () => {
    const report = auditMacdDetail({ bundle: mockBundle(), fromDate: '2024-01-01', toDate: '2024-06-01' });
    expect(report.distribution).toHaveLength(6);
    expect(report.distribution.reduce((a, b) => a + b.count, 0)).toBe(report.macdAvailableCount);
    expect(report.perEtf).toHaveLength(4);
    expect(report.adxPassThenMacdFailCount).toBeLessThanOrEqual(report.macdPrimaryFailCount);
    expect(report.humanSummaryJa).toContain('MACD詳細監査');
  });
});
