import { describe, expect, it } from 'vitest';
import {
  applyCommitteeMetrics,
  computeCommitteeConsensusPct,
  computeCommitteeTrustPct,
  computeRedTeamScore,
  formatStrongOppositionLabel,
} from '../../src/services/investmentCommitteeMetrics';

const baseInput = {
  adoptionVerdict: 'adopt' as const,
  confidencePct: 80,
  recommendationScore: 82,
  bullCaseJa: ['配当安定', '成長見込み'],
  bearCaseJa: ['金利リスク'],
  riskFactorsJa: ['ボラティリティ'],
  counterArgumentsJa: ['景気後退で配当減の可能性'],
  charterApprovalReasonsJa: ['配当安定', '財務健全'],
  charterOppositionReasonsJa: ['金利リスク'],
};

describe('investmentCommitteeMetrics', () => {
  it('computes consensus between 0 and 100', () => {
    const pct = computeCommitteeConsensusPct({
      lockedVerdict: 'adopt',
      bullCaseJa: baseInput.bullCaseJa,
      bearCaseJa: baseInput.bearCaseJa,
      riskFactorsJa: baseInput.riskFactorsJa,
      counterArgumentsJa: baseInput.counterArgumentsJa,
      charterApprovalReasonsJa: baseInput.charterApprovalReasonsJa,
      charterOppositionReasonsJa: baseInput.charterOppositionReasonsJa,
    });
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it('uses AI redTeamScore when provided', () => {
    const score = computeRedTeamScore({
      counterArgumentsJa: ['a'],
      lockedVerdict: 'adopt',
      charterOppositionReasonsJa: ['b'],
      aiRedTeamScore: 72,
    });
    expect(score).toBe(72);
  });

  it('computes committee trust with red team penalty', () => {
    const trust = computeCommitteeTrustPct({
      confidencePct: 80,
      recommendationScore: 82,
      committeeConsensusPct: 88,
      redTeamScore: 30,
    });
    expect(trust).toBeGreaterThan(0);
    expect(trust).toBeLessThanOrEqual(100);
  });

  it('labels strong opposition from red team score', () => {
    expect(formatStrongOppositionLabel(70)).toBe('あり');
    expect(formatStrongOppositionLabel(40)).toBe('なし');
  });

  it('applyCommitteeMetrics adds display fields', () => {
    const result = applyCommitteeMetrics(baseInput, 55);
    expect(result.committeeConsensusPct).toBeGreaterThan(0);
    expect(result.redTeamScore).toBe(55);
    expect(result.committeeTrustPct).toBeGreaterThan(0);
    expect(['あり', 'なし']).toContain(result.strongOppositionLabelJa);
  });
});
