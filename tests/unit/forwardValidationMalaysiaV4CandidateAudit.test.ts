import { describe, expect, it } from 'vitest';
import {
  buildV4PhaseWeights,
  compositeV4Score,
  gradeV4Candidate,
  MALAYSIA_V4_CANDIDATE_DEFS,
  MALAYSIA_V4_YTL_POLICIES,
  resolveV4TradeSymbols,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4CandidateAudit';

describe('forwardValidationMalaysiaV4CandidateAudit', () => {
  it('has 10 candidates and 4 YTL policies', () => {
    expect(MALAYSIA_V4_CANDIDATE_DEFS).toHaveLength(10);
    expect(MALAYSIA_V4_YTL_POLICIES).toHaveLength(4);
  });

  it('buildV4PhaseWeights excludes YTL when cap is 0', () => {
    const w = buildV4PhaseWeights({ candidateSymbol: '3816', ytlCapPct: 0 });
    expect(w.phase4['6742']).toBe(0);
    expect(w.phase4['3816']).toBeGreaterThan(0);
  });

  it('buildV4PhaseWeights caps YTL and includes candidate', () => {
    const w = buildV4PhaseWeights({ candidateSymbol: '3816', ytlCapPct: 20 });
    expect(w.phase4['6742']).toBe(20);
    expect(w.phase4['3816']).toBeGreaterThan(0);
    expect(w.phase4['5398']).toBe(15);
  });

  it('resolveV4TradeSymbols omits YTL when excluded', () => {
    const syms = resolveV4TradeSymbols({ candidateSymbol: '3816', ytlCapPct: 0 });
    expect(syms).not.toContain('6742');
    expect(syms).toContain('3816');
  });

  it('resolveV4TradeSymbols includes YTL when capped', () => {
    const syms = resolveV4TradeSymbols({ candidateSymbol: '3816', ytlCapPct: 15 });
    expect(syms).toContain('6742');
  });

  it('gradeV4Candidate returns A when target and low MC met', () => {
    const { grade } = gradeV4Candidate({
      best: {
        rowId: 'x',
        candidateId: 'v4_misc',
        candidateLabelJa: 'MISC',
        candidateSymbol: '3816',
        ytlPolicyId: 'ytl_cap_10',
        ytlPolicyLabelJa: 'cap10',
        ytlCapPct: 10,
        cumulativeReturnPct: 38,
        sharpe: 1.5,
        maxDrawdownPct: -7,
        minEquityMYR: 3000,
        delistBankruptcyRatePct: 2,
        delistP5MinEquityMYR: 2500,
        candidateNetContributionPct: 20,
        ytlNetContributionPct: 10,
        fetchOk: true,
        meetsCumulativeTarget: true,
      },
      anyMeetsTarget: true,
      anyLowMc: true,
    });
    expect(grade).toBe('A');
  });

  it('compositeV4Score penalizes high delist MC', () => {
    const base = {
      candidateId: 'v4_misc' as const,
      candidateLabelJa: 'MISC',
      candidateSymbol: '3816',
      sharpe: 1.2,
      maxDrawdownPct: -9,
      minEquityMYR: 3000,
      delistP5MinEquityMYR: 500,
      candidateNetContributionPct: 15,
      ytlNetContributionPct: 30,
      fetchOk: true,
      meetsCumulativeTarget: true,
      cumulativeReturnPct: 38,
    };
    const lowMc = compositeV4Score({
      ...base,
      rowId: 'a',
      ytlPolicyId: 'ytl_exclude',
      ytlPolicyLabelJa: 'exclude',
      ytlCapPct: 0,
      delistBankruptcyRatePct: 0,
    });
    const highMc = compositeV4Score({
      ...base,
      rowId: 'b',
      ytlPolicyId: 'ytl_cap_20',
      ytlPolicyLabelJa: 'cap20',
      ytlCapPct: 20,
      delistBankruptcyRatePct: 60,
    });
    expect(lowMc).toBeGreaterThan(highMc);
  });
});
