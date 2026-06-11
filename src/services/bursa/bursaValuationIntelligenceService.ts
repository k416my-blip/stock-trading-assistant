/**
 * Phase20 — Valuation Intelligence
 */
import type { BursaEarningsCallAnalysis } from '../../types/bursaEarningsCall';
import type {
  BursaValuationIntelligenceAnalysis,
  ValuationMetricKey,
  ValuationRating,
} from '../../types/bursaValuationIntelligence';
import {
  VALUATION_FIELD_MISSING_JA,
  VALUATION_INTELLIGENCE_UNAVAILABLE_JA,
  VALUATION_METRIC_KEYS,
} from '../../types/bursaValuationIntelligence';
import {
  BASE_VALUATION_MAX_ADJ,
  fairValueJudgmentJa,
  ratingFromValuationScore,
  resolveValuationSector,
  SECTOR_VALUATION_BENCHMARKS,
  VALUATION_SCORE_MAX,
  VALUATION_SCORE_MIN,
} from '../../constants/bursaValuationIntelligence';
import {
  buildFinancialReportValuationPartial,
  countAcquiredValuationFields,
  fetchYahooValuationPartial,
  mergeValuationPartials,
  type ValuationNumericMetrics,
} from './bursaValuationIntelligenceProviders';
import type { RawMaterialInput } from './bursaMaterialSentiment';
import type { BursaMaterialItem, BursaMaterialSentiment } from '../../types/bursaDisclosure';

/** Phase20.1 — valuationRating から直接決定（キーワード分類不使用） */
export type ValuationRatingSentiment = 'Bullish' | 'Bearish' | 'Neutral';

const VALUATION_MATERIAL_SOURCE_WEIGHT = 1.5;

export function valuationRatingToSentiment(rating: ValuationRating): ValuationRatingSentiment {
  switch (rating) {
    case 'Strong Undervalued':
    case 'Undervalued':
      return 'Bullish';
    case 'Strong Overvalued':
    case 'Overvalued':
      return 'Bearish';
    case 'Fair Value':
      return 'Neutral';
  }
}

function valuationRatingToMaterialSentiment(rating: ValuationRating): BursaMaterialSentiment {
  const sentiment = valuationRatingToSentiment(rating);
  if (sentiment === 'Bullish') return '好材料';
  if (sentiment === 'Bearish') return '悪材料';
  return '中立';
}

function valuationRatingStrength(rating: ValuationRating): number {
  switch (rating) {
    case 'Strong Undervalued':
    case 'Strong Overvalued':
      return 1.4;
    case 'Undervalued':
    case 'Overvalued':
      return 1.0;
    case 'Fair Value':
      return 0.4;
  }
}

function valuationMaterialBaseScore(sentiment: BursaMaterialSentiment): number {
  if (sentiment === '好材料') return 12;
  if (sentiment === '悪材料') return -12;
  return 0;
}

export function scoreValuationMaterialItem(
  analysis: BursaValuationIntelligenceAnalysis,
  input: RawMaterialInput,
): BursaMaterialItem {
  const rating = analysis.valuationRating;
  const sentiment = valuationRatingToMaterialSentiment(rating);
  const ratingSentiment = valuationRatingToSentiment(rating);
  const strength = valuationRatingStrength(rating);
  const score =
    sentiment === '中立'
      ? 0
      : Math.round(
          valuationMaterialBaseScore(sentiment) * VALUATION_MATERIAL_SOURCE_WEIGHT * strength,
        );

  const reasonJa =
    sentiment === '中立'
      ? 'Phase20 Valuation — 中立（Fair Value）'
      : `Phase20 Valuation — ${sentiment}（${rating} → ${ratingSentiment}）`;

  return {
    id: `${input.source}-${input.idSuffix ?? input.title.slice(0, 24)}`,
    source: input.source,
    sourceLabelJa: input.sourceLabelJa,
    sentiment,
    title: input.title,
    score,
    reasonJa,
    publishedAt: input.publishedAt,
    url: input.url,
  };
}

