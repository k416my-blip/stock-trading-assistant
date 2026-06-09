/**
 * npx vitest run tests/unit/forwardValidationMacdDist52ClusterMacroAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import { auditMacdDist52ClusterMacro } from '../../src/services/forwardValidation/forwardValidationMacdDist52ClusterMacroAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationMacdDist52ClusterMacroAudit', () => {
  it('cluster + other trade counts sum to cohort', () => {
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
      vixBars: flat('2024-01-01', 400, 20),
      latestDate: '2026-06-02',
      tradingDates: flat('2024-01-01', 400, 80).map((b) => b.date),
      fetchLog: { fetchedAt: new Date().toISOString(), successCount: 6, failureCount: 0, symbols: [] },
      symbolLatestDates: {},
    };
    const report = auditMacdDist52ClusterMacro({ bundle });
    expect(report.comparisons).toHaveLength(5);
    expect(report.cluster.tradeCount + report.other.tradeCount).toBe(report.cohortTradeCount);
  });
});
