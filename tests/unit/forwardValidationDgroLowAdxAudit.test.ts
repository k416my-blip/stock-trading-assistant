/**
 * npx vitest run tests/unit/forwardValidationDgroLowAdxAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildAdxBandStats,
  buildLowAdxSymbolStats,
  classifyAdxBand,
  evaluateDgroLowAdxCharacteristic,
} from '../../src/services/forwardValidation/forwardValidationDgroLowAdxAudit';
import type { ForwardAdx20ExtraTradeRow } from '../../src/types/forwardValidation';

function mockExtra(
  symbol: string,
  returnPct: number,
  adx14: number,
  signalDate = '2020-03-01',
): ForwardAdx20ExtraTradeRow {
  return { symbol, signalDate, returnPct, holdDays: 8, adx14 };
}

describe('forwardValidationDgroLowAdxAudit', () => {
  it('classifies ADX bands', () => {
    expect(classifyAdxBand(18)).toBe('band_15_20');
    expect(classifyAdxBand(22)).toBe('band_20_25');
    expect(classifyAdxBand(28)).toBe('band_other');
  });

  it('builds symbol stats', () => {
    const trades = [
      mockExtra('DGRO', 3, 22),
      mockExtra('DGRO', -5, 18),
      mockExtra('SCHD', 3, 21),
    ];
    const dgro = buildLowAdxSymbolStats('DGRO', trades);
    expect(dgro.tradeCount).toBe(2);
    expect(dgro.winRatePct).toBe(50);
    expect(dgro.cumulativeReturnPct).toBe(-2);
    expect(dgro.maxLossPct).toBe(-5);
  });

  it('evaluates dgro_specific when others are flat or negative', () => {
    const trades = [
      mockExtra('DGRO', 3, 22),
      mockExtra('DGRO', 3, 18),
      mockExtra('DGRO', 3, 21),
      mockExtra('SCHD', -2, 22),
    ];
    const symbolStats = ['DGRO', 'SCHD', 'SPLG', 'VYM'].map((s) =>
      buildLowAdxSymbolStats(s, trades),
    );
    const band1520 = buildAdxBandStats('band_15_20', '15-20', 15, 20, trades);
    const band2025 = buildAdxBandStats('band_20_25', '20-25', 20, 25, trades);
    const { verdict } = evaluateDgroLowAdxCharacteristic({
      symbolStats,
      band1520,
      band2025,
      allTrades: trades,
    });
    expect(verdict).toBe('dgro_specific');
  });

  it('evaluates strategy_wide when multiple symbols profit in low bands', () => {
    const trades = [
      mockExtra('DGRO', 3, 22),
      mockExtra('SCHD', 3, 21),
      mockExtra('VYM', 3, 19),
    ];
    const symbolStats = ['DGRO', 'SCHD', 'SPLG', 'VYM'].map((s) =>
      buildLowAdxSymbolStats(s, trades),
    );
    const band1520 = buildAdxBandStats('band_15_20', '15-20', 15, 20, trades);
    const band2025 = buildAdxBandStats('band_20_25', '20-25', 20, 25, trades);
    const { verdict } = evaluateDgroLowAdxCharacteristic({
      symbolStats,
      band1520,
      band2025,
      allTrades: trades,
    });
    expect(verdict).toBe('strategy_wide');
  });
});
