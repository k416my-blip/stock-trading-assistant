/**
 * npx vitest run tests/unit/forwardValidationVix24ExtendedHistoryAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  countVixGte24Days,
  filterVix24Trades,
} from '../../src/services/forwardValidation/forwardValidationVix24ExtendedHistoryAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';

function mockTrade(signalDate: string, vix: number): ForwardPassedTradeRecord {
  return {
    id: signalDate,
    symbol: 'SCHD',
    signalDate,
    entryDate: signalDate,
    exitDate: signalDate,
    entryPrice: 25,
    exitPrice: 26,
    returnPct: 3,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 30,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime: 'down',
  };
}

describe('forwardValidationVix24ExtendedHistoryAudit', () => {
  it('filters VIX>=24 trades', () => {
    const vixBars: OhlcvBar[] = [
      { date: '2020-03-01', open: 20, high: 20, low: 20, close: 20 },
      { date: '2020-03-02', open: 26, high: 26, low: 26, close: 26 },
    ];
    const trades = [mockTrade('2020-03-01', 20), mockTrade('2020-03-02', 26)];
    expect(filterVix24Trades(trades, vixBars)).toHaveLength(1);
  });

  it('counts VIX days', () => {
    const vixBars: OhlcvBar[] = [
      { date: '2020-03-01', open: 20, high: 20, low: 20, close: 20 },
      { date: '2020-03-02', open: 26, high: 26, low: 26, close: 26 },
    ];
    expect(countVixGte24Days(vixBars, ['2020-03-01', '2020-03-02'])).toBe(1);
  });
});
