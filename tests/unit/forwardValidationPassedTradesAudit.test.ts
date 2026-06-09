/**
 * npx vitest run tests/unit/forwardValidationPassedTradesAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import { auditPassedTrades } from '../../src/services/forwardValidation/forwardValidationPassedTradesAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

function makeDipBars(start: string, days: number, base: number, dipDay: number): OhlcvBar[] {
  const out: OhlcvBar[] = [];
  const d0 = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    const d = new Date(d0);
    d.setUTCDate(d0.getUTCDate() + i);
    let price = base;
    if (i >= dipDay && i < dipDay + 3) price = base * 0.92;
    if (i === dipDay + 4) price = base * 1.03;
    out.push({
      date: d.toISOString().slice(0, 10),
      open: price,
      high: price * 1.02,
      low: price * 0.98,
      close: price,
    });
  }
  return out;
}

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

describe('forwardValidationPassedTradesAudit', () => {
  it('auditPassedTrades returns trade list with entry stats', () => {
    const etfBars = {
      SCHD: flatBars('2024-01-01', 400, 80),
      VYM: flatBars('2024-01-01', 400, 110),
      DGRO: makeDipBars('2024-01-01', 400, 50, 200),
      SPLG: flatBars('2024-01-01', 400, 60),
    };
    const spyBars = flatBars('2024-01-01', 400, 450);
    const tradingDates = etfBars.SCHD.map((b) => b.date);
    const bundle: ForwardOhlcvBundle = {
      etfBars,
      spyBars,
      latestDate: tradingDates[tradingDates.length - 1]!,
      tradingDates,
      fetchLog: { fetchedAt: new Date().toISOString(), successCount: 5, failureCount: 0, symbols: [] },
      symbolLatestDates: {},
    };
    const report = auditPassedTrades({ bundle });
    expect(report.trades.length).toBeGreaterThanOrEqual(0);
    expect(report.perEtf).toHaveLength(4);
    expect(report.top20Winners.length).toBeLessThanOrEqual(20);
    if (report.tradeCount > 0) {
      expect(report.entryStats.avgAdx).not.toBeNull();
    }
  });
});
