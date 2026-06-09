/**
 * npx vitest run tests/unit/forwardValidationAdxDist52CrossAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditAdxDist52Cross,
  classifyAdxBucket,
} from '../../src/services/forwardValidation/forwardValidationAdxDist52CrossAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationAdxDist52CrossAudit', () => {
  it('classifyAdxBucket assigns ranges correctly', () => {
    expect(classifyAdxBucket(25)).toBeNull();
    expect(classifyAdxBucket(25.6)).toBe('a25_30');
    expect(classifyAdxBucket(30)).toBe('a25_30');
    expect(classifyAdxBucket(30.1)).toBe('a30_35');
    expect(classifyAdxBucket(50)).toBe('a40_50');
    expect(classifyAdxBucket(50.1)).toBe('a50_plus');
  });

  it('auditAdxDist52Cross returns 5x6 cells', () => {
    const flat = (start: string, days: number, price: number): OhlcvBar[] => {
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
    };
    const bundle: ForwardOhlcvBundle = {
      etfBars: {
        SCHD: flat('2024-01-01', 400, 80),
        VYM: flat('2024-01-01', 400, 110),
        DGRO: flat('2024-01-01', 400, 50),
        SPLG: flat('2024-01-01', 400, 60),
      },
      spyBars: flat('2024-01-01', 400, 450),
      latestDate: '2025-06-01',
      tradingDates: flat('2024-01-01', 400, 80).map((b) => b.date),
      fetchLog: { fetchedAt: new Date().toISOString(), successCount: 5, failureCount: 0, symbols: [] },
      symbolLatestDates: {},
    };
    const report = auditAdxDist52Cross({ bundle });
    expect(report.cells).toHaveLength(30);
  });
});
