/**
 * Phase22 — Analyst Target Intelligence
 */
import type { BursaAnalystConsensusAnalysis } from '../../types/bursaAnalystConsensus';
import type { BursaFairValueIntelligenceAnalysis } from '../../types/bursaFairValueIntelligence';
import type {
  BursaAnalystTargetIntelligenceAnalysis,
  FairValueVsAnalystJudgment,
  RecommendationDistribution,
  TargetRevisionTrend,
} from '../../types/bursaAnalystTargetIntelligence';
import {
  ANALYST_TARGET_FIELD_MISSING_JA,
  ANALYST_TARGET_INTELLIGENCE_UNAVAILABLE_JA,
} from '../../types/bursaAnalystTargetIntelligence';
import {
  ANALYST_TARGET_SCORE_MAX,
  ANALYST_TARGET_SCORE_MIN,
  FV_VS_ANALYST_ALIGNED_THRESHOLD_PCT,
  FV_VS_ANALYST_JUDGMENT_JA,
  TARGET_REVISION_TREND_JA,
} from '../../constants/bursaAnalystTargetIntelligence';
import {
  fetchAllAnalystTargetPartials,
  type AnalystTargetPartial,
} from './bursaAnalystTargetIntelligenceProviders';
import type { RawMaterialInput } from './bursaMaterialSentiment';
import type { BursaMaterialItem, BursaMaterialSentiment } from '../../types/bursaDisclosure';

const ANALYST_TARGET_MATERIAL_SOURCE_WEIGHT = 1.4;
const ANALYST_TARGET_FIELDS_TOTAL = 10;

function clampScore(n: number): number {
  return Math.max(ANALYST_TARGET_SCORE_MIN, Math.min(ANALYST_TARGET_SCORE_MAX, Math.round(n)));
}

function fmtPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return ANALYST_TARGET_FIELD_MISSING_JA;
  return `RM ${n.toFixed(2)}`;
}

function fmtPct(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return ANALYST_TARGET_FIELD_MISSING_JA;
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

function fmtScore(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'yahoo_finance':
      return 'Yahoo Finance';
    case 'analyst_consensus':
      return 'Analyst Consensus';
    default:
      return '未取得';
  }
}

export function computeUpsidePct(
  target: number | null,
  currentPrice: number | null,
): number | null {
  if (target == null || currentPrice == null || currentPrice <= 0) return null;
  return ((target - currentPrice) / currentPrice) * 100;
}

export function computeDownsidePct(
  bearTarget: number | null,
  currentPrice: number | null,
): number | null {
  if (bearTarget == null || currentPrice == null || currentPrice <= 0) return null;
  return ((currentPrice - bearTarget) / currentPrice) * 100;
}

export function computeAnalystTargetScore(input: {
  upsidePct: number | null;
  coverageCount: number | null;
  targetRevisionTrend: TargetRevisionTrend | null;
}): number {
  let score = 0;
  const upside = input.upsidePct;
  if (upside != null) {
    if (upside > 30) score += 8;
    else if (upside > 20) score += 5;
    else if (upside > 10) score += 2;
    if (upside < 0) score -= 3;
  }
  if ((input.coverageCount ?? 0) > 15) score += 2;
  if (input.targetRevisionTrend === 'Upgrade') score += 3;
  if (input.targetRevisionTrend === 'Downgrade') score -= 3;
  return clampScore(score);
}

export function computeFairValueVsAnalystDiffPct(
  fairValueMid: number | null,
  analystTarget: number | null,
): number | null {
  if (
    fairValueMid == null ||
    analystTarget == null ||
    fairValueMid <= 0 ||
    !Number.isFinite(fairValueMid)
  ) {
    return null;
  }
  return ((analystTarget - fairValueMid) / fairValueMid) * 100;
}

export function classifyFairValueVsAnalyst(
  diffPct: number | null,
): FairValueVsAnalystJudgment {
  if (diffPct == null) return 'Unavailable';
  if (diffPct >= FV_VS_ANALYST_ALIGNED_THRESHOLD_PCT) return 'Analyst Bullish';
  if (diffPct <= -FV_VS_ANALYST_ALIGNED_THRESHOLD_PCT) return 'Fair Value Bullish';
  return 'Aligned';
}

