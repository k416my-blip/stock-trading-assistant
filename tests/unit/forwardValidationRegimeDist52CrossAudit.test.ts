/**
 * npx vitest run tests/unit/forwardValidationRegimeDist52CrossAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import { auditRegimeDist52Cross } from '../../src/services/forwardValidation/forwardValidationRegimeDist52CrossAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationRegimeDist52CrossAudit', () => {
  it('returns 4x6 cells including zeros', () => {
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
    const report = auditRegimeDist52Cross({ bundle });
    expect(report.cells).toHaveLength(24);
    expect(report.minCellTrades).toBe(3);
    expect(report.displayCells.every((c) => c.tradeCount >= 3)).toBe(true);
    if (report.displayCells.length > 0) {
      expect(report.displayCells[0].takeProfitRatePct).toBeTypeOf('number');
      expect(report.displayCells[0].maxHoldRatePct).toBeTypeOf('number');
    }
  });
});
