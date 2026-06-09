import type { AllocationCandidate } from '../types';
import type { AllocationPlan } from '../types';
import type { AllocationRecommendationMeta } from './recommendationProvenance';
import {
  mapToTrustProfileTypeLabel,
  TRUST_MD_APPROVED_BRIEF_JA,
  TRUST_MD_APPROVED_LABEL_JA,
  TRUST_MD_PENDING_BRIEF_JA,
  TRUST_MD_PENDING_LABEL_JA,
  type TrustProfileTypeLabel,
} from '../constants/trustDisplay';
import { buildTrustMonthlyOneLinerJa, collectCharterApprovalReasonsFromPlan } from './trustMonthlyOneLiner';
import { sanitizeTrustDisplayText } from './trustDisplaySanitizer';

export type TrustExpectedRiskLevel = '低' | '中' | '高';

export type TrustRecommendationSummary = {
  name: string;
  allocationPctLabel: string;
  recommendedAmountLabel: string;
  expectedRiskLevel: TrustExpectedRiskLevel;
};

export type TrustPlanPresentation = {
  committeeApprovalLabel: string;
  committeeApproved: boolean;
  profileTypeLabel: TrustProfileTypeLabel;
  allocationLines: TrustRecommendationSummary[];
  totalAmountLabel: string;
  expectedRiskLevel: TrustExpectedRiskLevel;
  allocationSummaryText: string;
  monthlyOneLinerJa: string;
};

export type TrustHomeBriefing = {
  lines: string[];
  hasPlan: boolean;
  profileTypeLabel: TrustProfileTypeLabel;
};

export function resolveTrustExpectedRiskLevel(meta: AllocationRecommendationMeta): TrustExpectedRiskLevel {
  if (meta.adoptionVerdict === 'reject' || !meta.buyAllowed) return '高';
  if (meta.redTeamScore >= 65 || meta.committeeTrustPct < 55) return '高';
  if (meta.redTeamScore >= 40 || meta.committeeTrustPct < 75 || meta.adoptionVerdict === 'hold') {
    return '中';
  }
  return '低';
}

export function resolvePlanTrustExpectedRiskLevel(
  candidates: AllocationCandidate[],
): TrustExpectedRiskLevel {
  const levels = candidates
    .map((c) => c.recommendationMeta)
    .filter((m): m is AllocationRecommendationMeta => m != null)
    .map(resolveTrustExpectedRiskLevel);

  if (levels.includes('高')) return '高';
  if (levels.includes('中')) return '中';
  return '低';
}

function isCommitteeApproved(meta: AllocationRecommendationMeta): boolean {
  return meta.adoptionVerdict === 'adopt' && meta.buyAllowed;
}

export function currentMonthLabelJa(date = new Date()): string {
  return `${date.getMonth() + 1}月`;
}

export function buildTrustRecommendationSummary(
  candidate: AllocationCandidate,
  meta: AllocationRecommendationMeta,
): TrustRecommendationSummary {
  return {
    name: candidate.name,
    allocationPctLabel: `${candidate.allocationPct.toFixed(0)}%`,
    recommendedAmountLabel: `RM${candidate.allocationMYR.toLocaleString('ja-JP')}`,
    expectedRiskLevel: resolveTrustExpectedRiskLevel(meta),
  };
}

export function buildTrustPlanPresentation(plan: AllocationPlan): TrustPlanPresentation {
  const lines: TrustRecommendationSummary[] = [];
  let allApproved = plan.candidates.length > 0;

  for (const candidate of plan.candidates) {
    const meta = candidate.recommendationMeta;
    if (!meta) {
      allApproved = false;
      continue;
    }
    if (!isCommitteeApproved(meta)) allApproved = false;
    lines.push(buildTrustRecommendationSummary(candidate, meta));
  }

  const allocationSummaryText = lines
    .map((line) => `${line.name} ${line.allocationPctLabel}`)
    .join('、');

  const profileTypeLabel = mapToTrustProfileTypeLabel({
    investmentStyle: plan.investmentStyle,
    riskLevel: plan.riskLevel,
  });
  const expectedRiskLevel = resolvePlanTrustExpectedRiskLevel(plan.candidates);

  return {
    committeeApprovalLabel: allApproved ? TRUST_MD_APPROVED_LABEL_JA : TRUST_MD_PENDING_LABEL_JA,
    committeeApproved: allApproved,
    profileTypeLabel,
    allocationLines: lines,
    totalAmountLabel: `RM${plan.depositMYR.toLocaleString('ja-JP')}`,
    expectedRiskLevel,
    allocationSummaryText,
    monthlyOneLinerJa: buildTrustMonthlyOneLinerJa({
      approvalReasonsJa: collectCharterApprovalReasonsFromPlan(plan),
      profileTypeLabel,
      expectedRiskLevel,
    }),
  };
}

export function buildTrustHomeBriefing(input: {
  hasPlan: boolean;
  profileTypeLabel?: TrustProfileTypeLabel;
  committeeApproved?: boolean;
  depositMYR?: number;
}): TrustHomeBriefing {
  const profileTypeLabel = input.profileTypeLabel ?? '標準型';
  const lines: string[] = [];

  if (input.hasPlan) {
    lines.push('今月の配分案が完成しました。');
    lines.push(`今回は${profileTypeLabel}を推奨します。`);
    lines.push(input.committeeApproved ? TRUST_MD_APPROVED_BRIEF_JA : TRUST_MD_PENDING_BRIEF_JA);
  } else {
    lines.push('今月の市場を分析しました。');
    const amount = input.depositMYR ?? 1000;
    lines.push(`RM${amount.toLocaleString('ja-JP')}から配分案をご用意できます。`);
    lines.push('ご入金額のご入力をお待ちしています。');
  }

  return { lines, hasPlan: input.hasPlan, profileTypeLabel };
}

export function buildTrustConciergeMessageJa(input: {
  depositMYR: number;
  hasPlan?: boolean;
  profileTypeLabel?: TrustProfileTypeLabel;
  committeeApproved?: boolean;
}): string {
  return buildTrustHomeBriefing({
    hasPlan: input.hasPlan === true,
    profileTypeLabel: input.profileTypeLabel,
    committeeApproved: input.committeeApproved,
    depositMYR: input.depositMYR,
  }).lines.join('\n');
}
