/**
 * Phase22.2 — Conviction Intelligence
 * Fair Value × Analyst Target × Valuation Gap 統合（推測禁止）
 */
import type { BursaAnalystTargetIntelligenceAnalysis } from '../../types/bursaAnalystTargetIntelligence';
import type { BursaFairValueIntelligenceAnalysis } from '../../types/bursaFairValueIntelligence';
import type { BursaValuationGapIntelligenceAnalysis } from '../../types/bursaValuationGapIntelligence';
import type {
  BursaConvictionIntelligenceAnalysis,
  ConvictionConfidence,
  ConvictionIntelligenceDisplayFields,
  ConvictionLevel,
  TrustedValuationSource,
} from '../../types/bursaConvictionIntelligence';
import {
  CONVICTION_FIELD_MISSING_JA,
  CONVICTION_INTELLIGENCE_UNAVAILABLE_JA,
} from '../../types/bursaConvictionIntelligence';
import {
  CONVICTION_LEVEL_JA,
  CONVICTION_SCORE_MAX,
  CONVICTION_SCORE_MIN,
  COVERAGE_HIGH_THRESHOLD,
  COVERAGE_LOW_THRESHOLD,
  TRUSTED_SOURCE_JA,
  convictionLevelFromScore,
} from '../../constants/bursaConvictionIntelligence';
import type { ValuationGapClassification } from '../../types/bursaValuationGapIntelligence';
import type { TargetRevisionTrend } from '../../types/bursaAnalystTargetIntelligence';
import type { FairValueConfidence } from '../../types/bursaFairValueIntelligence';
import type { BursaEarningsRevisionIntelligenceAnalysis } from '../../types/bursaEarningsRevisionIntelligence';
import {
  isDownwardRevision,
  isUpwardRevision,
} from './bursaEarningsRevisionIntelligenceService';
import type { RawMaterialInput } from './bursaMaterialSentiment';
import type { BursaMaterialItem, BursaMaterialSentiment } from '../../types/bursaDisclosure';

const CONVICTION_MATERIAL_WEIGHT = 1.3;

function clampScore(n: number): number {
  return Math.max(CONVICTION_SCORE_MIN, Math.min(CONVICTION_SCORE_MAX, Math.round(n)));
}

function fmtPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return CONVICTION_FIELD_MISSING_JA;
  return `RM ${n.toFixed(2)}`;
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return CONVICTION_FIELD_MISSING_JA;
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtScore(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function fmtBool(v: boolean): string {
  return v ? 'Yes' : 'No';
}

export function resolveDcfUsed(fv: BursaFairValueIntelligenceAnalysis | null | undefined): boolean {
  if (!fv) return false;
  return fv.modelsUsed.includes('dcf') && fv.dcf.fairPrice != null;
}

export function resolveDdmUsed(fv: BursaFairValueIntelligenceAnalysis | null | undefined): boolean {
  if (!fv) return false;
  return fv.modelsUsed.includes('ddm') && (fv.ddm?.fairPrice ?? null) != null;
}

export function resolveTrustedSource(input: {
  gapClassification: ValuationGapClassification | null;
  dcfUsed: boolean;
  ddmUsed: boolean;
  valuationConfidence: FairValueConfidence | null;
  coverageCount: number | null;
  gapPct: number | null;
}): TrustedValuationSource {
  const gap = input.gapClassification;
  if (!gap || gap === 'Unavailable') return 'Unavailable';

  const modelStrong =
    (input.dcfUsed || input.ddmUsed) &&
    (input.valuationConfidence === 'High' || input.valuationConfidence === 'Medium');
  const analystStrong = (input.coverageCount ?? 0) >= COVERAGE_LOW_THRESHOLD;

  if (gap === 'Model Premium') {
    return modelStrong || !analystStrong ? 'Fair Value' : 'Blended';
  }
  if (gap === 'Strong Analyst Premium' || gap === 'Analyst Premium') {
    return analystStrong && !modelStrong ? 'Analyst Target' : analystStrong ? 'Analyst Target' : 'Blended';
  }
  return 'Blended';
}

export function computeConvictionScore(input: {
  fairValueScore: number;
  analystScore: number;
  valuationGapScore: number;
  trustedSource: TrustedValuationSource;
  analystTrend: TargetRevisionTrend | null;
  coverageCount: number | null;
  dcfUsed: boolean;
  ddmUsed: boolean;
}): number {
  let score: number;
  const fv = input.fairValueScore;
  const at = input.analystScore;
  const gap = input.valuationGapScore;

  switch (input.trustedSource) {
    case 'Fair Value':
      score = fv * 1.35 + gap * 0.45 + at * 0.15;
      break;
    case 'Analyst Target':
      score = at * 1.35 + gap * 0.35 + fv * 0.15;
      break;
    case 'Blended':
      score = (fv + at) * 0.55 + gap * 0.25;
      break;
    default:
      score = 0;
  }

  if (input.analystTrend === 'Upgrade') score += 2;
  if (input.analystTrend === 'Downgrade') score -= 3;
  if ((input.coverageCount ?? 0) >= COVERAGE_HIGH_THRESHOLD) score += 1;
  if ((input.coverageCount ?? 0) > 0 && (input.coverageCount ?? 0) < COVERAGE_LOW_THRESHOLD) {
    score -= 1;
  }
  if (input.dcfUsed && input.ddmUsed) score += 1;
  if (!input.dcfUsed && !input.ddmUsed && input.trustedSource === 'Fair Value') score -= 2;

  return clampScore(score);
}

function downgradeConfidence(conf: ConvictionConfidence): ConvictionConfidence {
  if (conf === 'High') return 'Medium';
  if (conf === 'Medium') return 'Low';
  return 'Low';
}

function upgradeConfidence(conf: ConvictionConfidence): ConvictionConfidence {
  if (conf === 'Low') return 'Medium';
  if (conf === 'Medium') return 'High';
  return 'High';
}

export function applyEarningsRevisionConvictionAdjustment(input: {
  convictionScore: number;
  convictionConfidence: ConvictionConfidence;
  trustedSource: TrustedValuationSource;
  gapClassification: ValuationGapClassification | null;
  earningsRevision?: BursaEarningsRevisionIntelligenceAnalysis | null;
}): {
  convictionScore: number;
  convictionConfidence: ConvictionConfidence;
  trustedSource: TrustedValuationSource;
  revisionNote: string | null;
} {
  const rev = input.earningsRevision;
  if (!rev?.hasRevisionSeriesData || rev.revisionDirection == null) {
    return {
      convictionScore: input.convictionScore,
      convictionConfidence: input.convictionConfidence,
      trustedSource: input.trustedSource,
      revisionNote: null,
    };
  }

  let score = input.convictionScore;
  let confidence = input.convictionConfidence;
  let trusted = input.trustedSource;
  const gap = input.gapClassification;
  const dir = rev.revisionDirection;
  let note: string | null = null;

  const analystPremium =
    gap === 'Analyst Premium' || gap === 'Strong Analyst Premium';
  const modelPremium = gap === 'Model Premium';

  if (analystPremium && isUpwardRevision(dir)) {
    score += 3;
    confidence = upgradeConfidence(confidence);
    note = 'Analyst Premium + Earnings Revision Upward → Conviction強化';
  } else if (analystPremium && isDownwardRevision(dir)) {
    score -= 2;
    confidence = downgradeConfidence(confidence);
    if (trusted === 'Analyst Target') trusted = 'Blended';
    note = 'Analyst Premium + Earnings Revision Downward → Analyst信頼度低下';
  } else if (modelPremium && isUpwardRevision(dir)) {
    score += 2;
    note = 'Model Premium + Earnings Revision Upward → モデルと修正一致';
  } else if (modelPremium && isDownwardRevision(dir)) {
    note = 'Model Premium + Earnings Revision Downward → 保守的判断維持';
  }

  score += Math.max(-3, Math.min(3, Math.round(rev.revisionScore * 0.15)));
  score = clampScore(score);

  return {
    convictionScore: score,
    convictionConfidence: confidence,
    trustedSource: trusted,
    revisionNote: note,
  };
}

export function resolveConvictionConfidence(input: {
  hasFairValue: boolean;
  hasAnalystTarget: boolean;
  hasGap: boolean;
  gapClassification: ValuationGapClassification | null;
  gapPct: number | null;
  valuationConfidence: FairValueConfidence | null;
  coverageCount: number | null;
  dcfUsed: boolean;
  ddmUsed: boolean;
  analystTrend: TargetRevisionTrend | null;
  trustedSource: TrustedValuationSource;
}): ConvictionConfidence {
  if (input.trustedSource === 'Unavailable') return 'Low';

  let points = 0;
  if (input.hasFairValue && input.hasAnalystTarget && input.hasGap) points += 2;
  if (input.gapClassification === 'Consensus') points += 2;
  if (input.gapPct != null && Math.abs(input.gapPct) > 50) points -= 2;
  if (input.valuationConfidence === 'High') points += 2;
  else if (input.valuationConfidence === 'Medium') points += 1;
  else if (input.valuationConfidence === 'Low') points -= 1;
  if ((input.coverageCount ?? 0) >= COVERAGE_HIGH_THRESHOLD) points += 1;
  if (input.dcfUsed || input.ddmUsed) points += 1;
  if (input.analystTrend === 'Upgrade') points += 1;
  if (input.analystTrend === 'Downgrade') points -= 2;
  if (input.trustedSource === 'Blended' && input.gapClassification === 'Consensus') points += 1;

  if (points >= 5) return 'High';
  if (points >= 2) return 'Medium';
  return 'Low';
}

export function buildConvictionReasonLines(input: {
  trustedSource: TrustedValuationSource;
  gapPct: number | null;
  gapClassification: string | null;
  fairValueMid: number | null;
  analystTarget: number | null;
  valuationConfidence: string | null;
  dcfUsed: boolean;
  ddmUsed: boolean;
  coverageCount: number | null;
  analystTrend: string | null;
  convictionLevel: ConvictionLevel;
  convictionScore: number;
  revisionNote?: string | null;
}): [string, string, string] {
  const trust = TRUSTED_SOURCE_JA[input.trustedSource] ?? input.trustedSource;
  const gapPart =
    input.gapPct != null
      ? `Gap ${fmtPct(input.gapPct)}（${input.gapClassification ?? '—'}）`
      : 'Gap 未取得';
  const line1 = `信頼ソース: ${trust} — ${gapPart}`;

  const trend = input.analystTrend ?? CONVICTION_FIELD_MISSING_JA;
  const cov =
    input.coverageCount != null && input.coverageCount > 0
      ? String(input.coverageCount)
      : CONVICTION_FIELD_MISSING_JA;
  const line2 =
    `Fair Value ${fmtPrice(input.fairValueMid)}（信頼度 ${input.valuationConfidence ?? '—'}, ` +
    `DCF ${fmtBool(input.dcfUsed)}, DDM ${fmtBool(input.ddmUsed)}） · ` +
    `Analyst ${fmtPrice(input.analystTarget)}（Coverage ${cov}, Trend ${trend}）`;

  const levelJa = CONVICTION_LEVEL_JA[input.convictionLevel] ?? input.convictionLevel;
  const revisionSuffix = input.revisionNote ? ` · ${input.revisionNote}` : '';
  const line3 = `Conviction: ${levelJa} — 統合スコア ${fmtScore(input.convictionScore)}${revisionSuffix}`;

  return [line1, line2, line3];
}

function emptyAnalysis(): BursaConvictionIntelligenceAnalysis {
  const missing = CONVICTION_FIELD_MISSING_JA;
  return {
    availability: 'unavailable',
    availabilityLabelJa: CONVICTION_INTELLIGENCE_UNAVAILABLE_JA,
    fairValueMid: null,
    analystTarget: null,
    coverageCount: null,
    analystTrend: null,
    valuationConfidence: null,
    dcfUsed: false,
    ddmUsed: false,
    gapPct: null,
    gapClassification: null,
    trustedSource: 'Unavailable',
    convictionLevel: 'Hold',
    convictionConfidence: 'Low',
    convictionScore: 0,
    reasonSummaryLines: [missing, missing, missing],
    displayJa: {
      fairValue: missing,
      analystTarget: missing,
      coverageCount: missing,
      analystTrend: missing,
      valuationConfidence: missing,
      dcfUsed: 'No',
      ddmUsed: 'No',
      gapPct: missing,
      gapClassification: missing,
      trustedSource: TRUSTED_SOURCE_JA.Unavailable,
      convictionLevel: CONVICTION_LEVEL_JA.Hold,
      convictionConfidence: 'Low',
      convictionScore: '0',
      reasonLine1: missing,
      reasonLine2: missing,
      reasonLine3: missing,
    },
    evaluationJa: CONVICTION_INTELLIGENCE_UNAVAILABLE_JA,
    hasExtractableData: false,
    fetchedAt: null,
  };
}

export function buildConvictionIntelligenceAnalysis(input: {
  fairValueIntelligence?: BursaFairValueIntelligenceAnalysis | null;
  analystTargetIntelligence?: BursaAnalystTargetIntelligenceAnalysis | null;
  valuationGapIntelligence?: BursaValuationGapIntelligenceAnalysis | null;
  earningsRevisionIntelligence?: BursaEarningsRevisionIntelligenceAnalysis | null;
}): BursaConvictionIntelligenceAnalysis {
  const fv = input.fairValueIntelligence;
  const at = input.analystTargetIntelligence;
  const vg = input.valuationGapIntelligence;

  const fairValueMid = fv?.fairValueMid ?? null;
  const analystTarget = at?.targetMedian ?? at?.targetMean ?? vg?.analystTarget ?? null;
  const hasFairValue = fairValueMid != null && fairValueMid > 0;
  const hasAnalystTarget = analystTarget != null && analystTarget > 0;

  if (!hasFairValue && !hasAnalystTarget) return emptyAnalysis();

  const coverageCount = at?.coverageCount ?? null;
  const analystTrend = at?.targetRevisionTrend ?? null;
  const valuationConfidence = fv?.confidence ?? null;
  const dcfUsed = resolveDcfUsed(fv);
  const ddmUsed = resolveDdmUsed(fv);
  const gapPct = vg?.gapPct ?? null;
  const gapClassification = vg?.gapClassification ?? null;

  const trustedSource = resolveTrustedSource({
    gapClassification,
    dcfUsed,
    ddmUsed,
    valuationConfidence,
    coverageCount,
    gapPct,
  });

  const baseConvictionScore = computeConvictionScore({
    fairValueScore: fv?.fairValueScore ?? 0,
    analystScore: at?.analystScore ?? 0,
    valuationGapScore: vg?.valuationGapScore ?? 0,
    trustedSource,
    analystTrend,
    coverageCount,
    dcfUsed,
    ddmUsed,
  });

  const baseConvictionConfidence = resolveConvictionConfidence({
    hasFairValue,
    hasAnalystTarget,
    hasGap: gapPct != null,
    gapClassification,
    gapPct,
    valuationConfidence,
    coverageCount,
    dcfUsed,
    ddmUsed,
    analystTrend,
    trustedSource,
  });

  const revisionAdjusted = applyEarningsRevisionConvictionAdjustment({
    convictionScore: baseConvictionScore,
    convictionConfidence: baseConvictionConfidence,
    trustedSource,
    gapClassification,
    earningsRevision: input.earningsRevisionIntelligence,
  });

  const convictionScore = revisionAdjusted.convictionScore;
  const convictionConfidence = revisionAdjusted.convictionConfidence;
  const adjustedTrustedSource = revisionAdjusted.trustedSource;

  const gapClassJa =
    gapClassification != null
      ? (input.valuationGapIntelligence?.displayJa.gapClassification ?? gapClassification)
      : CONVICTION_FIELD_MISSING_JA;

  const convictionLevel = convictionLevelFromScore(convictionScore);

  const reasonSummaryLines = buildConvictionReasonLines({
    trustedSource: adjustedTrustedSource,
    gapPct,
    gapClassification: gapClassJa,
    fairValueMid,
    analystTarget,
    valuationConfidence,
    dcfUsed,
    ddmUsed,
    coverageCount,
    analystTrend,
    convictionLevel,
    convictionScore,
    revisionNote: revisionAdjusted.revisionNote,
  });

  const displayJa: ConvictionIntelligenceDisplayFields = {
    fairValue: fmtPrice(fairValueMid),
    analystTarget: fmtPrice(analystTarget),
    coverageCount:
      coverageCount != null && coverageCount > 0 ? String(coverageCount) : CONVICTION_FIELD_MISSING_JA,
    analystTrend: analystTrend ?? CONVICTION_FIELD_MISSING_JA,
    valuationConfidence: valuationConfidence ?? CONVICTION_FIELD_MISSING_JA,
    dcfUsed: fmtBool(dcfUsed),
    ddmUsed: fmtBool(ddmUsed),
    gapPct: fmtPct(gapPct),
    gapClassification: gapClassJa,
    trustedSource: TRUSTED_SOURCE_JA[adjustedTrustedSource] ?? adjustedTrustedSource,
    convictionLevel: CONVICTION_LEVEL_JA[convictionLevel] ?? convictionLevel,
    convictionConfidence,
    convictionScore: fmtScore(convictionScore),
    reasonLine1: reasonSummaryLines[0],
    reasonLine2: reasonSummaryLines[1],
    reasonLine3: reasonSummaryLines[2],
  };

  const evaluationJa = [
    'Conviction Intelligence',
    displayJa.convictionLevel,
    displayJa.trustedSource,
    input.earningsRevisionIntelligence?.hasRevisionSeriesData
      ? `Revision ${input.earningsRevisionIntelligence.displayJa.revisionDirection}`
      : null,
    `Confidence ${convictionConfidence}`,
    `Score ${fmtScore(convictionScore)}`,
  ]
    .filter((v): v is string => Boolean(v))
    .join(' · ');

  return {
    availability: 'available',
    availabilityLabelJa: 'Conviction Intelligence 取得済',
    fairValueMid,
    analystTarget,
    coverageCount,
    analystTrend,
    valuationConfidence,
    dcfUsed,
    ddmUsed,
    gapPct,
    gapClassification,
    trustedSource: adjustedTrustedSource,
    convictionLevel,
    convictionConfidence,
    convictionScore,
    reasonSummaryLines,
    displayJa,
    evaluationJa,
    hasExtractableData: true,
    fetchedAt: new Date().toISOString(),
  };
}

export function convictionIntelligenceMaterialScoreAdjustment(
  analysis: BursaConvictionIntelligenceAnalysis,
): number {
  if (analysis.availability !== 'available') return 0;
  return Math.max(-6, Math.min(6, Math.round(analysis.convictionScore * 0.35)));
}

export function scoreConvictionMaterialItem(
  analysis: BursaConvictionIntelligenceAnalysis,
  raw: RawMaterialInput & { id?: string },
): BursaMaterialItem {
  const weighted = Math.round(analysis.convictionScore * CONVICTION_MATERIAL_WEIGHT);
  const score = Math.max(-100, Math.min(100, weighted));
  const sentiment: BursaMaterialSentiment =
    score > 8 ? '好材料' : score < -8 ? '悪材料' : '中立';
  return {
    id: raw.id ?? 'phase22_2-conviction',
    title: raw.title,
    source: raw.source,
    sourceLabelJa: raw.sourceLabelJa ?? 'Phase22.2 Conviction Intelligence',
    score,
    sentiment,
    scoreJa: fmtScore(score),
    reasonJa: analysis.evaluationJa,
    detailJa: analysis.evaluationJa,
    publishedAt: raw.publishedAt ?? null,
    url: raw.url ?? null,
  };
}

export function convictionIntelligenceToMaterialInputs(
  analysis: BursaConvictionIntelligenceAnalysis,
): Array<RawMaterialInput & { id?: string }> {
  if (analysis.availability !== 'available' || !analysis.hasExtractableData) return [];
  const d = analysis.displayJa;
  return [
    {
      id: 'phase22_2-conviction',
      title: `Conviction ${d.convictionLevel} · ${d.trustedSource} · Confidence ${d.convictionConfidence}`,
      source: 'bursa_announcement',
      url: null,
      publishedAt: null,
      sourceLabelJa: 'Phase22.2 Conviction Intelligence',
    },
  ];
}

/** 監査用 — convictionScore 降順ランキング */
export function rankConvictionAnalyses<T extends { stockCode: string; convictionIntelligence?: BursaConvictionIntelligenceAnalysis | null }>(
  stocks: T[],
): Array<{ stockCode: string; score: number; level: ConvictionLevel; confidence: ConvictionConfidence; trusted: TrustedValuationSource }> {
  return stocks
    .map((s) => ({
      stockCode: s.stockCode,
      score: s.convictionIntelligence?.convictionScore ?? -999,
      level: s.convictionIntelligence?.convictionLevel ?? 'Hold',
      confidence: s.convictionIntelligence?.convictionConfidence ?? 'Low',
      trusted: s.convictionIntelligence?.trustedSource ?? 'Unavailable',
    }))
    .filter((r) => r.score > -999)
    .sort((a, b) => b.score - a.score);
}