function fmtRecommendationDistribution(dist: RecommendationDistribution | null): string {
  if (!dist) return ANALYST_TARGET_FIELD_MISSING_JA;
  return `SB:${dist.strongBuy} B:${dist.buy} H:${dist.hold} R:${dist.reduce} S:${dist.sell}`;
}

export function countAcquiredAnalystTargetFields(input: {
  targetMedian: number | null;
  targetMean: number | null;
  bullCaseTarget: number | null;
  bearCaseTarget: number | null;
  coverageCount: number | null;
  currentPrice: number | null;
  upsidePct: number | null;
  downsidePct: number | null;
  targetRevisionTrend: TargetRevisionTrend | null;
  recommendationDistribution: RecommendationDistribution | null;
}): number {
  let count = 0;
  if (input.targetMedian != null) count++;
  if (input.targetMean != null) count++;
  if (input.bullCaseTarget != null) count++;
  if (input.bearCaseTarget != null) count++;
  if (input.coverageCount != null && input.coverageCount > 0) count++;
  if (input.currentPrice != null && input.currentPrice > 0) count++;
  if (input.upsidePct != null) count++;
  if (input.downsidePct != null) count++;
  if (input.targetRevisionTrend != null) count++;
  if (input.recommendationDistribution != null) count++;
  return count;
}

function buildDisplayFields(input: {
  partial: AnalystTargetPartial;
  upsidePct: number | null;
  downsidePct: number | null;
  analystScore: number;
  fairValueMid: number | null;
  fairValueVsAnalystDiffPct: number | null;
  fairValueVsAnalystJudgment: FairValueVsAnalystJudgment;
  fieldsAcquired: number;
}): BursaAnalystTargetIntelligenceAnalysis['displayJa'] {
  const { partial } = input;
  return {
    targetMedian: fmtPrice(partial.targetMedian),
    targetMean: fmtPrice(partial.targetMean),
    bullTarget: fmtPrice(partial.bullCaseTarget),
    bearTarget: fmtPrice(partial.bearCaseTarget),
    coverageCount:
      partial.coverageCount != null && partial.coverageCount > 0
        ? String(partial.coverageCount)
        : ANALYST_TARGET_FIELD_MISSING_JA,
    currentPrice: fmtPrice(partial.currentPrice),
    upsidePct: fmtPct(input.upsidePct),
    downsidePct: fmtPct(input.downsidePct),
    targetTrend:
      partial.targetRevisionTrend != null
        ? (TARGET_REVISION_TREND_JA[partial.targetRevisionTrend] ?? partial.targetRevisionTrend)
        : ANALYST_TARGET_FIELD_MISSING_JA,
    recommendationDistribution: fmtRecommendationDistribution(partial.recommendationDistribution),
    analystScore: fmtScore(input.analystScore),
    fairValueMid: fmtPrice(input.fairValueMid),
    fairValueVsAnalystDiffPct: fmtPct(input.fairValueVsAnalystDiffPct),
    fairValueVsAnalystJudgment:
      FV_VS_ANALYST_JUDGMENT_JA[input.fairValueVsAnalystJudgment] ??
      input.fairValueVsAnalystJudgment,
    fieldAcquisitionRate: `${input.fieldsAcquired}/${ANALYST_TARGET_FIELDS_TOTAL}`,
    source: sourceLabel(partial.source),
  };
}

