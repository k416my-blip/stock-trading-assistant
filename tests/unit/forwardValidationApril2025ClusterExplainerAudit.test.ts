/**
 * npx vitest run tests/unit/forwardValidationApril2025ClusterExplainerAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditApril2025ClusterExplainer,
  classifyHoldDaysBucket,
  filterApril2025Cluster,
} from '../../src/services/forwardValidation/forwardValidationApril2025ClusterExplainerAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

describe('forwardValidationApril2025ClusterExplainerAudit', () => {
  it('filters april 2025 cluster by signal month', () => {
    const mk = (date: string): ForwardPassedTradeRecord => ({
      id: date,
      symbol: 'SCHD',
      signalDate: date,
      entryDate: date,
      exitDate: date,
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
    });
    const cluster = filterApril2025Cluster([mk('2025-04-01'), mk('2025-05-01')]);
    expect(cluster).toHaveLength(1);
    expect(classifyHoldDaysBucket(7)).toBe('h1_7');
    expect(classifyHoldDaysBucket(25)).toBe('h22_25');
  });

  it('returns five factor sections', () => {
    const flat = (start: string, days: number, price: number) => {
      const out = [];
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
    const bundle = {
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
    const report = auditApril2025ClusterExplainer({ bundle });
    expect(report.sections).toHaveLength(5);
    expect(report.clusterMonth).toBe('2025-04');
  });
});
