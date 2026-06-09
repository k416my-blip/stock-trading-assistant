import type { AllocationCandidate } from '../types';
import type { AllocationRecommendationMeta } from './recommendationProvenance';
import {
  buildBeginnerNaturalExplanation,
  mapConfidenceToCertaintyLabel,
  mapScoreToGradeLabel,
  mapVerdictToBeginnerPhrase,
  mapVerdictToCardRecommendation,
  sanitizeBeginnerLines,
  sanitizeBeginnerText,
} from './beginnerDisplayMapper';

/** メタ保存用のやさしい理由（3行以内） */
export function buildBeginnerReasonJa(input: {
  name?: string;
  todayJudgment: 'buy' | 'wait' | 'skip';
  bullCaseJa: string[];
  bearCaseJa: string[];
  riskFactorsJa: string[];
}): string {
  const who = input.name?.trim() || 'この銘柄';
  const positive = sanitizeBeginnerText(input.bullCaseJa[0] ?? '長く持つと資産が増えやすい材料があります。');
  const caution = sanitizeBeginnerText(
    input.riskFactorsJa[0] ?? input.bearCaseJa[0] ?? '値段が下がる可能性もあります。',
  );

  if (input.todayJudgment === 'buy') {
    return [`${who}は、今のところ買ってもよさそうです。`, `理由：${positive}`, `注意：${caution}`].join(
      '\n',
    );
  }
  if (input.todayJudgment === 'skip') {
    return [
      `${who}は、今は買わない方が安全です。`,
      `理由：${sanitizeBeginnerText(input.bearCaseJa[0] ?? caution)}`,
      `無理せず、様子を見ましょう。`,
    ].join('\n');
  }
  return [
    `${who}は、今すぐ買わず様子見がおすすめです。`,
    `良い点：${positive}`,
    `気になる点：${caution}`,
  ].join('\n');
}

export type BeginnerRecommendationSummary = {
  name: string;
  symbol: string;
  recommendationLabel: string;
  gradeLabel: 'A' | 'B' | 'C' | 'D';
  certaintyLabel: '高' | '中' | '低';
  maxAmountMYR: number;
  maxAmountLabel: string;
  maxSharesLabel: string;
  reasons: string[];
  cautions: string[];
  naturalExplanationJa: string;
};

function formatSharesLabel(candidate: AllocationCandidate): string {
  if (candidate.unpurchasableWarning) {
    return '今の金額では買えません';
  }
  if (candidate.isFractionalShares) {
    return `約${candidate.estimatedShares.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}株まで`;
  }
  const whole = Math.floor(candidate.estimatedShares);
  if (whole <= 0) return '1株未満のため見送り';
  return `${whole}株まで`;
}

export function buildBeginnerRecommendationSummary(
  candidate: AllocationCandidate,
  meta: AllocationRecommendationMeta,
): BeginnerRecommendationSummary {
  const recommendation = mapVerdictToCardRecommendation({
    adoptionVerdict: meta.adoptionVerdict,
    buyAllowed: meta.buyAllowed,
  });
  const phrase = mapVerdictToBeginnerPhrase({
    adoptionVerdict: meta.adoptionVerdict,
    buyAllowed: meta.buyAllowed,
  });

  const reasons = sanitizeBeginnerLines(
    [...meta.bullCaseJa, ...meta.approvalReasonsJa, ...meta.charterApprovalReasonsJa],
    3,
  );
  const cautions = sanitizeBeginnerLines(
    [...meta.riskFactorsJa, ...meta.bearCaseJa, ...meta.oppositionReasonsJa],
    3,
  );

  if (reasons.length === 0) {
    reasons.push('長く持つと資産が増えやすい材料があります');
  }
  if (cautions.length === 0) {
    cautions.push('値段が下がる可能性もあります');
  }

  let grade = mapScoreToGradeLabel(meta.recommendationScore);
  if (recommendation.key === 'skip') grade = 'D';
  if (recommendation.key === 'hold' && grade === 'A') grade = 'B';

  return {
    name: candidate.name,
    symbol: candidate.symbol,
    recommendationLabel: recommendation.labelJa,
    gradeLabel: grade,
    certaintyLabel: mapConfidenceToCertaintyLabel(meta.confidenceLevel),
    maxAmountMYR: candidate.allocationMYR,
    maxAmountLabel: `RM${candidate.allocationMYR.toLocaleString('ja-JP')}まで`,
    maxSharesLabel: formatSharesLabel(candidate),
    reasons,
    cautions,
    naturalExplanationJa: buildBeginnerNaturalExplanation({
      name: candidate.name,
      recommendationPhrase: phrase,
      reasons,
      cautions,
    }),
  };
}
