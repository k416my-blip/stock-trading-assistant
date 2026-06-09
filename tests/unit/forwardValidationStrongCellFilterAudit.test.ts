/**
 * npx vitest run tests/unit/forwardValidationStrongCellFilterAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import { auditStrongCellFilter } from '../../src/services/forwardValidation/forwardValidationStrongCellFilterAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationStrongCellFilterAudit', () => {
  it('excluded + remaining equals total trades', () => {
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
      latestDate: '2026-06-02',
      tradingDates: flat('2024-01-01', 400, 80).map((b) => b.date),
      fetchLog: { fetchedAt: new Date().toISOString(), successCount: 5, failureCount: 0, symbols: [] },
      symbolLatestDates: {},
    };
    const report = auditStrongCellFilter({ bundle });
    expect(report.excludedCount + report.remainingCount).toBe(report.totalTrades);
    expect(report.excludedWinners + report.excludedLosers).toBe(report.excludedCount);
    expect(report.remainingWinners + report.remainingLosers).toBe(report.remainingCount);
    expect(report.excludedLosers + report.remainingLosers).toBe(report.totalLosers);
  });
});
