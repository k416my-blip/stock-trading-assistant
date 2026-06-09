/**
 * npx vitest run tests/unit/forwardValidationDownDist10ReproAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditDownDist10Repro,
  matchesDownDist10,
} from '../../src/services/forwardValidation/forwardValidationDownDist10ReproAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationDownDist10ReproAudit', () => {
  it('returns three time periods', () => {
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
    const report = auditDownDist10Repro({ bundle });
    expect(report.periods).toHaveLength(3);
    expect(report.periods[0]!.id).toBe('p2024_h1');
    expect(report.periods[0]!.takeProfitRatePct).toBeTypeOf('number');
  });

  it('matches down regime with dist52 <= -10', () => {
    expect(
      matchesDownDist10({
        id: 'x',
        symbol: 'SCHD',
        signalDate: '2025-04-01',
        entryDate: '2025-04-02',
        exitDate: '2025-04-10',
        entryPrice: 1,
        exitPrice: 1.03,
        returnPct: 3,
        holdDays: 8,
        exitReason: 'take_profit',
        adx14: 35,
        macdHistPct: 0.2,
        dist52wPct: -11,
        bucket: 'down',
        spyRegime: 'down',
      }),
    ).toBe(true);
    expect(
      matchesDownDist10({
        id: 'y',
        symbol: 'SCHD',
        signalDate: '2025-04-01',
        entryDate: '2025-04-02',
        exitDate: '2025-04-10',
        entryPrice: 1,
        exitPrice: 1.03,
        returnPct: 3,
        holdDays: 8,
        exitReason: 'take_profit',
        adx14: 35,
        macdHistPct: 0.2,
        dist52wPct: -9,
        bucket: 'down',
        spyRegime: 'down',
      }),
    ).toBe(false);
  });
});