function clampScore(n: number): number {
  return Math.max(VALUATION_SCORE_MIN, Math.min(VALUATION_SCORE_MAX, Math.round(n)));
}

function fmtPct(n: number | null | undefined, digits = 1): string {
  const v = n ?? null;
  if (v == null || !Number.isFinite(v)) return VALUATION_FIELD_MISSING_JA;
  return `${v.toFixed(digits)}%`;
}

function fmtNum(n: number | null | undefined, digits = 2): string {
  const v = n ?? null;
  if (v == null || !Number.isFinite(v)) return VALUATION_FIELD_MISSING_JA;
  return v.toFixed(digits);
}

function fmtRatio(n: number | null | undefined, digits = 2): string {
  const v = n ?? null;
  if (v == null || !Number.isFinite(v)) return VALUATION_FIELD_MISSING_JA;
  return `${v.toFixed(digits)}x`;
}

function fmtShareBuyback(v: boolean | null): string {
  if (v == null) return VALUATION_FIELD_MISSING_JA;
  return v ? 'あり' : 'なし';
}

export function computeValuationScore(
  metrics: ValuationNumericMetrics,
  sector: string | null | undefined,
): number {
  const bench = SECTOR_VALUATION_BENCHMARKS[resolveValuationSector(sector)];
  let score = 0;

  const roe = metrics.roe;
  if (roe != null) {
    if (roe > 20) score += 5;
    else if (roe > 15) score += 3;
    else if (roe < bench.roe * 0.6) score -= 2;
  }

  const roa = metrics.roa;
  if (roa != null) {
    if (roa > 2) score += 2;
    else if (roa < 0.5) score -= 2;
  }

  const per = metrics.pe;
  if (per != null && per > 0) {
    if (per < bench.pe * 0.85) score += 3;
    else if (per > bench.pe * 1.15) score -= 3;
  }

  const pb = metrics.pb;
  if (pb != null && pb > 0) {
    if (pb < 1) score += 4;
    else if (pb > bench.pb * 1.4) score -= 3;
  }

  const peg = metrics.peg;
  if (peg != null && peg > 0) {
    if (peg < 1) score += 3;
    else if (peg > 2) score -= 3;
  }

  const evEbitda = metrics.evEbitda;
  if (evEbitda != null && evEbitda > 0) {
    if (evEbitda < 10) score += 2;
    else if (evEbitda > 18) score -= 2;
  }

  const debtEquity = metrics.debtEquity;
  if (debtEquity != null) {
    if (debtEquity > bench.debtEquityMax * 2) score -= 4;
    else if (debtEquity > bench.debtEquityMax * 1.5) score -= 2;
    else if (debtEquity <= bench.debtEquityMax * 0.8) score += 1;
  }

  const rev = metrics.revenueGrowth;
  const eps = metrics.epsGrowth ?? metrics.netProfitGrowth;
  if (rev != null && eps != null) {
    if (rev > 0 && eps > 0) score += 3;
    else if (rev < 0 && eps < 0) score -= 3;
  } else if (rev != null) {
    if (rev > 5) score += 1;
    else if (rev < -5) score -= 2;
  }

  const fcfGrowth = metrics.fcfGrowth;
  if (fcfGrowth != null) {
    if (fcfGrowth > 0) score += 1;
    else if (fcfGrowth < -10) score -= 2;
  }

  const currentRatio = metrics.currentRatio;
  if (currentRatio != null) {
    if (currentRatio >= 1.5) score += 1;
    else if (currentRatio < 1) score -= 2;
  }

  const divYield = metrics.dividendYield;
  if (divYield != null && divYield > 4) score += 1;

  return clampScore(score);
}

