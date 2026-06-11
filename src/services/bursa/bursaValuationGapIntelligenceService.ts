/**
 * Phase22.1 — Valuation Gap Intelligence
 * Fair Value × Analyst Target 統合（外部取得なし・推測禁止）
 */
import type { BursaAnalystTargetIntelligenceAnalysis } from '../../types/bursaAnalystTargetIntelligence';
import type { BursaFairValueIntelligenceAnalysis } from '../../types/bursaFairValueIntelligence';
import type {
  BursaValuationGapIntelligenceAnalysis,
  ValuationGapClassification,
  ValuationGapIntelligenceDisplayFields,
} from '../../types/bursaValuationGapIntelligence';
import {
  VALUATION_GAP_FIELD_MISSING_JA,
  VALUATION_GAP_INTELLIGENCE_UNAVAILABLE_JA,
} from '../../types/bursaValuationGapIntelligence';
import {
  GAP_ANALYST_PREMIUM_PCT,
  GAP_CONSENSUS_LOW_PCT,
  GAP_STRONG_ANALYST_PREMIUM_PCT,
  VALUATION_GAP_CLASSIFICATION_JA,
  VALUATION_GAP_SCORE_MAX,
  VALUATION_GAP_SCORE_MIN,
} from '../../constants/bursaValuationGapIntelligence';
import { computeFairValueVsAnalystDiffPct } from './bursaAnalystTargetIntelligenceService';
import type { RawMaterialInput } from './bursaMaterialSentiment';
import type { BursaMaterialItem, BursaMaterialSentiment } from '../../types/bursaDisclosure';

const VALUATION_GAP_MATERIAL_WEIGHT = 1.2;

function clampScore(n: number): number {
  return Math.max(VALUATION_GAP_SCORE_MIN, Math.min(VALUATION_GAP_SCORE_MAX, Math.round(n)));
}

function fmtPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return VALUATION_GAP_FIELD_MISSING_JA;
  return `RM ${n.toFixed(2)}`;
}

