/**
 * npx vitest run tests/unit/forwardValidationAdxSensitivityAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import { passesFinalRuleAblation } from '../../src/services/forwardValidation/case4Indicators';
import {
  ADX_SENSITIVITY_LEVELS,
  ablationForAdxThreshold,
  buildAdxDiffTrades,
  buildAdxSensitivityRow,
  evaluateAdx25Robustness,
} from '../../src/services/forwardValidation/forwardValidationAdxSensitivityAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(id: string, symbol: string, adx14: number, returnPct: number): ForwardPassedTradeRecord {
  return {
    id,
    symbol: symbol as ForwardPassedTradeRecord['symbol'],
    signalDate: id.slice(0, 10),
    entryDate: id.slice(0, 10),
    exitDate: id.slice(0, 10),
    entryPrice: 25,
    exitPrice: 25.75,
    returnPct,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime: 'down',
  };
}

describe('forwardValidationAdxSensitivityAudit', () => {
  it('defines six adx levels including none', () => {
    expect(ADX_SENSITIVITY_LEVELS).toHaveLength(6);
    expect(ablationForAdxThreshold(null)).toEqual({ adxMinOverride: null });
    expect(ablationForAdxThreshold(25)).toEqual({ adxMinOverride: 25 });
  });

  it('uses shallow adx min 30 when threshold is 20', () => {
    expect(
      passesFinalRuleAblation(
        {
          bucket: 'sideways_shallow',
          dist52wPct: -3,
          adx14: 28,
          macdHistPct: 0.2,
        },
        ablationForAdxThreshold(20),
      ),
    ).toBe(false);
    expect(
      passesFinalRuleAblation(
        {
          bucket: 'sideways_shallow',
          dist52wPct: -3,
          adx14: 31,
          macdHistPct: 0.2,
        },
        ablationForAdxThreshold(20),
      ),
    ).toBe(true);
  });

  it('builds diff trades between none and baseline', () => {
    const none = [mockTrade('2020-03-01_DGRO', 'DGRO', 18, 3), mockTrade('2020-03-02_SCHD', 'SCHD', 22, -1)];
    const base = [mockTrade('2020-03-02_SCHD', 'SCHD', 22, -1)];
    const diff = buildAdxDiffTrades(none, base);
    expect(diff.adxNoneOnly).toHaveLength(1);
    expect(diff.adxNoneOnly[0]!.symbol).toBe('DGRO');
    expect(diff.symbolSummaryNoneOnly[0]!.symbol).toBe('DGRO');
  });

  it('evaluates adx quality filter when none has higher cumulative', () => {
    const rows = ADX_SENSITIVITY_LEVELS.map((l) =>
      buildAdxSensitivityRow(
        l.threshold,
        l.labelJa,
        l.threshold === null
          ? [mockTrade('a', 'DGRO', 18, 3), mockTrade('b', 'VYM', 19, 3)]
          : l.threshold === 25
            ? [mockTrade('c', 'DGRO', 30, 3)]
            : [],
      ),
    );
    rows.find((r) => r.adxThreshold === null)!.cumulativeReturnPct = 150;
    rows.find((r) => r.adxThreshold === null)!.winRatePct = 80;
    rows.find((r) => r.adxThreshold === 25)!.cumulativeReturnPct = 100;
    rows.find((r) => r.adxThreshold === 25)!.winRatePct = 95;
    const { verdict } = evaluateAdx25Robustness(rows, buildAdxDiffTrades([], []));
    expect(verdict).toBe('adx_quality_filter');
  });
});
