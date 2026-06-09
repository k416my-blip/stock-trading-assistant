/**
 * npx vitest run tests/unit/forwardValidationSixLossRootCauseAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  extractCommonLossTraits,
  spy63AtDate,
} from '../../src/services/forwardValidation/forwardValidationSixLossRootCauseAudit';
import type { ForwardSixLossDetailRow } from '../../src/types/forwardValidation';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';

function flatSpy(days: number, price: number): OhlcvBar[] {
  const out: OhlcvBar[] = [];
  const d0 = new Date('2024-01-01T00:00:00Z');
  for (let i = 0; i < days; i++) {
    const d = new Date(d0);
    d.setUTCDate(d0.getUTCDate() + i);
    out.push({
      date: d.toISOString().slice(0, 10),
      open: price,
      high: price,
      low: price,
      close: price + i * 0.1,
    });
  }
  return out;
}

describe('forwardValidationSixLossRootCauseAudit', () => {
  it('computes SPY63 return', () => {
    const bars = flatSpy(100, 400);
    const idx = 80;
    const ret = spy63AtDate(bars, bars[idx]!.date);
    expect(ret).not.toBeNull();
  });

  it('extracts low VIX trait', () => {
    const row: ForwardSixLossDetailRow = {
      entryDate: '2024-03-01',
      ticker: 'SCHD',
      returnPct: -1,
      holdingDays: 25,
      signalDate: '2024-02-29',
      vix: 18,
      adx14: 25,
      macdHistPct: 0.2,
      spy63Pct: 2,
      dist52wPct: -3,
      bucket: 'up',
      spyRegime: 'up',
      exitReason: 'max_hold',
      vixGte24: false,
    };
    const traits = extractCommonLossTraits([row]);
    expect(traits.some((t) => t.includes('VIX<24'))).toBe(true);
  });
});
