import { describe, expect, it } from 'vitest';
import {
  applyMalaysiaV3CrashStress,
  BOOTSTRAP_MC_71_RUNS,
  gradeMalaysiaV3Crash,
  MALAYSIA_V3_CRASH_SCENARIOS,
  pickWorstScenario,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV3CrashAudit';
import type { ForwardMalaysiaV3CrashScenarioRow } from '../../types/forwardValidation';

function row(
  scenarioId: ForwardMalaysiaV3CrashScenarioRow['scenarioId'],
  minEquity: number,
  bankruptcy: number,
): ForwardMalaysiaV3CrashScenarioRow {
  return {
    scenarioId,
    labelJa: scenarioId,
    cashReservePct: 15,
    cumulativeReturnPct: 20,
    maxDrawdownPct: -12,
    minEquityMYR: minEquity,
    finalEquityMYR: 50000,
    totalContributedMYR: 30000,
    monthsToRm10000: 5,
    monthsToRm100000: 57,
    bootstrap: {
      runs: 10000,
      bankruptcyRatePct: bankruptcy,
      p5MinEquityMYR: minEquity * 0.9,
      worstMinEquityMYR: minEquity * 0.8,
    },
    survived: minEquity > 0,
  };
}

describe('forwardValidationMalaysiaV3CrashAudit', () => {
  it('has 11 crash scenarios', () => {
    expect(MALAYSIA_V3_CRASH_SCENARIOS).toHaveLength(11);
  });

  it('BOOTSTRAP_MC_71_RUNS is 10000', () => {
    expect(BOOTSTRAP_MC_71_RUNS).toBe(10_000);
  });

  it('applyMalaysiaV3CrashStress caps gamuda at -100', () => {
    const trades = [{ symbol: '5398', returnPct: 10 }] as never[];
    const out = applyMalaysiaV3CrashStress(trades, 'gamuda_minus70');
    expect(out[0]!.returnPct).toBe(-60);
  });

  it('applyMalaysiaV3CrashStress delists gamuda', () => {
    const trades = [{ symbol: '5398', returnPct: 10 }] as never[];
    const out = applyMalaysiaV3CrashStress(trades, 'single_delist');
    expect(out[0]!.returnPct).toBe(-100);
  });

  it('pickWorstScenario picks highest severity', () => {
    const worst = pickWorstScenario([
      row('baseline', 5000, 0),
      row('gamuda_minus70', 800, 0),
      row('single_delist', 2000, 11),
    ]);
    expect(worst.scenarioId).toBe('single_delist');
  });

  it('gradeMalaysiaV3Crash returns A when all survive', () => {
    const scenarios = [row('baseline', 5000, 0), row('gamuda_minus70', 2000, 0)];
    const { grade } = gradeMalaysiaV3Crash({
      scenarios,
      worst: scenarios[1]!,
      cash20Better: false,
    });
    expect(grade).toBe('A');
  });
});
