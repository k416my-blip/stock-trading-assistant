/**
 * npx vitest run tests/unit/forwardValidationConditionBlockAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditConditionBlockRates,
  classifyPrimaryBlockCategory,
  aggregateConditionBlockStats,
} from '../../src/services/forwardValidation/forwardValidationConditionBlockAudit';
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

function mockBundle(): ForwardOhlcvBundle {
  const etfBars = {
    SCHD: flatBars('2024-01-01', 600, 80),
    VYM: flatBars('2024-01-01', 600, 110),
    DGRO: flatBars('2024-01-01', 600, 50),
    SPLG: flatBars('2024-01-01', 600, 60),
  };
  const spyBars = flatBars('2024-01-01', 600, 450);
  const tradingDates = etfBars.SCHD.map((b) => b.date);
  return {
    etfBars,
    spyBars,
    latestDate: tradingDates[tradingDates.length - 1]!,
    tradingDates,
    fetchLog: { fetchedAt: new Date().toISOString(), successCount: 5, failureCount: 0, symbols: [] },
    symbolLatestDates: {},
  };
}

describe('forwardValidationConditionBlockAudit', () => {
  it('classifyPrimaryBlockCategory assigns ADX before MACD', () => {
    expect(
      classifyPrimaryBlockCategory({
        adx14: 20,
        macdHistPct: 0.05,
        dist52wPct: -3,
        spyRegime: 'up',
        passes: false,
      }),
    ).toBe('adx');
  });

  it('aggregateConditionBlockStats rates sum to ~100%', () => {
    const stats = aggregateConditionBlockStats({
      bundle: mockBundle(),
      fromDate: '2024-01-01',
      toDate: '2024-06-01',
    });
    const sum =
      stats.rates.passedPct +
      stats.rates.pullbackPct +
      stats.rates.adxPct +
      stats.rates.macdPct +
      stats.rates.regimePct +
      stats.rates.otherPct;
    expect(stats.totalEvaluations).toBeGreaterThan(0);
    expect(sum).toBeGreaterThan(99);
    expect(sum).toBeLessThan(101);
  });

  it('auditConditionBlockRates returns full and gap periods', () => {
    const report = auditConditionBlockRates({ bundle: mockBundle() });
    expect(report.fullPeriod.fromDate).toBe('2024-01-01');
    expect(report.gapPeriod.fromDate).toBe('2026-04-14');
    expect(report.gapPeriod.toDate).toBe('2026-06-02');
    expect(report.fullPeriod.ranking.length).toBeGreaterThan(0);
  });
});
