/**
 * Phase21 — Fair Value Intelligence
 */
import type { BursaDividendIntelligenceAnalysis } from '../../types/bursaDividendIntelligence';
import type {
  BursaFairValueIntelligenceAnalysis,
  DcfUnavailableReasonCode,
  DdmUnavailableReasonCode,
  FairValueConfidence,
  FairValueIntelligenceSource,
  FairValueMetricKey,
  FairValueModelKey,
  FairValueModelResult,
  FairValueRecommendation,
} from '../../types/bursaFairValueIntelligence';
import {
  FAIR_VALUE_FIELD_MISSING_JA,
  FAIR_VALUE_INTELLIGENCE_UNAVAILABLE_JA,
} from '../../types/bursaFairValueIntelligence';
import {
  BASE_FAIR_VALUE_MAX_ADJ,
  DCF_PROJECTION_YEARS,
  DCF_UNAVAILABLE_REASON_JA,
  DDM_UNAVAILABLE_REASON_JA,
  FAIR_PRICE_SANITY_MAX_RATIO,
  FAIR_PRICE_SANITY_MIN_RATIO,
  FAIR_VALUE_CONFIDENCE_JA,
  FAIR_VALUE_MODEL_LABEL_JA,
  FAIR_VALUE_SCORE_MAX,
  FAIR_VALUE_SCORE_MIN,
  MIN_DDM_SPREAD,
  recommendationFromFairValueScore,
  recommendationJa,
  resolveFairValueSector,
  SECTOR_FAIR_VALUE_PARAMS,
} from '../../constants/bursaFairValueIntelligence';
import {
  resolveValuationSector,
  SECTOR_VALUATION_BENCHMARKS,
} from '../../constants/bursaValuationIntelligence';
import type { BursaDividendBundle, BursaCompanyProfile, BursaQuarterlyBundle, BursaDisclosureBundle } from '../../types/bursaDisclosure';
import type { FinancialReportAnalysis } from '../../types/bursaFinancialReportAnalysis';
import {
  countAcquiredFairValueFields,
  fetchAllFairValuePartials,
  type FairValueRawInputs,
} from './bursaFairValueIntelligenceProviders';
import { resolveDdmGrowthRate, type ResolvedDdmGrowth } from './bursaDdmGrowthResolver';
import type { RawMaterialInput } from './bursaMaterialSentiment';
import type { BursaMaterialItem, BursaMaterialSentiment } from '../../types/bursaDisclosure';

const FAIR_VALUE_MATERIAL_SOURCE_WEIGHT = 1.5;

function clampScore(n: number): number {
  return Math.max(FAIR_VALUE_SCORE_MIN, Math.min(FAIR_VALUE_SCORE_MAX, Math.round(n)));
}

function clampGrowthPct(growthPct: number): number {
  return Math.max(-20, Math.min(15, growthPct));
}

function fmtPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return FAIR_VALUE_FIELD_MISSING_JA;
  return `RM ${n.toFixed(2)}`;
}

