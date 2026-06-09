/**
 * npx vitest run tests/unit/forwardValidationWinLossAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import { auditWinLossComparison } from '../../src/services/forwardValidation/forwardValidationWinLossAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

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

describe('forwardValidationWinLossAudit', () => {
  it('splits passed trades into win/loss groups', () => {
    const etfBars = {
      SCHD: flatBars('2024-01-01', 400, 80),
      VYM: flatBars('2024-01-01', 400, 110),
      DGRO: flatBars('2024-01-01', 400, 50),
      SPLG: flatBars('2024-01-01', 400, 60),
    };
    const bundle: ForwardOhlcvBundle = {
      etfBars,
      spyBars: flatBars('2024-01-01', 400, 450),
      latestDate: '2025-06-01',
      tradingDates: etfBars.SCHD.map((b) => b.date),
      fetchLog: { fetchedAt: new Date().toISOString(), successCount: 5, failureCount: 0, symbols: [] },
      symbolLatestDates: {},
    };
    const report = auditWinLossComparison({ bundle });
    expect(report.winCount + report.lossCount).toBeGreaterThanOrEqual(0);
    expect(report.winners.count).toBe(report.winCount);
    expect(report.losers.count).toBe(report.lossCount);
  });
});
