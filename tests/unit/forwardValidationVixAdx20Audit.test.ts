/**
 * npx vitest run tests/unit/forwardValidationVixAdx20Audit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildVixAddedTrades,
  buildVixBandRows,
  classifyVixBand,
  evaluateVixAdx20Recommendation,
} from '../../src/services/forwardValidation/forwardValidationVixAdx20Audit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(id: string, signalDate: string, returnPct: number): ForwardPassedTradeRecord {
  return {
    id,
    symbol: 'DGRO',
    signalDate,
    entryDate: signalDate,
    exitDate: signalDate,
    entryPrice: 25,
    exitPrice: 25.75,
    returnPct,
    holdDays: 8,
    exitReason: 'take_profit',
    adx14: 22,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime: 'down',
  };
}

describe('forwardValidationVixAdx20Audit', () => {
  it('classifies VIX bands', () => {
    expect(classifyVixBand(22)).toBe('band_20_24');
    expect(classifyVixBand(26)).toBe('band_24_30');
    expect(classifyVixBand(35)).toBe('band_30_40');
    expect(classifyVixBand(45)).toBe('band_40_plus');
  });

  it('finds added trades when VIX filter removed', () => {
    const withVix = [mockTrade('a', '2020-04-08', 3)];
    const withoutVix = [mockTrade('a', '2020-04-08', 3), mockTrade('b', '2021-03-09', -2)];
    const added = buildVixAddedTrades(withVix, withoutVix, []);
    expect(added).toHaveLength(1);
    expect(added[0]!.returnPct).toBe(-2);
  });

  it('builds band rows for added trades', () => {
    const bands = buildVixBandRows([
      { signalDate: '2020-01-01', symbol: 'DGRO', returnPct: 3, holdDays: 5, vix: 22 },
      { signalDate: '2020-02-01', symbol: 'SCHD', returnPct: -2, holdDays: 5, vix: 26 },
    ]);
    expect(bands.find((b) => b.bandId === 'band_20_24')!.tradeCount).toBe(1);
    expect(bands.find((b) => b.bandId === 'band_24_30')!.tradeCount).toBe(1);
  });

  it('recommends maintain when VIX24 beats no VIX', () => {
    const metrics = (cum: number, wr: number) => ({
      labelJa: 'x',
      tradeCount: 50,
      winRatePct: wr,
      avgReturnPct: 2,
      maxDrawdownPct: -10,
      cumulativeReturnPct: cum,
      profitEfficiency: 5,
    });
    const r = evaluateVixAdx20Recommendation({
      withVix24: metrics(130, 94),
      withoutVix: metrics(110, 88),
      thresholdRows: [
        {
          vixThreshold: 20,
          labelJa: 'VIX≥20',
          tradeCount: 60,
          winRatePct: 90,
          avgReturnPct: 2,
          maxDrawdownPct: -12,
          cumulativeReturnPct: 120,
          profitEfficiency: 10,
        },
        {
          vixThreshold: 24,
          labelJa: 'VIX≥24',
          tradeCount: 50,
          winRatePct: 94,
          avgReturnPct: 2,
          maxDrawdownPct: -10,
          cumulativeReturnPct: 130,
          profitEfficiency: 13,
        },
      ],
      addedTrades: [{ signalDate: '2021-01-01', symbol: 'DGRO', returnPct: -5, holdDays: 25, vix: 18 }],
      bandRows: [],
    });
    expect(r.recommendation).toBe('maintain');
  });
});
