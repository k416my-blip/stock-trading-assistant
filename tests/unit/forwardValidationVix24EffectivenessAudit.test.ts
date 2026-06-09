/**
 * npx vitest run tests/unit/forwardValidationVix24EffectivenessAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  returnAfterEntryBars,
  runLookaheadChecks,
} from '../../src/services/forwardValidation/forwardValidationVix24EffectivenessAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';
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
      high: price * 1.02,
      low: price * 0.98,
      close: price,
    });
  }
  return out;
}

describe('forwardValidationVix24EffectivenessAudit', () => {
  it('computes 1-day forward return', () => {
    const bars = flatBars('2024-01-01', 10, 100);
    bars[2]!.close = 101;
    expect(returnAfterEntryBars(bars, bars[1]!.date, 100, 1)).toBe(1);
  });

  it('lookahead checks pass for valid cohort', () => {
    const bars = flatBars('2024-01-01', 10, 80);
    const trade: ForwardPassedTradeRecord = {
      id: '2024-01-02_SCHD',
      symbol: 'SCHD',
      signalDate: bars[1]!.date,
      entryDate: bars[2]!.date,
      exitDate: bars[4]!.date,
      entryPrice: bars[2]!.close,
      exitPrice: bars[4]!.close,
      returnPct: 3,
      holdDays: 2,
      exitReason: 'take_profit',
      adx14: 30,
      macdHistPct: 0.3,
      dist52wPct: -8,
      bucket: 'down',
      spyRegime: 'bear',
    };
    const bundle: ForwardOhlcvBundle = {
      etfBars: { SCHD: bars, VYM: bars, DGRO: bars, SPLG: bars },
      spyBars: flatBars('2024-01-01', 10, 450),
      vixBars: flatBars('2024-01-01', 10, 26),
      latestDate: bars[9]!.date,
      tradingDates: bars.map((b) => b.date),
      fetchLog: { fetchedAt: new Date().toISOString(), successCount: 6, failureCount: 0, symbols: [] },
      symbolLatestDates: {},
    };
    const checks = runLookaheadChecks({ bundle, cohort: [trade] });
    expect(checks.find((c) => c.id === 'entry_next_bar')?.passed).toBe(true);
  });
});