export function valuationIntelligenceMaterialScoreAdjustment(
  analysis: BursaValuationIntelligenceAnalysis | null,
): number {
  if (!analysis || analysis.availability !== 'available' || !analysis.hasExtractableData) return 0;
  const maxAdj = Math.round(BASE_VALUATION_MAX_ADJ * (0.35 + 0.65 * analysis.fieldAcquisitionRate) * 10) / 10;
  const ratio = analysis.valuationScore / VALUATION_SCORE_MAX;
  return Math.max(-maxAdj, Math.min(maxAdj, Math.round(ratio * maxAdj * 10) / 10));
}

function buildEvaluationJa(input: {
  rating: ValuationRating;
  score: number;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  source: string;
  rate: number;
}): string {
  const parts = ['Valuation Intelligence'];
  parts.push(`${input.rating} (${input.score >= 0 ? '+' : ''}${input.score})`);
  if (input.pe != null) parts.push(`PER ${input.pe.toFixed(1)}`);
  if (input.pb != null) parts.push(`PBR ${input.pb.toFixed(2)}`);
  if (input.roe != null) parts.push(`ROE ${input.roe.toFixed(1)}%`);
  parts.push(`取得率 ${Math.round(input.rate * 100)}%`);
  parts.push(`[${input.source}]`);
  return parts.join(' · ');
}

export async function buildValuationIntelligenceAnalysis(input: {
  stockCode: string;
  sector?: string | null;
  earningsCall?: BursaEarningsCallAnalysis | null;
  fetchLiveExternal: boolean;
}): Promise<BursaValuationIntelligenceAnalysis> {
  const emptyDisplay = buildDisplayFields({}, null, 'Fair Value', 0, 'none', 0);

  if (!input.fetchLiveExternal) {
    return {
      availability: 'unavailable',
      availabilityLabelJa: VALUATION_INTELLIGENCE_UNAVAILABLE_JA,
      valuationScore: 0,
      valuationRating: 'Fair Value',
      fairValueJudgmentJa: fairValueJudgmentJa('Fair Value'),
      fieldAcquisitionRate: 0,
      acquiredFieldCount: 0,
      totalFieldCount: VALUATION_METRIC_KEYS.length,
      fieldSources: {},
      metrics: {},
      shareBuybackDetected: null,
      source: 'none',
      materialScoreAdjustment: 0,
      unavailableReason: 'fetchLiveExternal=false',
      displayJa: emptyDisplay,
      evaluationJa: VALUATION_INTELLIGENCE_UNAVAILABLE_JA,
      hasExtractableData: false,
      fetchedAt: null,
    };
  }

  const partials = [
    await fetchYahooValuationPartial(input.stockCode),
    buildFinancialReportValuationPartial(input.earningsCall?.financialReportAnalysis),
  ];

  const merged = mergeValuationPartials(partials);
  const { acquired, total, rate } = countAcquiredValuationFields(
    merged.metrics,
    merged.shareBuybackDetected,
  );

  if (acquired === 0) {
    return {
      availability: 'unavailable',
      availabilityLabelJa: VALUATION_INTELLIGENCE_UNAVAILABLE_JA,
      valuationScore: 0,
      valuationRating: 'Fair Value',
      fairValueJudgmentJa: fairValueJudgmentJa('Fair Value'),
      fieldAcquisitionRate: 0,
      acquiredFieldCount: 0,
      totalFieldCount: total,
      fieldSources: merged.fieldSources,
      metrics: merged.metrics,
      shareBuybackDetected: merged.shareBuybackDetected,
      source: merged.primarySource,
      materialScoreAdjustment: 0,
      unavailableReason: '全項目未取得',
      displayJa: emptyDisplay,
      evaluationJa: VALUATION_INTELLIGENCE_UNAVAILABLE_JA,
      hasExtractableData: false,
      fetchedAt: new Date().toISOString(),
    };
  }

  const valuationScore = computeValuationScore(merged.metrics, input.sector);
  const valuationRating = ratingFromValuationScore(valuationScore);
  const fairValueJudgmentJaText = fairValueJudgmentJa(valuationRating);

  const analysis: BursaValuationIntelligenceAnalysis = {
    availability: 'available',
    availabilityLabelJa: 'Valuation Intelligence 取得済',
    valuationScore,
    valuationRating,
    fairValueJudgmentJa: fairValueJudgmentJaText,
    fieldAcquisitionRate: rate,
    acquiredFieldCount: acquired,
    totalFieldCount: total,
    fieldSources: merged.fieldSources,
    metrics: merged.metrics,
    shareBuybackDetected: merged.shareBuybackDetected,
    source: merged.primarySource,
    materialScoreAdjustment: 0,
    unavailableReason: null,
    displayJa: buildDisplayFields(
      merged.metrics,
      merged.shareBuybackDetected,
      valuationRating,
      valuationScore,
      merged.primarySource,
      rate,
    ),
    evaluationJa: buildEvaluationJa({
      rating: valuationRating,
      score: valuationScore,
      pe: merged.metrics.pe ?? null,
      pb: merged.metrics.pb ?? null,
      roe: merged.metrics.roe ?? null,
      source: merged.primarySource,
      rate,
    }),
    hasExtractableData: true,
    fetchedAt: new Date().toISOString(),
  };

  analysis.materialScoreAdjustment = valuationIntelligenceMaterialScoreAdjustment(analysis);
  return analysis;
}

