/**
 * npx vitest run tests/unit/forwardValidationMacdDist52PeriodAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditMacdDist52Period,
  matchesMacdDist52,
} from '../../src/services/forwardValidation/forwardValidationMacdDist52PeriodAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationMacdDist52PeriodAudit', () => {
  it('returns three periods summing to cohort count', () => {
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
    const report = auditMacdDist52Period({ bundle });
    expect(report.periods).toHaveLength(3);
    expect(report.periods.reduce((s, p) => s + p.tradeCount, 0)).toBe(report.cohortTradeCount);
  });

  it('matchesMacdDist52 requires both MACD and deep 52w', () => {
    const base = {
      macdHistPct: 0.3,
      dist52wPct: -6,
    } as ForwardPassedTradeRecord;
    expect(matchesMacdDist52(base)).toBe(true);
    expect(matchesMacdDist52({ ...base, macdHistPct: 0.1 })).toBe(false);
    expect(matchesMacdDist52({ ...base, dist52wPct: -4 })).toBe(false);
  });
});
