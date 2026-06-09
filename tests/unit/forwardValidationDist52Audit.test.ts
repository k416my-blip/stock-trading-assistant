/**
 * npx vitest run tests/unit/forwardValidationDist52Audit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditDist52Performance,
  classifyDist52Bucket,
} from '../../src/services/forwardValidation/forwardValidationDist52Audit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationDist52Audit', () => {
  it('classifyDist52Bucket assigns ranges correctly', () => {
    expect(classifyDist52Bucket(-3)).toBe('m2_m4');
    expect(classifyDist52Bucket(-2)).toBe('m2_m4');
    expect(classifyDist52Bucket(-4)).toBe('m4_m6');
    expect(classifyDist52Bucket(-12)).toBe('m12_plus');
    expect(classifyDist52Bucket(-14)).toBe('m12_plus');
    expect(classifyDist52Bucket(-1.5)).toBeNull();
  });

  it('auditDist52Performance returns six buckets', () => {
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
    const report = auditDist52Performance({ bundle });
    expect(report.buckets).toHaveLength(6);
  });
});
