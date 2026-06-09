import { COMMITTEE_RISK_FALLBACK_JA } from '../constants/investmentCommitteeNarrative';
import type { AdoptionVerdict } from '../types/investmentCharter';
import type { CommitteeReview, RedTeamReview } from '../types/investmentCommitteeNarrative';
import { OPPOSITION_FALLBACK_JA } from '../constants/investmentCharter';
import { computeRedTeamScore } from './investmentCommitteeMetrics';

export type FallbackCommitteeReviewInput = {
  charterApprovalReasonsJa: string[];
  charterOppositionReasonsJa: string[];
};

export type FallbackRedTeamInput = FallbackCommitteeReviewInput & {
  lockedVerdict: AdoptionVerdict;
};

export function buildFallbackRedTeamCounterArguments(input: FallbackRedTeamInput): string[] {
  if (input.lockedVerdict === 'adopt') {
    const items =
      input.charterOppositionReasonsJa.length > 0
        ? input.charterOppositionReasonsJa
        : [OPPOSITION_FALLBACK_JA];
    return items.slice(0, 3);
  }
  if (input.lockedVerdict === 'reject') {
    const items =
      input.charterApprovalReasonsJa.length > 0
        ? input.charterApprovalReasonsJa
        : ['不採用判定に対する再検討材料が限定的'];
    return items.slice(0, 3);
  }
  const mixed = [...input.charterOppositionReasonsJa, ...input.charterApprovalReasonsJa];
  if (mixed.length === 0) return ['保留判定への反証材料を確認中'];
  return mixed.slice(0, 3);
}

export function buildFallbackRedTeamReview(input: FallbackRedTeamInput): RedTeamReview {
  const counterArgumentsJa = buildFallbackRedTeamCounterArguments(input);
  const redTeamScore = computeRedTeamScore({
    counterArgumentsJa,
    lockedVerdict: input.lockedVerdict,
    charterOppositionReasonsJa: input.charterOppositionReasonsJa,
  });
  return {
    counterArgumentsJa,
    redTeamScore,
    generatedAt: new Date().toISOString(),
  };
}

export function buildFallbackCommitteeReview(input: FallbackCommitteeReviewInput): CommitteeReview {
  const bullCaseJa =
    input.charterApprovalReasonsJa.length > 0
      ? [...input.charterApprovalReasonsJa]
      : ['憲章に基づく賛成材料は限定的'];
  const bearCaseJa =
    input.charterOppositionReasonsJa.length > 0
      ? [...input.charterOppositionReasonsJa]
      : ['反対材料の確認が必要'];
  const riskFactorsJa = [...COMMITTEE_RISK_FALLBACK_JA];

  return {
    bullCaseJa,
    bearCaseJa,
    riskFactorsJa,
    generatedAt: new Date().toISOString(),
  };
}
