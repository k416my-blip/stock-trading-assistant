/**
 * npx vitest run tests/unit/forwardValidationAdx20ValidationAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildAdx20ExtraTrades,
  buildAdx20ValidationMetrics,
  evaluateAdx20Superiority,
} from '../../src/services/forwardValidation/forwardValidationAdx20ValidationAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(id: string, returnPct: number): ForwardPassedTradeRecord {
  return {
    id,
    symbol: 'DGRO',
    signalDate: id.slice(0, 10),
    entryDate: id.slice(0, 10),
    exitDate: id.slice(0, 10),
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

describe('forwardValidationAdx20ValidationAudit', () => {
  it('finds adx20-only extra trades', () => {
    const adx20 = [mockTrade('2020-03-01_x', 3), mockTrade('2020-03-02_x', -2)];
    const adx25 = [mockTrade('2020-03-01_x', 3)];
    const { adx20Only } = buildAdx20ExtraTrades(adx20, adx25);
    expect(adx20Only).toHaveLength(1);
    expect(adx20Only[0]!.returnPct).toBe(-2);
  });

  it('evaluates extra_trades_driven when without extras loses to adx25', () => {
    const adx20 = buildAdx20ValidationMetrics('20', [mockTrade('a', 3), mockTrade('b', 3)]);
    adx20.cumulativeReturnPct = 20;
    adx20.winRatePct = 100;
    const adx25 = buildAdx20ValidationMetrics('25', [mockTrade('a', 3)]);
    adx25.cumulativeReturnPct = 15;
    adx25.winRatePct = 90;
    const without = buildAdx20ValidationMetrics('wo', [mockTrade('a', 3)]);
    without.cumulativeReturnPct = 10;
    without.winRatePct = 85;
    const { verdict } = evaluateAdx20Superiority({
      adx20,
      adx25,
      adx20WithoutExtras: without,
      extraTrades: [{ symbol: 'DGRO', signalDate: '2020-03-02', returnPct: 3, holdDays: 5, adx14: 22 }],
      extraCumulativeReturnPct: 10,
      sharedTradeCount: 1,
    });
    expect(verdict).toBe('extra_trades_driven');
  });

  it('evaluates genuine superiority when without extras still wins', () => {
    const adx20 = buildAdx20ValidationMetrics('20', []);
    adx20.cumulativeReturnPct = 120;
    adx20.winRatePct = 95;
    const adx25 = buildAdx20ValidationMetrics('25', []);
    adx25.cumulativeReturnPct = 100;
    adx25.winRatePct = 90;
    const without = buildAdx20ValidationMetrics('wo', []);
    without.cumulativeReturnPct = 110;
    without.winRatePct = 94;
    const { verdict } = evaluateAdx20Superiority({
      adx20,
      adx25,
      adx20WithoutExtras: without,
      extraTrades: [{ symbol: 'DGRO', signalDate: '2020-03-02', returnPct: 3, holdDays: 5, adx14: 22 }],
      extraCumulativeReturnPct: 10,
      sharedTradeCount: 5,
    });
    expect(verdict).toBe('genuine_adx20_superiority');
  });
});
