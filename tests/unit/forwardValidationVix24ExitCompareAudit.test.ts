/**
 * npx vitest run tests/unit/forwardValidationVix24ExitCompareAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import { auditVix24ExitCompare } from '../../src/services/forwardValidation/forwardValidationVix24ExitCompareAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationVix24ExitCompareAudit', () => {
  it('returns 5 exit scenarios', () => {
    const rising = (start: string, days: number, base: number): OhlcvBar[] => {
      const out: OhlcvBar[] = [];
      const d0 = new Date(`${start}T00:00:00Z`);
      for (let i = 0; i < days; i++) {
        const d = new Date(d0);
        d.setUTCDate(d0.getUTCDate() + i);
        const c = base + i * 0.5;
        out.push({
          date: d.toISOString().slice(0, 10),
          open: c,
          high: c * 1.02,
          low: c * 0.98,
          close: c,
        });
      }
      return out;
    };
    const bundle: ForwardOhlcvBundle = {
      etfBars: {
        SCHD: rising('2024-01-01', 400, 80),
        VYM: rising('2024-01-01', 400, 110),
        DGRO: rising('2024-01-01', 400, 50),
        SPLG: rising('2024-01-01', 400, 60),
      },
      spyBars: rising('2024-01-01', 400, 450),
      vixBars: rising('2024-01-01', 400, 28),
      latestDate: '2026-06-02',
      tradingDates: rising('2024-01-01', 400, 80).map((b) => b.date),
      fetchLog: { fetchedAt: new Date().toISOString(), successCount: 6, failureCount: 0, symbols: [] },
      symbolLatestDates: {},
    };
    const report = auditVix24ExitCompare({ bundle });
    expect(report.rows).toHaveLength(5);
    expect(report.rows.find((r) => r.isBaseline)?.takeProfitPct).toBe(3);
  });
});
