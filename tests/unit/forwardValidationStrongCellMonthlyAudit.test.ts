/**
 * npx vitest run tests/unit/forwardValidationStrongCellMonthlyAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditStrongCellMonthly,
  matchesStrongestCell,
} from '../../src/services/forwardValidation/forwardValidationStrongCellMonthlyAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationStrongCellMonthlyAudit', () => {
  it('monthly rows sum to strong cell count', () => {
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
    const report = auditStrongCellMonthly({ bundle });
    const monthlySum = report.monthlyRows.reduce((s, r) => s + r.tradeCount, 0);
    expect(monthlySum).toBe(report.strongCellTradeCount);
    expect(report.aprilClusterCount + report.excludingApril.tradeCount).toBe(report.strongCellTradeCount);
  });

  it('matchesStrongestCell uses MACD, 52w, and down regime', () => {
    const base = {
      symbol: 'VYM',
      signalDate: '2025-04-01',
      entryDate: '2025-04-02',
      exitDate: '2025-04-10',
      returnPct: 3,
      holdDays: 8,
      exitReason: 'take_profit' as const,
      adx14: 40,
      macdHistPct: 0.3,
      dist52wPct: -6,
      bucket: 'down' as const,
    };
    expect(matchesStrongestCell(base as ForwardPassedTradeRecord)).toBe(true);
    expect(matchesStrongestCell({ ...base, macdHistPct: 0.1 } as ForwardPassedTradeRecord)).toBe(false);
    expect(matchesStrongestCell({ ...base, dist52wPct: -4 } as ForwardPassedTradeRecord)).toBe(false);
    expect(matchesStrongestCell({ ...base, bucket: 'up' } as ForwardPassedTradeRecord)).toBe(false);
  });
});
