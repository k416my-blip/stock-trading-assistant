/**
 * npx vitest run tests/unit/forwardValidationSignalGapAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  auditSignalGapSince,
  diagnoseEtfAtBar,
  SIGNAL_GAP_AUDIT_SINCE,
} from '../../src/services/forwardValidation/forwardValidationSignalGapAudit';
import { buildSpyRegimeMap, type OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import { defaultForwardValidationState } from '../../src/services/forwardValidation/forwardValidationStorage';
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
    SCHD: flatBars('2023-01-01', 900, 80),
    VYM: flatBars('2023-01-01', 900, 110),
    DGRO: flatBars('2023-01-01', 900, 50),
    SPLG: flatBars('2023-01-01', 900, 60),
  };
  const spyBars = flatBars('2023-01-01', 900, 450);
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

describe('forwardValidationSignalGapAudit', () => {
  it('diagnoseEtfAtBar flags ADX insufficient on flat market', () => {
    const bundle = mockBundle();
    const regimeMap = buildSpyRegimeMap(bundle.spyBars);
    const idx = bundle.etfBars.SCHD.length - 1;
    const d = diagnoseEtfAtBar({
      symbol: 'SCHD',
      bars: bundle.etfBars.SCHD,
      idx,
      regimeMap,
      spyBars: bundle.spyBars,
    });
    expect(d.passes).toBe(false);
    expect(d.primaryDisqualificationJa).toMatch(/ADX|52週|MACD/);
  });

  it('auditSignalGapSince produces human report for gap period', () => {
    const state = {
      ...defaultForwardValidationState(),
      signals: [
        {
          id: '2026-04-10_DGRO',
          date: '2026-04-10',
          symbol: 'DGRO' as const,
          adx14: 30,
          macdHistPct: 0.2,
          dist52wPct: -5,
          bucket: 'up',
          entryPrice: 50,
          entryDate: '2026-04-11',
          status: 'closed' as const,
          createdAt: '2026-04-10T00:00:00Z',
        },
      ],
    };
    const report = auditSignalGapSince({ state, bundle: mockBundle(), sinceDate: SIGNAL_GAP_AUDIT_SINCE });
    expect(report.sinceDate).toBe(SIGNAL_GAP_AUDIT_SINCE);
    expect(report.latestBarDiagnosis).toHaveLength(4);
    expect(report.humanSummaryJa).toContain('シグナルギャップ監査');
    expect(report.activeSignalZeroReportJa).toContain('0件');
  });
});