function buildEvaluationJa(input: {
  partial: AnalystTargetPartial;
  upsidePct: number | null;
  analystScore: number;
  fairValueVsAnalystJudgment: FairValueVsAnalystJudgment;
}): string {
  const parts: string[] = ['Analyst Target Intelligence'];
  const refTarget = input.partial.targetMedian ?? input.partial.targetMean;
  if (refTarget != null) parts.push(`Target ${fmtPrice(refTarget)}`);
  if (input.upsidePct != null) parts.push(fmtPct(input.upsidePct));
  if (input.partial.targetRevisionTrend) {
    parts.push(TARGET_REVISION_TREND_JA[input.partial.targetRevisionTrend] ?? input.partial.targetRevisionTrend);
  }
  parts.push(`Score ${fmtScore(input.analystScore)}`);
  if (input.fairValueVsAnalystJudgment !== 'Unavailable') {
    parts.push(FV_VS_ANALYST_JUDGMENT_JA[input.fairValueVsAnalystJudgment] ?? input.fairValueVsAnalystJudgment);
  }
  parts.push(`[${sourceLabel(input.partial.source)}]`);
  return parts.join(' · ');
}

function emptyAnalysis(): BursaAnalystTargetIntelligenceAnalysis {
  const missing = ANALYST_TARGET_FIELD_MISSING_JA;
  return {
    availability: 'unavailable',
    availabilityLabelJa: ANALYST_TARGET_INTELLIGENCE_UNAVAILABLE_JA,
    source: 'none',
    targetMedian: null,
    targetMean: null,
    bullCaseTarget: null,
    bearCaseTarget: null,
    coverageCount: null,
    currentPrice: null,
    upsidePct: null,
    downsidePct: null,
    targetRevisionTrend: null,
    recommendationDistribution: null,
    analystScore: 0,
    fairValueMid: null,
    fairValueVsAnalystDiffPct: null,
    fairValueVsAnalystJudgment: 'Unavailable',
    displayJa: {
      targetMedian: missing,
      targetMean: missing,
      bullTarget: missing,
      bearTarget: missing,
      coverageCount: missing,
      currentPrice: missing,
      upsidePct: missing,
      downsidePct: missing,
      targetTrend: missing,
      recommendationDistribution: missing,
      analystScore: '0',
      fairValueMid: missing,
      fairValueVsAnalystDiffPct: missing,
      fairValueVsAnalystJudgment: FV_VS_ANALYST_JUDGMENT_JA.Unavailable,
      fieldAcquisitionRate: `0/${ANALYST_TARGET_FIELDS_TOTAL}`,
      source: '未取得',
    },
    evaluationJa: ANALYST_TARGET_INTELLIGENCE_UNAVAILABLE_JA,
    hasExtractableData: false,
    fieldsAcquired: 0,
    fieldsTotal: ANALYST_TARGET_FIELDS_TOTAL,
    fetchedAt: null,
  };
}

