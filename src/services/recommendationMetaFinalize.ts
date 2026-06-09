import type { AllocationRecommendationMeta } from './recommendationProvenance';
import { applyCommitteeMetrics } from './investmentCommitteeMetrics';
import { buildBeginnerReasonJa } from './beginnerRecommendationSummary';
import { mapVerdictToCardRecommendation } from './beginnerDisplayMapper';

export function finalizeRecommendationMetaMetrics(
  meta: AllocationRecommendationMeta,
  input?: { name?: string; aiRedTeamScore?: number | null },
): AllocationRecommendationMeta {
  const withMetrics = applyCommitteeMetrics(meta, input?.aiRedTeamScore ?? meta.redTeamScore);
  const rec = mapVerdictToCardRecommendation({
    adoptionVerdict: meta.adoptionVerdict,
    buyAllowed: meta.buyAllowed,
  });
  const todayJudgment = rec.key === 'buy' ? 'buy' : rec.key === 'hold' ? 'wait' : 'skip';
  const beginnerReasonJa = buildBeginnerReasonJa({
    name: input?.name,
    todayJudgment,
    bullCaseJa: meta.bullCaseJa,
    bearCaseJa: meta.bearCaseJa,
    riskFactorsJa: meta.riskFactorsJa,
  });
  return {
    ...meta,
    ...withMetrics,
    beginnerReasonJa,
  };
}