function fmtPct(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return VALUATION_GAP_FIELD_MISSING_JA;
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

function fmtScore(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function resolveAnalystTargetPrice(
  analystTarget: BursaAnalystTargetIntelligenceAnalysis | null | undefined,
): number | null {
  if (!analystTarget) return null;
  return analystTarget.targetMedian ?? analystTarget.targetMean ?? null;
}

export function computeValuationGapPct(
  fairValueMid: number | null,
  analystTarget: number | null,
): number | null {
  return computeFairValueVsAnalystDiffPct(fairValueMid, analystTarget);
}

export function classifyValuationGap(gapPct: number | null): ValuationGapClassification {
  if (gapPct == null || !Number.isFinite(gapPct)) return 'Unavailable';
  if (gapPct > GAP_STRONG_ANALYST_PREMIUM_PCT) return 'Strong Analyst Premium';
  if (gapPct > GAP_ANALYST_PREMIUM_PCT) return 'Analyst Premium';
  if (gapPct >= GAP_CONSENSUS_LOW_PCT) return 'Consensus';
  return 'Model Premium';
}

export function computeValuationGapScore(
  gapPct: number | null,
  classification: ValuationGapClassification,
): number {
  if (gapPct == null || classification === 'Unavailable') return 0;
  switch (classification) {
    case 'Strong Analyst Premium':
      return 10;
    case 'Analyst Premium':
      return 6;
    case 'Consensus':
      return clampScore(Math.round(gapPct / 10));
    case 'Model Premium':
      return gapPct < -GAP_STRONG_ANALYST_PREMIUM_PCT ? -10 : -6;
    default:
      return 0;
  }
}

function buildDisplayFields(input: {
  fairValueMid: number | null;
  analystTarget: number | null;
  gapPct: number | null;
  gapClassification: ValuationGapClassification;
  valuationGapScore: number;
}): ValuationGapIntelligenceDisplayFields {
  return {
    fairValue: fmtPrice(input.fairValueMid),
    analystTarget: fmtPrice(input.analystTarget),
    gapPct: fmtPct(input.gapPct),
    gapClassification:
      VALUATION_GAP_CLASSIFICATION_JA[input.gapClassification] ?? input.gapClassification,
    valuationGapScore: fmtScore(input.valuationGapScore),
  };
}

function buildEvaluationJa(input: {
  gapPct: number | null;
  gapClassification: ValuationGapClassification;
  valuationGapScore: number;
}): string {
  const parts = ['Valuation Gap Intelligence'];
  if (input.gapPct != null) parts.push(fmtPct(input.gapPct));
  if (input.gapClassification !== 'Unavailable') {
    parts.push(VALUATION_GAP_CLASSIFICATION_JA[input.gapClassification] ?? input.gapClassification);
  }
  parts.push(`Score ${fmtScore(input.valuationGapScore)}`);
  return parts.join(' · ');
}

function emptyAnalysis(): BursaValuationGapIntelligenceAnalysis {
  const missing = VALUATION_GAP_FIELD_MISSING_JA;
  return {
    availability: 'unavailable',
    availabilityLabelJa: VALUATION_GAP_INTELLIGENCE_UNAVAILABLE_JA,
    fairValueMid: null,
    analystTarget: null,
    gapPct: null,
    gapClassification: 'Unavailable',
    valuationGapScore: 0,
    displayJa: {
      fairValue: missing,
      analystTarget: missing,
      gapPct: missing,
      gapClassification: VALUATION_GAP_CLASSIFICATION_JA.Unavailable,
      valuationGapScore: '0',
    },
    evaluationJa: VALUATION_GAP_INTELLIGENCE_UNAVAILABLE_JA,
    hasExtractableData: false,
    fetchedAt: null,
  };
}

export function buildValuationGapIntelligenceAnalysis(input: {
  fairValueIntelligence?: BursaFairValueIntelligenceAnalysis | null;
  analystTargetIntelligence?: BursaAnalystTargetIntelligenceAnalysis | null;
}): BursaValuationGapIntelligenceAnalysis {
  const fairValueMid = input.fairValueIntelligence?.fairValueMid ?? null;
  const analystTarget = resolveAnalystTargetPrice(input.analystTargetIntelligence);
  const gapPct = computeValuationGapPct(fairValueMid, analystTarget);
  const gapClassification = classifyValuationGap(gapPct);
  const valuationGapScore = computeValuationGapScore(gapPct, gapClassification);

  const hasExtractableData =
    fairValueMid != null &&
    fairValueMid > 0 &&
    analystTarget != null &&
    analystTarget > 0 &&
    gapPct != null;

  if (!hasExtractableData) return emptyAnalysis();

  return {
    availability: 'available',
    availabilityLabelJa: 'Valuation Gap Intelligence 取得済',
    fairValueMid,
    analystTarget,
    gapPct,
    gapClassification,
    valuationGapScore,
    displayJa: buildDisplayFields({
      fairValueMid,
      analystTarget,
      gapPct,
      gapClassification,
      valuationGapScore,
    }),
    evaluationJa: buildEvaluationJa({ gapPct, gapClassification, valuationGapScore }),
    hasExtractableData: true,
    fetchedAt: new Date().toISOString(),
  };
}

export function valuationGapIntelligenceMaterialScoreAdjustment(
  analysis: BursaValuationGapIntelligenceAnalysis,
): number {
  if (analysis.availability !== 'available') return 0;
  return Math.max(-5, Math.min(5, Math.round(analysis.valuationGapScore * 0.5)));
}

export function scoreValuationGapMaterialItem(
  analysis: BursaValuationGapIntelligenceAnalysis,
  raw: RawMaterialInput,
): BursaMaterialItem {
  const weighted = Math.round(analysis.valuationGapScore * VALUATION_GAP_MATERIAL_WEIGHT);
  const score = Math.max(-100, Math.min(100, weighted));
  const sentiment: BursaMaterialSentiment =
    score > 8 ? '好材料' : score < -8 ? '悪材料' : '中立';
  return {
    id: raw.id ?? 'phase22_1-valuation-gap',
    title: raw.title,
    source: raw.source,
    sourceLabelJa: raw.sourceLabelJa ?? 'Phase22.1 Valuation Gap Intelligence',
    score,
    sentiment,
    scoreJa: fmtScore(score),
    reasonJa: analysis.evaluationJa,
    detailJa: analysis.evaluationJa,
    publishedAt: raw.publishedAt,
    url: raw.url,
  };
}

export function valuationGapIntelligenceToMaterialInputs(
  analysis: BursaValuationGapIntelligenceAnalysis,
): RawMaterialInput[] {
  if (analysis.availability !== 'available' || !analysis.hasExtractableData) return [];
  const d = analysis.displayJa;
  return [
    {
      id: 'phase22_1-valuation-gap',
      title: `Valuation Gap ${d.gapPct} · ${d.gapClassification}`,
      source: 'bursa_announcement',
      url: null,
      publishedAt: null,
    },
  ];
}