export async function buildAnalystTargetIntelligenceAnalysis(input: {
  stockCode: string;
  analystConsensus?: BursaAnalystConsensusAnalysis | null;
  fairValueIntelligence?: BursaFairValueIntelligenceAnalysis | null;
  fetchLiveExternal: boolean;
}): Promise<BursaAnalystTargetIntelligenceAnalysis> {
  const partial = await fetchAllAnalystTargetPartials({
    stockCode: input.stockCode,
    analystConsensus: input.analystConsensus,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  if (!partial) return emptyAnalysis();

  const refTarget = partial.targetMedian ?? partial.targetMean;
  const upsidePct = computeUpsidePct(refTarget, partial.currentPrice);
  const downsidePct = computeDownsidePct(partial.bearCaseTarget, partial.currentPrice);
  const analystScore = computeAnalystTargetScore({
    upsidePct,
    coverageCount: partial.coverageCount,
    targetRevisionTrend: partial.targetRevisionTrend,
  });

  const fairValueMid = input.fairValueIntelligence?.fairValueMid ?? null;
  const fairValueVsAnalystDiffPct = computeFairValueVsAnalystDiffPct(
    fairValueMid,
    refTarget,
  );
  const fairValueVsAnalystJudgment = classifyFairValueVsAnalyst(fairValueVsAnalystDiffPct);

  const fieldsAcquired = countAcquiredAnalystTargetFields({
    targetMedian: partial.targetMedian,
    targetMean: partial.targetMean,
    bullCaseTarget: partial.bullCaseTarget,
    bearCaseTarget: partial.bearCaseTarget,
    coverageCount: partial.coverageCount,
    currentPrice: partial.currentPrice,
    upsidePct,
    downsidePct,
    targetRevisionTrend: partial.targetRevisionTrend,
    recommendationDistribution: partial.recommendationDistribution,
  });

  const hasExtractableData = refTarget != null;

  return {
    availability: hasExtractableData ? 'available' : 'unavailable',
    availabilityLabelJa: hasExtractableData
      ? 'Analyst Target Intelligence 取得済'
      : ANALYST_TARGET_INTELLIGENCE_UNAVAILABLE_JA,
    source: partial.source,
    targetMedian: partial.targetMedian,
    targetMean: partial.targetMean,
    bullCaseTarget: partial.bullCaseTarget,
    bearCaseTarget: partial.bearCaseTarget,
    coverageCount: partial.coverageCount,
    currentPrice: partial.currentPrice,
    upsidePct,
    downsidePct,
    targetRevisionTrend: partial.targetRevisionTrend,
    recommendationDistribution: partial.recommendationDistribution,
    analystScore,
    fairValueMid,
    fairValueVsAnalystDiffPct,
    fairValueVsAnalystJudgment,
    displayJa: buildDisplayFields({
      partial,
      upsidePct,
      downsidePct,
      analystScore,
      fairValueMid,
      fairValueVsAnalystDiffPct,
      fairValueVsAnalystJudgment,
      fieldsAcquired,
    }),
    evaluationJa: buildEvaluationJa({
      partial,
      upsidePct,
      analystScore,
      fairValueVsAnalystJudgment,
    }),
    hasExtractableData,
    fieldsAcquired,
    fieldsTotal: ANALYST_TARGET_FIELDS_TOTAL,
    fetchedAt: new Date().toISOString(),
  };
}

export function analystTargetIntelligenceMaterialScoreAdjustment(
  analysis: BursaAnalystTargetIntelligenceAnalysis,
): number {
  if (analysis.availability !== 'available') return 0;
  const capped = Math.max(-8, Math.min(8, analysis.analystScore));
  return Math.round(capped * 0.5);
}

export function scoreAnalystTargetMaterialItem(
  analysis: BursaAnalystTargetIntelligenceAnalysis,
  raw: RawMaterialInput,
): BursaMaterialItem {
  const baseScore = analysis.analystScore;
  const weighted = Math.round(baseScore * ANALYST_TARGET_MATERIAL_SOURCE_WEIGHT);
  const score = Math.max(-100, Math.min(100, weighted));
  const sentiment: BursaMaterialSentiment =
    score > 8 ? '好材料' : score < -8 ? '悪材料' : '中立';
  return {
    id: raw.id ?? 'phase22-analyst-target',
    title: raw.title,
    source: raw.source,
    sourceLabelJa: raw.sourceLabelJa ?? 'Phase22 Analyst Target Intelligence',
    score,
    sentiment,
    scoreJa: fmtScore(score),
    reasonJa: analysis.evaluationJa,
    detailJa: analysis.evaluationJa,
    publishedAt: raw.publishedAt,
    url: raw.url,
  };
}

export function analystTargetIntelligenceToMaterialInputs(
  analysis: BursaAnalystTargetIntelligenceAnalysis,
): RawMaterialInput[] {
  if (analysis.availability !== 'available' || !analysis.hasExtractableData) return [];

  const d = analysis.displayJa;
  const trendPart = d.targetTrend !== ANALYST_TARGET_FIELD_MISSING_JA ? ` · ${d.targetTrend}` : '';
  const fvPart =
    analysis.fairValueVsAnalystJudgment !== 'Unavailable'
      ? ` · FV比較 ${d.fairValueVsAnalystJudgment}`
      : '';

  return [
    {
      id: 'phase22-analyst-target',
      title: `Analyst Target ${d.targetMedian} Upside ${d.upsidePct}${trendPart}${fvPart}`,
      source: 'bursa_announcement',
      sourceLabelJa: 'Phase22 Analyst Target Intelligence',
      url: null,
      publishedAt: null,
    },
  ];
}