function buildDisplayFields(
  metrics: ValuationNumericMetrics,
  shareBuyback: boolean | null,
  rating: ValuationRating,
  score: number,
  source: string,
  rate: number,
): BursaValuationIntelligenceAnalysis['displayJa'] {
  return {
    valuationScore: `${score >= 0 ? '+' : ''}${score}`,
    valuationRating: rating,
    pe: fmtRatio(metrics.pe),
    pb: fmtRatio(metrics.pb),
    roe: fmtPct(metrics.roe),
    revenueGrowth: fmtPct(metrics.revenueGrowth),
    epsGrowth: fmtPct(metrics.epsGrowth ?? metrics.netProfitGrowth),
    debtEquity: fmtRatio(metrics.debtEquity),
    fairValueJudgment: fairValueJudgmentJa(rating),
    roa: fmtPct(metrics.roa),
    netMargin: fmtPct(metrics.netMargin),
    operatingMargin: fmtPct(metrics.operatingMargin),
    fcfMargin: fmtPct(metrics.fcfMargin),
    forwardPe: fmtRatio(metrics.forwardPe),
    ps: fmtRatio(metrics.ps),
    peg: fmtRatio(metrics.peg),
    evEbitda: fmtRatio(metrics.evEbitda),
    currentRatio: fmtRatio(metrics.currentRatio),
    interestCoverage: fmtRatio(metrics.interestCoverage),
    cashRatio: fmtRatio(metrics.cashRatio),
    dividendYield: fmtPct(metrics.dividendYield),
    payoutRatio: fmtPct(metrics.payoutRatio),
    shareBuyback: fmtShareBuyback(shareBuyback),
    netProfitGrowth: fmtPct(metrics.netProfitGrowth),
    fcfGrowth: fmtPct(metrics.fcfGrowth),
    fieldAcquisitionRate: `${Math.round(rate * 100)}%`,
    primarySource: source,
  };
}

export function valuationIntelligenceToMaterialInputs(
  analysis: BursaValuationIntelligenceAnalysis,
): RawMaterialInput[] {
  if (!analysis.hasExtractableData) return [];
  const d = analysis.displayJa;
  return [
    {
      source: 'bursa_announcement',
      sourceLabelJa: 'Phase20 Valuation Intelligence',
      title: `Valuation ${analysis.valuationRating} (${d.valuationScore})`,
      url: null,
      publishedAt: analysis.fetchedAt,
      idSuffix: `phase20-valuation-${analysis.valuationRating}`,
    },
  ];
}

export type { ValuationMetricKey };
