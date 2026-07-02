/**
 * Phase 2 — OpenAI 委員会レビュー enrichment（判定ロック + decisionHash 改ざん検知）
 */
import type { AllocationRecommendationMeta } from './recommendationProvenance';
import {
  computeDecisionHash,
  decisionHashesMatch,
  type DecisionHashInput,
} from './recommendationDecisionHash';
import {
  buildFallbackCommitteeReview,
  buildFallbackRedTeamReview,
} from './investmentCommitteeReviewFallback';
import { fetchCommitteeReview } from './investmentCommitteeReviewService';
import { fetchRedTeamReview } from './investmentCommitteeRedTeamService';
import { finalizeRecommendationMetaMetrics } from './recommendationMetaFinalize';
import type {
  CommitteeReview,
  NarrativeCacheStatus,
  RecommendationEnrichmentAudit,
} from '../types/investmentCommitteeNarrative';
import { DecisionTamperedError } from '../types/investmentCommitteeNarrative';
import type { AllocationPlan } from '../types';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';

export type EnrichRecommendationMetaResult = {
  meta: AllocationRecommendationMeta;
  audit: RecommendationEnrichmentAudit;
  reviewApplied: boolean;
};

function decisionInputFromMeta(symbol: string, meta: AllocationRecommendationMeta): DecisionHashInput {
  return {
    symbol,
    adoptionVerdict: meta.adoptionVerdict,
    buyAllowed: meta.buyAllowed,
    recommendationScore: meta.recommendationScore,
    confidencePct: meta.confidencePct,
  };
}

export function assertLockedDecisionFieldsUnchanged(
  symbol: string,
  before: AllocationRecommendationMeta,
  after: AllocationRecommendationMeta,
): void {
  assertDecisionHashUnchanged(symbol, before, after);
  if (
    before.adoptionVerdict !== after.adoptionVerdict ||
    before.buyAllowed !== after.buyAllowed ||
    before.recommendationScore !== after.recommendationScore ||
    before.confidencePct !== after.confidencePct
  ) {
    throw new DecisionTamperedError(before.decisionHash, after.decisionHash);
  }
}

export function assertDecisionHashUnchanged(
  symbol: string,
  before: AllocationRecommendationMeta,
  after: AllocationRecommendationMeta,
): void {
  const decisionHashBefore = before.decisionHash;
  const decisionHashAfter = computeDecisionHash(decisionInputFromMeta(symbol, after));
  if (!decisionHashesMatch(decisionHashBefore, decisionHashAfter)) {
    throw new DecisionTamperedError(decisionHashBefore, decisionHashAfter);
  }
}

function applyReviewToMeta(
  meta: AllocationRecommendationMeta,
  review: CommitteeReview,
): AllocationRecommendationMeta {
  return {
    ...meta,
    bullCaseJa: [...review.bullCaseJa],
    bearCaseJa: [...review.bearCaseJa],
    riskFactorsJa: [...review.riskFactorsJa],
    narrativeSource: 'openai',
    narrativeGeneratedAt: review.generatedAt,
  };
}

function applyRedTeamToMeta(
  meta: AllocationRecommendationMeta,
  counterArgumentsJa: string[],
  redTeamScore: number,
  generatedAt: string | null,
): AllocationRecommendationMeta {
  return {
    ...meta,
    counterArgumentsJa: [...counterArgumentsJa],
    redTeamScore,
    redTeamGeneratedAt: generatedAt,
  };
}

function buildEnrichmentAudit(
  meta: AllocationRecommendationMeta,
  decisionHashBefore: string,
  narrativeCacheStatus: NarrativeCacheStatus,
  redTeamCacheStatus?: NarrativeCacheStatus,
): RecommendationEnrichmentAudit {
  return {
    decisionHashBefore,
    decisionHashAfter: meta.decisionHash,
    narrativeCacheStatus,
    bullCaseCount: meta.bullCaseJa.length,
    bearCaseCount: meta.bearCaseJa.length,
    riskFactorCount: meta.riskFactorsJa.length,
    counterArgumentCount: meta.counterArgumentsJa.length,
    redTeamCacheStatus,
  };
}

function buildReviewInput(
  symbol: string,
  meta: AllocationRecommendationMeta,
  evidence?: ConciergeSymbolEvidence,
) {
  return {
    symbol,
    lockedVerdict: meta.adoptionVerdict,
    lockedVerdictLabelJa: meta.adoptionLabelJa,
    recommendationScore: meta.recommendationScore,
    confidencePct: meta.confidencePct,
    charterApprovalReasonsJa: meta.charterApprovalReasonsJa,
    charterOppositionReasonsJa: meta.charterOppositionReasonsJa,
    qualitySignalsSummaryJa: meta.charterEvaluation.qualitySignals.map(
      (s) => `${s.labelJa}:${s.matched ? '✓' : '—'}`,
    ),
    evidence,
  };
}