function fmtPct(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return FAIR_VALUE_FIELD_MISSING_JA;
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

function fmtScore(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function sourceLabel(source: FairValueIntelligenceSource): string {
  switch (source) {
    case 'yahoo_finance':
      return 'Yahoo Finance';
    case 'phase17_dividend':
      return 'Phase17 Dividend';
    case 'financial_report':
      return 'Financial Report';
    case 'bursa_disclosure':
      return 'Bursa Disclosure';
    case 'computed':
      return '算出';
    default:
      return '未取得';
  }
}

function fieldSourceLabel(source: FairValueIntelligenceSource | undefined): string {
  if (!source) return '未取得';
  return sourceLabel(source);
}

export function resolveModelsUsed(input: {
  dcf: FairValueModelResult;
  ddm: FairValueModelResult | null;
  per: FairValueModelResult;
}): FairValueModelKey[] {
  const used: FairValueModelKey[] = [];
  if (input.dcf.fairPrice != null) used.push('dcf');
  if (input.ddm?.fairPrice != null) used.push('ddm');
  if (input.per.fairPrice != null) used.push('per');
  return used;
}

export function resolvePrimaryFairValueModel(
  modelsUsed: FairValueModelKey[],
): FairValueModelKey | null {
  if (modelsUsed.includes('dcf')) return 'dcf';
  if (modelsUsed.includes('ddm')) return 'ddm';
  if (modelsUsed.includes('per')) return 'per';
  return null;
}

export function computeFairValueConfidence(input: {
  modelsUsed: FairValueModelKey[];
  fieldAcquisitionRate: number;
  fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>>;
}): FairValueConfidence {
  const { modelsUsed, fieldAcquisitionRate, fieldSources } = input;
  const hasCoreModel = modelsUsed.some((m) => m === 'dcf' || m === 'ddm');
  const fallbackCount = Object.values(fieldSources).filter(
    (s) => s === 'financial_report' || s === 'bursa_disclosure' || s === 'phase17_dividend',
  ).length;

  if (
    modelsUsed.length >= 2 &&
    hasCoreModel &&
    fieldAcquisitionRate >= 0.7 &&
    fallbackCount <= 2
  ) {
    return 'High';
  }
  if (modelsUsed.length >= 1 && fieldAcquisitionRate >= 0.45) {
    return 'Medium';
  }
  return 'Low';
}

export function classifyDcfUnavailableReason(input: {
  inputs: FairValueRawInputs;
  growthValue: number | null;
  fairPrice: number | null;
  rawFairBeforeSanity: number | null;
  discountRate: number;
  terminalGrowth: number;
}): DcfUnavailableReasonCode {
  if (input.fairPrice != null) return 'computed_ok';
  if (input.inputs.freeCashflow == null) return 'fcf_missing';
  if (input.inputs.freeCashflow <= 0) return 'fcf_non_positive';
  if (input.growthValue == null) return 'fcf_growth_missing';
  if (input.inputs.sharesOutstanding == null) return 'shares_missing';
  if (input.discountRate <= input.terminalGrowth) return 'discount_condition_failed';
  if (input.rawFairBeforeSanity != null) return 'sanity_range_rejected';
  return 'discount_condition_failed';
}

export function classifyDdmUnavailableReason(input: {
  isDividendStock: boolean;
  inputs: FairValueRawInputs;
  yieldPct: number | null;
  fairPrice: number | null;
  rawFairBeforeSanity: number | null;
  dividendGrowth: number | null;
  requiredReturn: number;
}): DdmUnavailableReasonCode | null {
  if (!input.isDividendStock) return 'not_dividend_stock';
  if (input.fairPrice != null) return 'computed_ok';

  const hasDividend =
    (input.inputs.dividendPerShare != null && input.inputs.dividendPerShare > 0) ||
    (input.yieldPct != null && input.yieldPct > 0);
  if (!hasDividend) return 'dividend_fetch_failed';
  if (input.dividendGrowth == null) return 'growth_rate_missing';

  const g = input.dividendGrowth / 100;
  if (g >= input.requiredReturn - MIN_DDM_SPREAD) return 'growth_rate_spread_insufficient';
  if (input.rawFairBeforeSanity != null) return 'sanity_range_rejected';
  return 'calculation_failed';
}

export function computeDcfFairPrice(input: {
  freeCashflow: number;
  fcfGrowthPct: number;
  sharesOutstanding: number;
  discountRate: number;
  terminalGrowth: number;
}): number | null {
  const { freeCashflow, sharesOutstanding, discountRate, terminalGrowth } = input;
  if (freeCashflow <= 0 || sharesOutstanding <= 0) return null;
  if (discountRate <= terminalGrowth) return null;

  const g = clampGrowthPct(input.fcfGrowthPct) / 100;
  const tg = Math.min(terminalGrowth, g > 0 ? g : terminalGrowth);
  let pv = 0;
  let fcfT = freeCashflow;

  for (let t = 1; t <= DCF_PROJECTION_YEARS; t += 1) {
    fcfT *= 1 + g;
    pv += fcfT / (1 + discountRate) ** t;
  }

  const terminalFcf = fcfT * (1 + tg);
  const terminalValue = terminalFcf / (discountRate - tg);
  pv += terminalValue / (1 + discountRate) ** DCF_PROJECTION_YEARS;

  const fair = pv / sharesOutstanding;
  if (!Number.isFinite(fair) || fair <= 0) return null;
  return fair;
}

function normalizeYieldPct(n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.abs(n) <= 1 ? n * 100 : n;
}

function isReasonableFairPrice(fair: number, currentPrice: number | null): boolean {
  if (currentPrice == null || currentPrice <= 0) return true;
  const ratio = fair / currentPrice;
  return ratio >= FAIR_PRICE_SANITY_MIN_RATIO && ratio <= FAIR_PRICE_SANITY_MAX_RATIO;
}

function resolveFcfGrowthPct(
  inputs: FairValueRawInputs,
  fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>>,
): {
  value: number | null;
  sourceJa: string;
} {
  if (inputs.fcfGrowth != null) {
    return {
      value: inputs.fcfGrowth,
      sourceJa: `${fieldSourceLabel(fieldSources.fcfGrowth)} FCF/利益成長`,
    };
  }
  if (inputs.earningsGrowth != null) {
    return { value: inputs.earningsGrowth, sourceJa: 'Yahoo earningsGrowth' };
  }
  return { value: null, sourceJa: '未取得' };
}

export function computeDdmFairPrice(input: {
  currentPrice: number;
  dividendPerShare: number | null;
  dividendYieldPct: number | null;
  dividendGrowthPct: number;
  requiredReturn: number;
  minSpread?: number;
}): number | null {
  const spreadMin = input.minSpread ?? MIN_DDM_SPREAD;
  const g = input.dividendGrowthPct / 100;
  if (g >= input.requiredReturn - spreadMin) return null;

  let d0: number | null = null;
  if (input.dividendPerShare != null && input.dividendPerShare > 0) {
    d0 = input.dividendPerShare;
  } else if (input.dividendYieldPct != null && input.dividendYieldPct > 0) {
    const y = normalizeYieldPct(input.dividendYieldPct);
    if (y != null) d0 = input.currentPrice * (y / 100);
  }
  if (d0 == null || d0 <= 0) return null;

  const d1 = d0 * (1 + g);
  const fair = d1 / (input.requiredReturn - g);
  if (!Number.isFinite(fair) || fair <= 0) return null;
  if (!isReasonableFairPrice(fair, input.currentPrice)) return null;
  return fair;
}

export function computeFairValueRange(prices: number[]): {
  low: number | null;
  mid: number | null;
  high: number | null;
} {
  const valid = prices.filter((p) => p != null && Number.isFinite(p) && p > 0);
  if (valid.length === 0) return { low: null, mid: null, high: null };
  const low = Math.min(...valid);
  const high = Math.max(...valid);
  const mid = valid.reduce((a, b) => a + b, 0) / valid.length;
  return { low, mid, high };
}

export function computeFairValueDerivedMetrics(input: {
  currentPrice: number | null;
  fairValueMid: number | null;
  fairValueLow: number | null;
}): {
  upsidePct: number | null;
  downsidePct: number | null;
  marginOfSafetyPct: number | null;
} {
  const { currentPrice, fairValueMid, fairValueLow } = input;
  if (currentPrice == null || currentPrice <= 0) {
    return { upsidePct: null, downsidePct: null, marginOfSafetyPct: null };
  }
  const upsidePct =
    fairValueMid != null ? ((fairValueMid - currentPrice) / currentPrice) * 100 : null;
  const downsidePct =
    fairValueLow != null ? ((currentPrice - fairValueLow) / currentPrice) * 100 : null;
  const marginOfSafetyPct =
    fairValueMid != null && fairValueMid > 0
      ? ((fairValueMid - currentPrice) / fairValueMid) * 100
      : null;
  return { upsidePct, downsidePct, marginOfSafetyPct };
}

export function computeFairValueScore(input: {
  upsidePct: number | null;
  marginOfSafetyPct: number | null;
  downsidePct: number | null;
}): number {
  let score = 0;
  const upside = input.upsidePct;
  const mos = input.marginOfSafetyPct;
  const downside = input.downsidePct;

  if (upside != null) {
    if (upside >= 30) score += 8;
    else if (upside >= 15) score += 5;
    else if (upside >= 5) score += 2;
    else if (upside <= -30) score -= 8;
    else if (upside <= -15) score -= 5;
    else if (upside <= -5) score -= 2;
  }

  if (mos != null) {
    if (mos >= 25) score += 4;
    else if (mos >= 10) score += 2;
    else if (mos <= -25) score -= 4;
    else if (mos <= -10) score -= 2;
  }

  if (downside != null && downside >= 25) score -= 3;

  return clampScore(score);
}

export function fairValueRecommendationToMaterialSentiment(
  rec: FairValueRecommendation,
): BursaMaterialSentiment {
  if (rec === 'Strong Buy' || rec === 'Buy') return '好材料';
  if (rec === 'Reduce' || rec === 'Avoid') return '悪材料';
  return '中立';
}

function recommendationStrength(rec: FairValueRecommendation): number {
  if (rec === 'Strong Buy' || rec === 'Avoid') return 1.4;
  if (rec === 'Buy' || rec === 'Reduce') return 1.0;
  return 0.4;
}

function materialBaseScore(sentiment: BursaMaterialSentiment): number {
  if (sentiment === '好材料') return 12;
  if (sentiment === '悪材料') return -12;
  return 0;
}

export function scoreFairValueMaterialItem(
  analysis: BursaFairValueIntelligenceAnalysis,
  input: RawMaterialInput,
): BursaMaterialItem {
  const rec = analysis.recommendation;
  const sentiment = fairValueRecommendationToMaterialSentiment(rec);
  const strength = recommendationStrength(rec);
  const score =
    sentiment === '中立'
      ? 0
      : Math.round(materialBaseScore(sentiment) * FAIR_VALUE_MATERIAL_SOURCE_WEIGHT * strength);

  const reasonJa =
    sentiment === '中立'
      ? 'Phase21 Fair Value — 中立（Hold）'
      : `Phase21 Fair Value — ${sentiment}（${rec}）`;

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

export function fairValueIntelligenceMaterialScoreAdjustment(
  analysis: BursaFairValueIntelligenceAnalysis | null,
): number {
  if (!analysis || analysis.availability !== 'available' || !analysis.hasExtractableData) return 0;
  const maxAdj =
    Math.round(BASE_FAIR_VALUE_MAX_ADJ * (0.35 + 0.65 * analysis.fieldAcquisitionRate) * 10) / 10;
  const ratio = analysis.fairValueScore / FAIR_VALUE_SCORE_MAX;
  return Math.max(-maxAdj, Math.min(maxAdj, Math.round(ratio * maxAdj * 10) / 10));
}

function buildDcfResult(
  inputs: FairValueRawInputs,
  sector: string | null | undefined,
  fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>>,
): FairValueModelResult {
  const params = SECTOR_FAIR_VALUE_PARAMS[resolveFairValueSector(sector)];
  const growth = resolveFcfGrowthPct(inputs, fieldSources);
  const fcfLabel = inputs.freeCashflowIsOperatingProxy ? '営業CF(代理)' : 'FCF';
  const fcfSource = fieldSourceLabel(fieldSources.freeCashflow);

  let rawFair: number | null = null;
  if (
    inputs.freeCashflow != null &&
    inputs.sharesOutstanding != null &&
    growth.value != null &&
    inputs.freeCashflow > 0
  ) {
    rawFair = computeDcfFairPrice({
      freeCashflow: inputs.freeCashflow,
      fcfGrowthPct: growth.value,
      sharesOutstanding: inputs.sharesOutstanding,
      discountRate: params.discountRate,
      terminalGrowth: params.terminalGrowth,
    });
  }

  let fair = rawFair;
  if (fair != null && !isReasonableFairPrice(fair, inputs.currentPrice)) {
    fair = null;
  }

  const reasonCode = classifyDcfUnavailableReason({
    inputs,
    growthValue: growth.value,
    fairPrice: fair,
    rawFairBeforeSanity: rawFair,
    discountRate: params.discountRate,
    terminalGrowth: params.terminalGrowth,
  });

  return {
    model: 'dcf',
    fairPrice: fair,
    source: fair != null ? 'computed' : 'none',
    inputsUsedJa:
      fair != null
        ? [
            `${fcfLabel} ${inputs.freeCashflow!.toLocaleString('en-MY')} [${fcfSource}]`,
            `FCF成長 ${growth.value!.toFixed(1)}% [${growth.sourceJa}]`,
            `株式数 ${inputs.sharesOutstanding!.toLocaleString('en-MY')} [${fieldSourceLabel(fieldSources.sharesOutstanding)}]`,
            `割引率 ${(params.discountRate * 100).toFixed(1)}% [セクター定数]`,
            `永久成長 ${(params.terminalGrowth * 100).toFixed(1)}% [セクター定数]`,
          ]
        : [],
    unavailableReasonJa: DCF_UNAVAILABLE_REASON_JA[reasonCode],
    unavailableReasonCode: reasonCode,
    dataSourceJa: fcfSource,
  };
}

function computeDdmFairPriceRaw(input: {
  currentPrice: number;
  dividendPerShare: number | null;
  dividendYieldPct: number | null;
  dividendGrowthPct: number;
  requiredReturn: number;
  minSpread?: number;
}): number | null {
  const spreadMin = input.minSpread ?? MIN_DDM_SPREAD;
  const g = input.dividendGrowthPct / 100;
  if (g >= input.requiredReturn - spreadMin) return null;

  let d0: number | null = null;
  if (input.dividendPerShare != null && input.dividendPerShare > 0) {
    d0 = input.dividendPerShare;
  } else if (input.dividendYieldPct != null && input.dividendYieldPct > 0) {
    const y = normalizeYieldPct(input.dividendYieldPct);
    if (y != null) d0 = input.currentPrice * (y / 100);
  }
  if (d0 == null || d0 <= 0) return null;

  const d1 = d0 * (1 + g);
  const fair = d1 / (input.requiredReturn - g);
  if (!Number.isFinite(fair) || fair <= 0) return null;
  return fair;
}

function buildDdmResult(
  inputs: FairValueRawInputs,
  sector: string | null | undefined,
  fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>>,
  ddmGrowthMeta?: ResolvedDdmGrowth | null,
): FairValueModelResult | null {
  const yieldPct = normalizeYieldPct(inputs.dividendYield);
  const isDividendStock =
    (inputs.dividendPerShare != null && inputs.dividendPerShare > 0) ||
    (yieldPct != null && yieldPct > 0);

  const params = SECTOR_FAIR_VALUE_PARAMS[resolveFairValueSector(sector)];
  const reasonCode = classifyDdmUnavailableReason({
    isDividendStock,
    inputs,
    yieldPct,
    fairPrice: null,
    rawFairBeforeSanity: null,
    dividendGrowth: inputs.dividendGrowth,
    requiredReturn: params.ddmRequiredReturn,
  });

  if (!isDividendStock) return null;

  let rawFair: number | null = null;
  if (inputs.currentPrice != null && inputs.dividendGrowth != null) {
    rawFair = computeDdmFairPriceRaw({
      currentPrice: inputs.currentPrice,
      dividendPerShare: inputs.dividendPerShare,
      dividendYieldPct: yieldPct,
      dividendGrowthPct: inputs.dividendGrowth,
      requiredReturn: params.ddmRequiredReturn,
    });
  }

  let fair = rawFair;
  if (fair != null && !isReasonableFairPrice(fair, inputs.currentPrice)) {
    fair = null;
  }

  const finalReasonCode = classifyDdmUnavailableReason({
    isDividendStock,
    inputs,
    yieldPct,
    fairPrice: fair,
    rawFairBeforeSanity: rawFair,
    dividendGrowth: inputs.dividendGrowth,
    requiredReturn: params.ddmRequiredReturn,
  })!;

  const d0Source =
    inputs.dividendPerShare != null && inputs.dividendPerShare > 0
      ? `配当 ${inputs.dividendPerShare.toFixed(2)} [${fieldSourceLabel(fieldSources.dividendYield)}]`
      : `利回り ${yieldPct?.toFixed(2)}% [${fieldSourceLabel(fieldSources.dividendYield)}]`;

  const growthLabel = ddmGrowthMeta?.sourceJa ?? fieldSourceLabel(fieldSources.dividendGrowth);
  const clipNote =
    ddmGrowthMeta?.clipApplied && ddmGrowthMeta.clipReasonJa
      ? `（${ddmGrowthMeta.clipReasonJa}）`
      : '';
  const rawNote =
    ddmGrowthMeta?.rawPct != null &&
    ddmGrowthMeta.clippedPct != null &&
    Math.abs(ddmGrowthMeta.rawPct - ddmGrowthMeta.clippedPct) > 0.05
      ? ` raw=${ddmGrowthMeta.rawPct.toFixed(1)}%`
      : '';

  return {
    model: 'ddm',
    fairPrice: fair,
    source: fair != null ? 'computed' : 'none',
    inputsUsedJa:
      fair != null && inputs.currentPrice != null && inputs.dividendGrowth != null
        ? [
            `株価 RM ${inputs.currentPrice.toFixed(2)} [${fieldSourceLabel(fieldSources.currentPrice)}]`,
            d0Source,
            `配当成長 g=${inputs.dividendGrowth.toFixed(1)}% [${growthLabel}]${rawNote}${clipNote}`,
            `要求収益率 ${(params.ddmRequiredReturn * 100).toFixed(1)}% [セクター定数]`,
          ]
        : [],
    unavailableReasonJa: DDM_UNAVAILABLE_REASON_JA[finalReasonCode],
    unavailableReasonCode: finalReasonCode,
    dataSourceJa: fieldSourceLabel(fieldSources.dividendGrowth),
  };
}

function buildPerResult(
  inputs: FairValueRawInputs,
  sector: string | null | undefined,
  fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>>,
): FairValueModelResult {
  const bench = SECTOR_VALUATION_BENCHMARKS[resolveValuationSector(sector)];
  const epsSource = fieldSourceLabel(fieldSources.trailingEps);
  if (inputs.trailingEps == null || inputs.trailingEps <= 0) {
    return {
      model: 'per',
      fairPrice: null,
      source: 'none',
      inputsUsedJa: [],
      unavailableReasonJa: 'EPS未取得（Yahoo/Bursaいずれも未取得）',
      dataSourceJa: epsSource,
    };
  }
  const fair = inputs.trailingEps * bench.pe;
  const accepted =
    Number.isFinite(fair) && fair > 0 && isReasonableFairPrice(fair, inputs.currentPrice)
      ? fair
      : null;
  return {
    model: 'per',
    fairPrice: accepted,
    source: accepted != null ? 'computed' : 'none',
    inputsUsedJa: [
      `EPS ${inputs.trailingEps.toFixed(2)} [${epsSource}]`,
      `セクター適正PER ${bench.pe.toFixed(1)} [Phase20定数]`,
    ],
    unavailableReasonJa: accepted == null ? '算出不可またはレンジ外' : null,
    dataSourceJa: epsSource,
  };
}

function buildEvaluationJa(input: {
  rec: FairValueRecommendation;
  score: number;
  upside: number | null;
  mos: number | null;
  source: string;
  rate: number;
}): string {
  const parts = ['Fair Value Intelligence'];
  parts.push(`${input.rec} (${fmtScore(input.score)})`);
  if (input.upside != null) parts.push(`Upside ${fmtPct(input.upside)}`);
  if (input.mos != null) parts.push(`MoS ${fmtPct(input.mos)}`);
  parts.push(`取得率 ${Math.round(input.rate * 100)}%`);
  parts.push(`[${input.source}]`);
  return parts.join(' · ');
}

function buildDisplayFields(input: {
  currentPrice: number | null;
  priceSource: FairValueIntelligenceSource;
  range: { low: number | null; mid: number | null; high: number | null };
  metrics: ReturnType<typeof computeFairValueDerivedMetrics>;
  dcf: FairValueModelResult;
  ddm: FairValueModelResult | null;
  per: FairValueModelResult;
  score: number;
  rec: FairValueRecommendation;
  primarySource: FairValueIntelligenceSource;
  rate: number;
  modelsUsed: FairValueModelKey[];
  primaryModel: FairValueModelKey | null;
  confidence: FairValueConfidence;
  dcfReasonCode: DcfUnavailableReasonCode;
  ddmReasonCode: DdmUnavailableReasonCode | null;
}): BursaFairValueIntelligenceAnalysis['displayJa'] {
  const modelsLabel =
    input.modelsUsed.length > 0
      ? input.modelsUsed.map((m) => FAIR_VALUE_MODEL_LABEL_JA[m]).join(' + ')
      : FAIR_VALUE_FIELD_MISSING_JA;

  return {
    currentPrice: fmtPrice(input.currentPrice),
    fairValueMid: fmtPrice(input.range.mid),
    fairValueLow: fmtPrice(input.range.low),
    fairValueHigh: fmtPrice(input.range.high),
    upsidePct: fmtPct(input.metrics.upsidePct),
    downsidePct: fmtPct(input.metrics.downsidePct),
    marginOfSafetyPct: fmtPct(input.metrics.marginOfSafetyPct),
    dcfFairPrice: fmtPrice(input.dcf.fairPrice),
    ddmFairPrice: input.ddm ? fmtPrice(input.ddm.fairPrice) : '非配当銘柄',
    perFairPrice: fmtPrice(input.per.fairPrice),
    fairValueScore: fmtScore(input.score),
    recommendation: input.rec,
    dcfSource: sourceLabel(input.dcf.source),
    ddmSource: input.ddm ? sourceLabel(input.ddm.source) : 'N/A',
    perSource: sourceLabel(input.per.source),
    priceSource: sourceLabel(input.priceSource),
    fieldAcquisitionRate: `${Math.round(input.rate * 100)}%`,
    primarySource: sourceLabel(input.primarySource),
    dcfUnavailableReason: DCF_UNAVAILABLE_REASON_JA[input.dcfReasonCode],
    ddmUnavailableReason: input.ddmReasonCode
      ? DDM_UNAVAILABLE_REASON_JA[input.ddmReasonCode]
      : DDM_UNAVAILABLE_REASON_JA.not_dividend_stock,
    modelsUsed: modelsLabel,
    primaryModel: input.primaryModel
      ? FAIR_VALUE_MODEL_LABEL_JA[input.primaryModel]
      : FAIR_VALUE_FIELD_MISSING_JA,
    confidence: FAIR_VALUE_CONFIDENCE_JA[input.confidence],
  };
}

function emptyFairValueAnalysisFields(): Pick<
  BursaFairValueIntelligenceAnalysis,
  | 'modelsUsed'
  | 'primaryFairValueModel'
  | 'confidence'
  | 'dcfUnavailableReasonCode'
  | 'ddmUnavailableReasonCode'
> {
  return {
    modelsUsed: [],
    primaryFairValueModel: null,
    confidence: 'Low',
    dcfUnavailableReasonCode: 'fcf_missing',
    ddmUnavailableReasonCode: null,
  };
}

export async function buildFairValueIntelligenceAnalysis(input: {
  stockCode: string;
  sector?: string | null;
  dividendIntelligence?: BursaDividendIntelligenceAnalysis | null;
  financialReportAnalysis?: FinancialReportAnalysis | null;
  bursaBundle?: BursaDisclosureBundle | null;
  bursaProfile?: BursaCompanyProfile | null;
  bursaQuarterly?: BursaQuarterlyBundle | null;
  bursaDividend?: BursaDividendBundle | null;
  fetchLiveExternal: boolean;
}): Promise<BursaFairValueIntelligenceAnalysis> {
  const emptyExtra = emptyFairValueAnalysisFields();
  const emptyDisplay = buildDisplayFields({
    currentPrice: null,
    priceSource: 'none',
    range: { low: null, mid: null, high: null },
    metrics: { upsidePct: null, downsidePct: null, marginOfSafetyPct: null },
    dcf: {
      model: 'dcf',
      fairPrice: null,
      source: 'none',
      inputsUsedJa: [],
      unavailableReasonJa: null,
    },
    ddm: null,
    per: {
      model: 'per',
      fairPrice: null,
      source: 'none',
      inputsUsedJa: [],
      unavailableReasonJa: null,
    },
    score: 0,
    rec: 'Hold',
    primarySource: 'none',
    rate: 0,
    modelsUsed: [],
    primaryModel: null,
    confidence: 'Low',
    dcfReasonCode: 'fcf_missing',
    ddmReasonCode: null,
  });

  if (!input.fetchLiveExternal) {
    return {
      availability: 'unavailable',
      availabilityLabelJa: FAIR_VALUE_INTELLIGENCE_UNAVAILABLE_JA,
      currentPrice: null,
      currentPriceSource: 'none',
      fairValueMid: null,
      fairValueLow: null,
      fairValueHigh: null,
      upsidePct: null,
      downsidePct: null,
      marginOfSafetyPct: null,
      dcf: {
        model: 'dcf',
        fairPrice: null,
        source: 'none',
        inputsUsedJa: [],
        unavailableReasonJa: null,
      },
      ddm: null,
      per: {
        model: 'per',
        fairPrice: null,
        source: 'none',
        inputsUsedJa: [],
        unavailableReasonJa: null,
      },
      fairValueScore: 0,
      recommendation: 'Hold',
      ...emptyExtra,
      fieldAcquisitionRate: 0,
      acquiredFieldCount: 0,
      totalFieldCount: 6,
      fieldSources: {},
      source: 'none',
      materialScoreAdjustment: 0,
      unavailableReason: 'fetchLiveExternal=false',
      displayJa: emptyDisplay,
      evaluationJa: FAIR_VALUE_INTELLIGENCE_UNAVAILABLE_JA,
      hasExtractableData: false,
      fetchedAt: null,
    };
  }

  const { merged } = await fetchAllFairValuePartials({
    stockCode: input.stockCode,
    dividendIntelligence: input.dividendIntelligence,
    financialReportAnalysis: input.financialReportAnalysis,
    bursaProfile: input.bursaProfile,
    bursaQuarterly: input.bursaQuarterly,
    bursaDividend: input.bursaDividend,
  });
  const { inputs: rawInputs, fieldSources, primarySource } = merged;
  const ddmGrowthResolved = resolveDdmGrowthRate({
    bundle: input.bursaBundle ?? null,
    financialReport: input.financialReportAnalysis ?? null,
    dividendIntelligence: input.dividendIntelligence ?? null,
    sector: input.sector,
  });
  const inputs: FairValueRawInputs = {
    ...rawInputs,
    dividendYield: normalizeYieldPct(rawInputs.dividendYield),
    dividendGrowth: ddmGrowthResolved.adoptedPct,
  };
  if (ddmGrowthResolved.adoptedPct != null) {
    fieldSources.dividendGrowth = ddmGrowthResolved.source;
  }

  const dcf = buildDcfResult(inputs, input.sector, fieldSources);
  const ddm = buildDdmResult(inputs, input.sector, fieldSources, ddmGrowthResolved);
  const per = buildPerResult(inputs, input.sector, fieldSources);
  const yieldPct = normalizeYieldPct(inputs.dividendYield);
  const isDividendStock =
    (inputs.dividendPerShare != null && inputs.dividendPerShare > 0) ||
    (yieldPct != null && yieldPct > 0);

  if (dcf.fairPrice != null) fieldSources.dcfFairPrice = 'computed';
  if (ddm?.fairPrice != null) fieldSources.ddmFairPrice = 'computed';
  if (per.fairPrice != null) fieldSources.perFairPrice = 'computed';

  const { acquired, total, rate } = countAcquiredFairValueFields({
    inputs,
    dcfFairPrice: dcf.fairPrice,
    ddmFairPrice: ddm?.fairPrice ?? null,
    perFairPrice: per.fairPrice,
    isDividendStock,
  });

  const modelPrices = [dcf.fairPrice, ddm?.fairPrice ?? null, per.fairPrice].filter(
    (p): p is number => p != null,
  );
  const range = computeFairValueRange(modelPrices);
  const metrics = computeFairValueDerivedMetrics({
    currentPrice: inputs.currentPrice,
    fairValueMid: range.mid,
    fairValueLow: range.low,
  });
  const fairValueScore = computeFairValueScore({
    upsidePct: metrics.upsidePct,
    marginOfSafetyPct: metrics.marginOfSafetyPct,
    downsidePct: metrics.downsidePct,
  });
  const recommendation = recommendationFromFairValueScore(fairValueScore);
  const modelsUsed = resolveModelsUsed({ dcf, ddm, per });
  const primaryFairValueModel = resolvePrimaryFairValueModel(modelsUsed);
  const confidence = computeFairValueConfidence({ modelsUsed, fieldAcquisitionRate: rate, fieldSources });
  const dcfUnavailableReasonCode =
    (dcf.unavailableReasonCode as DcfUnavailableReasonCode | undefined) ?? 'fcf_missing';
  const ddmUnavailableReasonCode =
    (ddm?.unavailableReasonCode as DdmUnavailableReasonCode | undefined) ??
    (isDividendStock ? 'dividend_fetch_failed' : 'not_dividend_stock');

  const displayInput = {
    currentPrice: inputs.currentPrice,
    priceSource: fieldSources.currentPrice ?? primarySource,
    range,
    metrics,
    dcf,
    ddm,
    per,
    primarySource,
    rate,
    modelsUsed,
    primaryModel: primaryFairValueModel,
    confidence,
    dcfReasonCode: dcfUnavailableReasonCode,
    ddmReasonCode: ddmUnavailableReasonCode,
  };

  if (acquired < 3 || range.mid == null) {
    return {
      availability: 'unavailable',
      availabilityLabelJa: FAIR_VALUE_INTELLIGENCE_UNAVAILABLE_JA,
      currentPrice: inputs.currentPrice,
      currentPriceSource: fieldSources.currentPrice ?? 'none',
      fairValueMid: null,
      fairValueLow: null,
      fairValueHigh: null,
      upsidePct: null,
      downsidePct: null,
      marginOfSafetyPct: null,
      dcf,
      ddm,
      per,
      fairValueScore: 0,
      recommendation: 'Hold',
      modelsUsed,
      primaryFairValueModel,
      confidence,
      dcfUnavailableReasonCode,
      ddmUnavailableReasonCode,
      fieldAcquisitionRate: rate,
      acquiredFieldCount: acquired,
      totalFieldCount: total,
      fieldSources,
      source: primarySource,
      materialScoreAdjustment: 0,
      unavailableReason: 'モデル算出不可（入力不足）',
      displayJa: buildDisplayFields({ ...displayInput, score: 0, rec: 'Hold' }),
      evaluationJa: FAIR_VALUE_INTELLIGENCE_UNAVAILABLE_JA,
      hasExtractableData: false,
      fetchedAt: new Date().toISOString(),
    };
  }

  const analysis: BursaFairValueIntelligenceAnalysis = {
    availability: 'available',
    availabilityLabelJa: 'Fair Value Intelligence 取得済',
    currentPrice: inputs.currentPrice,
    currentPriceSource: fieldSources.currentPrice ?? primarySource,
    fairValueMid: range.mid,
    fairValueLow: range.low,
    fairValueHigh: range.high,
    upsidePct: metrics.upsidePct,
    downsidePct: metrics.downsidePct,
    marginOfSafetyPct: metrics.marginOfSafetyPct,
    dcf,
    ddm,
    per,
    fairValueScore,
    recommendation,
    modelsUsed,
    primaryFairValueModel,
    confidence,
    dcfUnavailableReasonCode,
    ddmUnavailableReasonCode,
    fieldAcquisitionRate: rate,
    acquiredFieldCount: acquired,
    totalFieldCount: total,
    fieldSources,
    source: primarySource,
    materialScoreAdjustment: 0,
    unavailableReason: null,
    displayJa: buildDisplayFields({
      ...displayInput,
      score: fairValueScore,
      rec: recommendation,
    }),
    evaluationJa: buildEvaluationJa({
      rec: recommendation,
      score: fairValueScore,
      upside: metrics.upsidePct,
      mos: metrics.marginOfSafetyPct,
      source: sourceLabel(primarySource),
      rate,
    }),
    hasExtractableData: true,
    fetchedAt: new Date().toISOString(),
  };

  analysis.materialScoreAdjustment = fairValueIntelligenceMaterialScoreAdjustment(analysis);
  return analysis;
}

/** Phase21.8 — 指定 g で Fair Value 指標を再計算（監査比較用） */
export function recomputeFairValueSnapshot(input: {
  inputs: FairValueRawInputs;
  sector: string | null | undefined;
  fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>>;
  ddmGrowthPct: number | null;
  ddmGrowthMeta?: ResolvedDdmGrowth | null;
}): {
  dcf: FairValueModelResult;
  ddm: FairValueModelResult | null;
  per: FairValueModelResult;
  fairValueMid: number | null;
  fairValueLow: number | null;
  fairValueHigh: number | null;
  fairValueScore: number;
  recommendation: FairValueRecommendation;
  upsidePct: number | null;
  divergenceNote: string;
} {
  const mergedInputs: FairValueRawInputs = {
    ...input.inputs,
    dividendGrowth: input.ddmGrowthPct,
  };
  const dcf = buildDcfResult(mergedInputs, input.sector, input.fieldSources);
  const ddm = buildDdmResult(
    mergedInputs,
    input.sector,
    input.fieldSources,
    input.ddmGrowthMeta ?? null,
  );
  const per = buildPerResult(mergedInputs, input.sector, input.fieldSources);
  const range = computeFairValueRange(
    [dcf.fairPrice, ddm?.fairPrice ?? null, per.fairPrice].filter((p): p is number => p != null),
  );
  const metrics = computeFairValueDerivedMetrics({
    currentPrice: mergedInputs.currentPrice,
    fairValueMid: range.mid,
    fairValueLow: range.low,
  });
  const fairValueScore = computeFairValueScore({
    upsidePct: metrics.upsidePct,
    marginOfSafetyPct: metrics.marginOfSafetyPct,
    downsidePct: metrics.downsidePct,
  });
  return {
    dcf,
    ddm,
    per,
    fairValueMid: range.mid,
    fairValueLow: range.low,
    fairValueHigh: range.high,
    fairValueScore,
    recommendation: recommendationFromFairValueScore(fairValueScore),
    upsidePct: metrics.upsidePct,
    divergenceNote: '',
  };
}

export function fairValueIntelligenceToMaterialInputs(
  analysis: BursaFairValueIntelligenceAnalysis,
): RawMaterialInput[] {
  if (!analysis.hasExtractableData) return [];
  const d = analysis.displayJa;
  return [
    {
      source: 'bursa_announcement',
      sourceLabelJa: 'Phase21 Fair Value Intelligence',
      title: `Fair Value ${analysis.recommendation} (${d.fairValueScore}) · Upside ${d.upsidePct}`,
      url: null,
      publishedAt: analysis.fetchedAt,
      idSuffix: `phase21-fair-value-${analysis.recommendation.replace(/\s+/g, '-')}`,
    },
  ];
}

export type { FairValueMetricKey };
