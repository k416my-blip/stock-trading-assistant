/**
 * npx vitest run tests/unit/forwardValidationFourFactorComboAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditFourFactorCombo,
  classifyMacdBucket,
} from '../../src/services/forwardValidation/forwardValidationFourFactorComboAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

describe('forwardValidationFourFactorComboAudit', () => {
  it('classifyMacdBucket assigns bands above 0.1', () => {
    expect(classifyMacdBucket(0.1)).toBeNull();
    expect(classifyMacdBucket(0.15)).toBe('m01_02');
    expect(classifyMacdBucket(0.55)).toBe('m05_plus');
  });

  it('auditFourFactorCombo returns spotlight and top10', () => {
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
    const report = auditFourFactorCombo({ bundle });
    expect(report.top10ByReturn.length).toBeLessThanOrEqual(10);
    expect(report.spotlightDownAdx35MacdPosDist10).toBeDefined();
  });
});
