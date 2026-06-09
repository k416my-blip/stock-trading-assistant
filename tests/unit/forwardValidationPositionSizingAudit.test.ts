/**
 * npx vitest run tests/unit/forwardValidationPositionSizingAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  kellyFractionFromHistory,
  qualityScore,
  resolveSlotPct,
  simulatePositionSizing,
  symbolWinRatesBefore,
} from '../../src/services/forwardValidation/forwardValidationPositionSizingAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

function mockTrade(
  id: string,
  signalDate: string,
  entryDate: string,
  exitDate: string,
  returnPct: number,
  symbol: 'DGRO' | 'SCHD' = 'DGRO',
): ForwardPassedTradeRecord {
  return {
    id,
    symbol,
    signalDate,
    entryDate,
    exitDate,
    entryPrice: 25,
    exitPrice: 25 * (1 + returnPct / 100),
    returnPct,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 32,
    macdHistPct: 0.3,
    dist52wPct: -4,
    bucket: 'down',
    spyRegime: 'down',
  };
}

const mockBundle = {
  vixBars: [{ date: '2020-03-01', open: 35, high: 35, low: 35, close: 35 }],
  etfBars: { DGRO: [], SCHD: [] },
} as unknown as ForwardOhlcvBundle;

describe('forwardValidationPositionSizingAudit', () => {
  it('computes symbol win rates from prior trades only', () => {
    const trades = [
      mockTrade('1', '2020-01-01', '2020-01-02', '2020-01-10', 3, 'DGRO'),
      mockTrade('2', '2020-02-01', '2020-02-02', '2020-02-10', -2, 'SCHD'),
    ];
    const wr = symbolWinRatesBefore(trades, '2020-03-01');
    expect(wr.DGRO).toBe(1);
    expect(wr.SCHD).toBe(0);
  });

  it('boosts quality score for high VIX and ADX', () => {
    const t = mockTrade('1', '2020-03-01', '2020-03-02', '2020-03-10', 3);
    expect(qualityScore(t, 35)).toBeGreaterThan(qualityScore(t, 22));
  });

  it('uses equal 33.3% slots by default', () => {
    const pct = resolveSlotPct({
      schemeId: 'equal',
      trade: mockTrade('1', '2020-03-01', '2020-03-02', '2020-03-10', 3),
      allTrades: [],
      vixBars: [],
      kellyMultiplier: null,
    });
    expect(pct).toBeCloseTo(33.333, 1);
  });

  it('simulates equity growth on winning trade', () => {
    const trades = [mockTrade('1', '2020-03-01', '2020-03-02', '2020-03-10', 3)];
    const { sizedTrades, equityCurve } = simulatePositionSizing(trades, mockBundle, 'equal', null);
    expect(sizedTrades).toHaveLength(1);
    expect(equityCurve[equityCurve.length - 1]!.equity).toBeGreaterThan(100);
  });

  it('returns positive kelly for winning history', () => {
    const trades = Array.from({ length: 6 }, (_, i) =>
      mockTrade(String(i), `2020-0${(i % 5) + 1}-01`, `2020-0${(i % 5) + 1}-02`, `2020-0${(i % 5) + 1}-10`, 3),
    );
    expect(kellyFractionFromHistory(trades, '2020-06-01')).toBeGreaterThan(0);
  });
});
