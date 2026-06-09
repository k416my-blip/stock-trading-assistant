/**
 * npx vitest run tests/unit/forwardValidationMacdDist52DedupDayAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditMacdDist52DedupDay,
  buildDayBuckets,
} from '../../src/services/forwardValidation/forwardValidationMacdDist52DedupDayAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationMacdDist52DedupDayAudit', () => {
  it('collapses same-day trades into one bucket', () => {
    const trades = [
      { signalDate: '2025-04-24', symbol: 'SCHD', returnPct: 3, exitReason: 'take_profit' },
      { signalDate: '2025-04-24', symbol: 'VYM', returnPct: 3, exitReason: 'take_profit' },
      { signalDate: '2025-04-25', symbol: 'DGRO', returnPct: 1, exitReason: 'max_hold' },
    ] as ForwardPassedTradeRecord[];
    const buckets = buildDayBuckets(trades);
    expect(buckets).toHaveLength(2);
    expect(buckets[0]!.tradeCount).toBe(2);
    expect(buckets[0]!.avgReturnPct).toBe(3);
    expect(buckets[1]!.hasMaxHold).toBe(true);
  });

  it('after dedup day count <= trade count', () => {
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
    const report = auditMacdDist52DedupDay({ bundle });
    expect(report.afterDedup.dayCount).toBeLessThanOrEqual(report.cohortTradeCount);
    expect(report.afterDedup.dayCount).toBe(report.uniqueSignalDays);
  });
});
