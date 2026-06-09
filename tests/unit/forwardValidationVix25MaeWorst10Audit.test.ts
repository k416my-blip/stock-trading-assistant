/**
 * npx vitest run tests/unit/forwardValidationVix25MaeWorst10Audit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditVix25MaeWorst10,
  formatVix25MaeWorst10Csv,
} from '../../src/services/forwardValidation/forwardValidationVix25MaeWorst10Audit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationVix25MaeWorst10Audit', () => {
  it('returns worst10 sorted by mae ascending', () => {
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
      vixBars: flat('2024-01-01', 400, 28),
      latestDate: '2026-06-02',
      tradingDates: flat('2024-01-01', 400, 80).map((b) => b.date),
      fetchLog: { fetchedAt: new Date().toISOString(), successCount: 6, failureCount: 0, symbols: [] },
      symbolLatestDates: {},
    };
    const report = auditVix25MaeWorst10({ bundle });
    expect(report.worst10.length).toBeLessThanOrEqual(10);
    for (let i = 1; i < report.worst10.length; i++) {
      expect(report.worst10[i]!.maePct).toBeGreaterThanOrEqual(report.worst10[i - 1]!.maePct);
    }
    expect(formatVix25MaeWorst10Csv(report)).toContain('maePct');
  });
});
