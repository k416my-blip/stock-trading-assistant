/**
 * npx vitest run tests/unit/forwardValidationTpTargetSensitivityAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildTpTargetSensitivityRow,
  evaluateTp3Robustness,
  TP_TARGET_SENSITIVITY_LEVELS,
} from '../../src/services/forwardValidation/forwardValidationTpTargetSensitivityAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(signalDate: string, returnPct: number): ForwardPassedTradeRecord {
  return {
    id: signalDate,
    symbol: 'DGRO',
    signalDate,
    entryDate: signalDate,
    exitDate: signalDate,
    entryPrice: 25,
    exitPrice: 25 * (1 + returnPct / 100),
    returnPct,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 30,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime: 'down',
  };
}

describe('forwardValidationTpTargetSensitivityAudit', () => {
  it('includes tp levels 2 through 6', () => {
    expect(TP_TARGET_SENSITIVITY_LEVELS).toEqual([2, 3, 4, 5, 6]);
  });

  it('computes profit efficiency when drawdown exists', () => {
    const row = buildTpTargetSensitivityRow(3, [
      mockTrade('2020-03-01', 3),
      mockTrade('2020-03-02', -5),
    ]);
    expect(row.cumulativeReturnPct).toBe(-2);
    expect(row.profitEfficiency).not.toBeNull();
  });

  it('evaluates robust tp3 when multiple levels similar', () => {
    const rows = [2, 3, 4, 5, 6].map((tp) => ({
      takeProfitPct: tp,
      labelJa: `+${tp}%`,
      tradeCount: 50 - tp,
      winRatePct: 90 + (tp === 3 ? 2 : 0),
      avgReturnPct: 2.5,
      maxDrawdownPct: -20,
      cumulativeReturnPct: 100 - tp,
      profitEfficiency: 5,
    }));
    const { verdict } = evaluateTp3Robustness(rows);
    expect(['robust_tp3', 'optimal_tp3']).toContain(verdict);
  });

  it('evaluates accidental tp3 when 3% underperforms', () => {
    const rows = [2, 3, 4, 5, 6].map((tp) => ({
      takeProfitPct: tp,
      labelJa: `+${tp}%`,
      tradeCount: 40,
      winRatePct: tp === 4 ? 92 : 70,
      avgReturnPct: 2,
      maxDrawdownPct: -25,
      cumulativeReturnPct: tp === 4 ? 120 : tp === 3 ? 50 : 60,
      profitEfficiency: tp === 4 ? 4.8 : 2,
    }));
    const { verdict } = evaluateTp3Robustness(rows);
    expect(verdict).toBe('accidental_tp3');
  });
});
