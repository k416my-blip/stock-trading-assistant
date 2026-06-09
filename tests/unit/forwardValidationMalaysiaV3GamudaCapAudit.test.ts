import { describe, expect, it } from 'vitest';
import {
  BOOTSTRAP_MC_72_RUNS,
  buildGamudaCapPhaseWeights,
  gradeMalaysiaV3GamudaCap,
  MALAYSIA_V3_GAMUDA_CAP_PATTERNS,
  pickAdoptedGamudaCapPattern,
  pickBestBankruptcyPattern,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV3GamudaCapAudit';
import type { ForwardMalaysiaV3GamudaCapPatternRow } from '../../types/forwardValidation';

function row(
  patternId: ForwardMalaysiaV3GamudaCapPatternRow['patternId'],
  delistBankruptcy: number,
  gamudaDep: number,
  cumulative: number,
): ForwardMalaysiaV3GamudaCapPatternRow {
  return {
    patternId,
    labelJa: patternId,
    phase3Weights: {},
    phase4Weights: {},
    weightLabelJa: '',
    cumulativeReturnPct: cumulative,
    profitFactor: 1.5,
    sharpe: 1.2,
    maxDrawdownPct: -15,
    bootstrap: {
      runs: 10000,
      bankruptcyRatePct: 0,
      p5MinEquityMYR: 2000,
      worstMinEquityMYR: 1500,
    },
    delist: {
      cumulativeReturnPct: -50,
      maxDrawdownPct: -80,
      minEquityMYR: 500,
      finalEquityMYR: 10000,
      bootstrap: {
        runs: 10000,
        bankruptcyRatePct: delistBankruptcy,
        p5MinEquityMYR: 400,
        worstMinEquityMYR: 200,
      },
    },
    gamudaDependencyPct: gamudaDep,
    maxSingleDependencyPct: gamudaDep,
    symbolDependencyPct: { '5398': gamudaDep },
    monthsToRm10000: 5,
    monthsToRm100000: 57,
  };
}

describe('forwardValidationMalaysiaV3GamudaCapAudit', () => {
  it('has 6 gamuda cap patterns', () => {
    expect(MALAYSIA_V3_GAMUDA_CAP_PATTERNS).toHaveLength(6);
  });

  it('BOOTSTRAP_MC_72_RUNS is 10000', () => {
    expect(BOOTSTRAP_MC_72_RUNS).toBe(10_000);
  });

  it('buildGamudaCapPhaseWeights excludes gamuda at 0%', () => {
    const w = buildGamudaCapPhaseWeights(0);
    expect(w.phase3['5398']).toBe(0);
    expect(w.phase4['5398']).toBe(0);
    expect(w.phase3['5347']).toBe(50);
    expect(w.phase4['6742']).toBeCloseTo(33.333, 1);
  });

  it('buildGamudaCapPhaseWeights caps gamuda at 20%', () => {
    const w = buildGamudaCapPhaseWeights(20);
    expect(w.phase3['5398']).toBe(20);
    expect(w.phase4['5398']).toBe(20);
    expect(w.phase3['5347']).toBe(40);
    expect(w.phase4['1023']).toBeCloseTo(26.667, 1);
  });

  it('pickBestBankruptcyPattern picks lowest delist MC', () => {
    const best = pickBestBankruptcyPattern([
      row('baseline_v3', 11, 25, 200),
      row('exclude_gamuda', 3, 0, 150),
      row('cap_15', 6, 15, 180),
    ]);
    expect(best.patternId).toBe('exclude_gamuda');
  });

  it('pickAdoptedGamudaCapPattern prefers under5 and under50', () => {
    const patterns = [
      row('baseline_v3', 11, 25, 200),
      row('exclude_gamuda', 3, 0, 160),
      row('cap_15', 4, 15, 170),
    ];
    const id = pickAdoptedGamudaCapPattern({
      patterns,
      delistMcUnder5Pct: true,
      gamudaDependencyUnder50Pct: true,
    });
    expect(id).toBe('exclude_gamuda');
  });

  it('gradeMalaysiaV3GamudaCap returns A when under5 achieved', () => {
    const patterns = [
      row('baseline_v3', 11, 25, 200),
      row('exclude_gamuda', 3, 0, 170),
    ];
    const { grade } = gradeMalaysiaV3GamudaCap({
      patterns,
      adoptedId: 'exclude_gamuda',
      delistMcUnder5Pct: true,
      gamudaDependencyUnder50Pct: true,
    });
    expect(grade).toBe('A');
  });
});
