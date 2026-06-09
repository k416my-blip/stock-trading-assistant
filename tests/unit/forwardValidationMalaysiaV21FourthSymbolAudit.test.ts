import { describe, expect, it } from 'vitest';
import {
  BOOTSTRAP_MC_69_RUNS,
  gradeMalaysiaV21Fourth,
  MALAYSIA_V69_CANDIDATE_DEFS,
  pickBestAddCandidate,
  pickLowestCorrelationCandidate,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV21FourthSymbolAudit';
import type { ForwardMalaysiaV21FourthCandidateRow } from '../../types/forwardValidation';

function row(
  candidateId: ForwardMalaysiaV21FourthCandidateRow['candidateId'],
  cumulative: number,
  maxDep: number,
  corr = 0.3,
): ForwardMalaysiaV21FourthCandidateRow {
  return {
    candidateId,
    labelJa: candidateId,
    sectorJa: 'test',
    addedSymbol: candidateId === 'baseline_v21' ? null : '9999',
    symbols: [],
    tradeCount: 20,
    avgCorrelationWithBase: corr,
    gamudaCorrelation: corr,
    cumulativeReturnPct: cumulative,
    cumulativeWithDividendPct: cumulative + 2,
    winRatePct: 80,
    profitFactor: 2,
    sharpe: 1.2,
    maxDrawdownPct: -10,
    cagr: 8,
    bootstrap: {
      runs: 10000,
      bankruptcyRatePct: 0,
      p5CumulativePct: 10,
      worstCumulativePct: 5,
      worstMaxDrawdownPct: -12,
    },
    wfOos: {
      trainCumulativePct: 60,
      testCumulativePct: 15,
      cumulativeDegradationPct: 30,
      overfitVerdictJa: 'ok',
    },
    symbolDependencyPct: { '5398': maxDep },
    maxSingleDependencyPct: maxDep,
    fetchOk: true,
  };
}

describe('forwardValidationMalaysiaV21FourthSymbolAudit', () => {
  it('has 10 fourth-symbol candidates', () => {
    expect(MALAYSIA_V69_CANDIDATE_DEFS).toHaveLength(10);
  });

  it('BOOTSTRAP_MC_69_RUNS is 10000', () => {
    expect(BOOTSTRAP_MC_69_RUNS).toBe(10_000);
  });

  it('pickBestAddCandidate prefers lower dependency under 60%', () => {
    const id = pickBestAddCandidate([
      row('baseline_v21', 110, 58, 0),
      row('c_public', 100, 48, 0.2),
      row('c_maybank', 120, 70, 0.1),
    ]);
    expect(id).toBe('c_public');
  });

  it('pickLowestCorrelationCandidate picks minimum abs correlation', () => {
    const id = pickLowestCorrelationCandidate([
      row('baseline_v21', 110, 58, 0),
      row('c_misc', 100, 55, 0.05),
      row('c_kpj', 105, 52, 0.35),
    ]);
    expect(id).toBe('c_misc');
  });

  it('gradeMalaysiaV21Fourth returns A when under50 and durable', () => {
    const candidates = [row('baseline_v21', 110, 58), row('c_public', 105, 45)];
    const { grade } = gradeMalaysiaV21Fourth({
      candidates,
      recommendedId: 'c_public',
      dependencyUnder50Pct: true,
    });
    expect(grade).toBe('A');
  });
});
