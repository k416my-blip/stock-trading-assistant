/**
 * 委員会採用0件時のウォッチ銘柄自動補完（信託配分フロー継続用）
 */
import type { AllocationCandidate } from '../types';
import type { AllocationRecommendationMeta } from './recommendationProvenance';
import { computeDecisionHash } from './recommendationDecisionHash';
import { isAdoptableRecommendation } from './recommendationProvenance';

export type CommitteeJudgmentCounts = {
  adopt: number;
  reject: number;
  watch: number;
};

export function countCommitteeJudgments(candidates: AllocationCandidate[]): CommitteeJudgmentCounts {
  const counts: CommitteeJudgmentCounts = { adopt: 0, reject: 0, watch: 0 };
  for (const candidate of candidates) {
    const meta = candidate.recommendationMeta;
    if (!meta) {
      counts.watch += 1;
      continue;
    }
    if (isAdoptableRecommendation(meta)) {
      counts.adopt += 1;
    } else if (meta.adoptionVerdict === 'reject') {
      counts.reject += 1;
    } else {
      counts.watch += 1;
    }
  }
  return counts;
}

export function logCommitteeJudgmentCounts(
  counts: CommitteeJudgmentCounts,
  detail?: Record<string, unknown>,
): void {
  console.warn(
    '[COMMITTEE_JUDGMENT]',
    JSON.stringify({
      adopt: counts.adopt,
      reject: counts.reject,
      watch: counts.watch,
      ...detail,
    }),
  );
}

/** finalScore / portfolioScore 相当（配分候補の総合スコア） */
export function candidatePortfolioScore(candidate: AllocationCandidate): number {
  return (
    candidate.recommendation?.totalScore ??
    candidate.recommendationMeta?.recommendationScore ??
    0
  );
}

export function resolveFallbackPickCount(countWanted: number): number {
  return Math.min(10, Math.max(3, countWanted));
}

/**
 * ウォッチ（hold）銘柄を finalScore 上位優先で 3〜10 件選ぶ。
 * 不足時は reject 含む全候補からスコア順で補う。
 */
export function selectWatchFallbackCandidates(
  candidates: AllocationCandidate[],
  pickCount: number,
): AllocationCandidate[] {
  const withMeta = candidates.filter((c) => c.recommendationMeta);
  const byScore = (a: AllocationCandidate, b: AllocationCandidate) =>
    candidatePortfolioScore(b) - candidatePortfolioScore(a);

  const watchPool = withMeta
    .filter((c) => c.recommendationMeta!.adoptionVerdict === 'hold')
    .sort(byScore);
  const otherPool = withMeta
    .filter((c) => c.recommendationMeta!.adoptionVerdict !== 'hold')
    .sort(byScore);

  const seen = new Set<string>();
  const picks: AllocationCandidate[] = [];
  for (const candidate of [...watchPool, ...otherPool]) {
    if (picks.length >= pickCount) break;
    const key = candidate.symbol.trim().toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    picks.push(candidate);
  }
  return picks;
}

const WATCH_FALLBACK_APPROVAL_NOTE_JA =
  '委員会の採用可が0件のため、ウォッチ銘柄のスコア上位から信託配分用に自動補完しました。';

export function promoteCandidateForTrustFallback(
  candidate: AllocationCandidate,
): AllocationCandidate {
  const meta = candidate.recommendationMeta;
  if (!meta) return candidate;

  const adoptionVerdict = 'adopt' as const;
  const buyAllowed = true;
  const decisionHash = computeDecisionHash({
    symbol: candidate.symbol,
    adoptionVerdict,
    buyAllowed,
    recommendationScore: meta.recommendationScore,
    confidencePct: meta.confidencePct,
  });

  const promoted: AllocationRecommendationMeta = {
    ...meta,
    adoptionVerdict,
    buyAllowed,
    adoptionLabelJa: 'ウォッチ補完（信託配分）',
    decisionHash,
    userApprovalNoteJa: WATCH_FALLBACK_APPROVAL_NOTE_JA,
    charterEvaluation: {
      ...meta.charterEvaluation,
      verdict: adoptionVerdict,
      verdictLabelJa: 'ウォッチ補完（信託配分）',
      buyEligible: true,
    },
  };

  return { ...candidate, recommendationMeta: promoted };
}

export function filterAdoptableCandidates(candidates: AllocationCandidate[]): AllocationCandidate[] {
  return candidates.filter(
    (c) => c.recommendationMeta != null && isAdoptableRecommendation(c.recommendationMeta),
  );
}
