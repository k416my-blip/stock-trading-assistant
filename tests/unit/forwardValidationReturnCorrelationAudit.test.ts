/**
 * npx vitest run tests/unit/forwardValidationReturnCorrelationAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditReturnCorrelation,
  pearsonCorrelation,
} from '../../src/services/forwardValidation/forwardValidationReturnCorrelationAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationReturnCorrelationAudit', () => {
  it('pearsonCorrelation returns 1 for perfect positive linear', () => {
    expect(pearsonCorrelation([1, 2, 3], [2, 4, 6])).toBe(1);
  });

  it('auditReturnCorrelation returns three metrics and ranking', () => {
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
    const report = auditReturnCorrelation({ bundle });
    expect(report.metrics).toHaveLength(3);
    expect(report.impactRanking).toHaveLength(3);
  });
});