export type EnrichRecommendationMetaOptions = {
  fetchImpl?: typeof fetch;
  forceApi?: boolean;
  evidence?: ConciergeSymbolEvidence;
};

export async function enrichRecommendationMeta(
  symbol: string,
  meta: AllocationRecommendationMeta,
  options: EnrichRecommendationMetaOptions & { name?: string } = {},
): Promise<EnrichRecommendationMetaResult> {
  const decisionHashBefore = meta.decisionHash;
  const reviewInput = buildReviewInput(symbol, meta, options.evidence);

  const fetchResult = await fetchCommitteeReview(reviewInput, options);
  let enriched: AllocationRecommendationMeta;
  let reviewApplied = false;
  let narrativeCacheStatus: NarrativeCacheStatus = 'miss';

  if (!fetchResult) {
    const fallback = buildFallbackCommitteeReview({
      charterApprovalReasonsJa: meta.charterApprovalReasonsJa,
      charterOppositionReasonsJa: meta.charterOppositionReasonsJa,
    });
    enriched = applyReviewToMeta(meta, fallback);
    enriched = { ...enriched, narrativeSource: 'rule' };
  } else {
    enriched = applyReviewToMeta(meta, fetchResult.review);
    reviewApplied = true;
    narrativeCacheStatus = fetchResult.cacheStatus;
  }

  const redTeamResult = await fetchRedTeamReview(reviewInput, options);
  let redTeamCacheStatus: NarrativeCacheStatus = 'miss';

  if (redTeamResult) {
    enriched = applyRedTeamToMeta(
      enriched,
      redTeamResult.review.counterArgumentsJa,
      redTeamResult.review.redTeamScore,
      redTeamResult.review.generatedAt,
    );
    redTeamCacheStatus = redTeamResult.cacheStatus;
  } else {
    const fallbackRed = buildFallbackRedTeamReview({
      lockedVerdict: meta.adoptionVerdict,
      charterApprovalReasonsJa: meta.charterApprovalReasonsJa,
      charterOppositionReasonsJa: meta.charterOppositionReasonsJa,
    });
    enriched = applyRedTeamToMeta(
      enriched,
      fallbackRed.counterArgumentsJa,
      fallbackRed.redTeamScore,
      null,
    );
  }

  enriched = finalizeRecommendationMetaMetrics(enriched, {
    name: options.name,
    aiRedTeamScore: redTeamResult?.review.redTeamScore,
  });

  assertLockedDecisionFieldsUnchanged(symbol, meta, enriched);

  return {
    meta: enriched,
    reviewApplied,
    audit: buildEnrichmentAudit(
      enriched,
      decisionHashBefore,
      narrativeCacheStatus,
      redTeamCacheStatus,
    ),
  };
}

export async function enrichAllocationPlanNarratives(
  plan: AllocationPlan,
  options: EnrichRecommendationMetaOptions = {},
): Promise<{
  plan: AllocationPlan;
  audits: Array<{ symbol: string; audit: RecommendationEnrichmentAudit; reviewApplied: boolean }>;
}> {
  const audits: Array<{ symbol: string; audit: RecommendationEnrichmentAudit; reviewApplied: boolean }> = [];
  const candidates: AllocationPlan['candidates'] = [];
  for (const candidate of plan.candidates) {
    if (!candidate.recommendationMeta) {
      candidates.push(candidate);
      continue;
    }
    const result = await enrichRecommendationMeta(
      candidate.symbol,
      candidate.recommendationMeta,
      { ...options, name: candidate.name },
    );
    audits.push({
      symbol: candidate.symbol,
      audit: result.audit,
      reviewApplied: result.reviewApplied,
    });
    candidates.push({ ...candidate, recommendationMeta: result.meta });
  }
  return { plan: { ...plan, candidates }, audits };
}

export function buildSkippedEnrichmentAudit(meta: AllocationRecommendationMeta): RecommendationEnrichmentAudit {
  return {
    decisionHashBefore: meta.decisionHash,
    decisionHashAfter: meta.decisionHash,
    narrativeCacheStatus: 'miss',
    bullCaseCount: meta.bullCaseJa.length,
    bearCaseCount: meta.bearCaseJa.length,
    riskFactorCount: meta.riskFactorsJa.length,
    counterArgumentCount: meta.counterArgumentsJa.length,
  };
}
