import { describe, expect, it } from 'vitest';
import {
  gradeMalaysiaV2Adoption,
  MALAYSIA_V2_SECTOR_EQUAL_SYMBOLS,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV2Audit';
import type { ForwardMalaysiaV2ScenarioRow } from '../../types/forwardValidation';

function row(
  scenarioId: ForwardMalaysiaV2ScenarioRow['scenarioId'],
  cumulative: number,
  wr = 80,
  testCum = 10,
  degradation = 30,
  bankruptcy = 0,
): ForwardMalaysiaV2ScenarioRow {
  return {
    scenarioId,
    labelJa: scenarioId,
    symbols: [],
    tradeCount: 10,
    cumulativeReturnPct: cumulative,
    winRatePct: wr,
    profitFactor: 2,
    sharpe: 1.5,
    maxDrawdownPct: -15,
    cagr: 8,
    bootstrap: {
      runs: 1000,
      bankruptcyRatePct: bankruptcy,
      meanCumulativePct: cumulative,
      p5CumulativePct: 5,
      worstMaxDrawdownPct: -20,
    },
    wfOos: {
      trainCumulativePct: cumulative * 0.7,
      testCumulativePct: testCum,
      cumulativeDegradationPct: degradation,
      testWinRatePct: wr,
      overfitVerdictJa: 'ok',
    },
  };
}

describe('forwardValidationMalaysiaV2Audit', () => {
  it('MALAYSIA_V2_SECTOR_EQUAL_SYMBOLS has 4 sectors', () => {
    expect(MALAYSIA_V2_SECTOR_EQUAL_SYMBOLS).toHaveLength(4);
  });

  it('gradeMalaysiaV2Adoption returns A for strong de-risked portfolio', () => {
    const { grade } = gradeMalaysiaV2Adoption({
      baseline: row('baseline_v1', 160),
      exYtl: row('ex_ytl', 80),
      exBoth: row('ex_both', 55),
      sectorEqual: row('sector_equal', 50),
    });
    expect(grade).toBe('A');
  });

  it('gradeMalaysiaV2Adoption returns D when exclusions collapse', () => {
    const { grade } = gradeMalaysiaV2Adoption({
      baseline: row('baseline_v1', 160),
      exYtl: row('ex_ytl', -5),
      exBoth: row('ex_both', -10, 50, -5),
      sectorEqual: row('sector_equal', -8, 50, -3),
    });
    expect(grade).toBe('D');
  });
});
