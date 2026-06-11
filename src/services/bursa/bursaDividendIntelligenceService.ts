/**
 * Phase17 / 17.5 — Dividend Intelligence
 */
import type { BursaDisclosureBundle } from '../../types/bursaDisclosure';
import type {
  BursaDividendIntelligenceAnalysis,
  DividendIntelligenceDisplayFields,
  DividendIntelligenceSource,
} from '../../types/bursaDividendIntelligence';
import {
  DIVIDEND_FIELD_MISSING_JA,
  DIVIDEND_INTELLIGENCE_UNAVAILABLE_JA,
} from '../../types/bursaDividendIntelligence';
import type { AnalysisApiKeys } from '../analysisApiKeys';
import { parseBursaDividendFromHtml } from './bursaDividendService';
import { computeDividendJudgment } from './bursaDividendJudgment';
import {
  buildKlseDividendPartial,
  fetchAlphaVantageDividendPartial,
  fetchFmpDividendPartial,
  fetchYahooDividendPartial,
  mergeDividendProviderPartials,
} from './bursaDividendIntelligenceProviders';
import {
  computeDividendMaterialMaxAdjustment,
  dividendIntelligenceMaterialScoreAdjustment,
} from './bursaMaterialWeightCalibration';
import { fetchKlseStockPageHtml } from './bursaKlseHtmlClient';
import { buildBursaFiveYearTrend } from './bursaTrendAnalysis';
import { calendarYearFromDividendLabel } from './bursaYearUtil';

export { dividendIntelligenceMaterialScoreAdjustment } from './bursaMaterialWeightCalibration';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function fmtPct(n: number | null, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return DIVIDEND_FIELD_MISSING_JA;
  return `${n.toFixed(digits)}%`;
}

function fmtNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return DIVIDEND_FIELD_MISSING_JA;
  return String(n);
}

function computeConsecutiveYears(yearlyDividends: Map<number, number>): number | null {
  const years = [...yearlyDividends.entries()]
    .filter(([, v]) => v > 0)
    .map(([y]) => y)
    .sort((a, b) => b - a);
  if (years.length === 0) return null;
  let streak = 1;
  for (let i = 1; i < years.length; i++) {
    if (years[i] === years[i - 1]! - 1) streak += 1;
    else break;
  }
  return streak;
}

function computeSustainabilityScore(input: {
  judgment: ReturnType<typeof computeDividendJudgment>;
  payoutRatio: number | null;
  consecutiveYears: number | null;
  growthRate: number | null;
}): number {
  let score = 20;
  if (input.consecutiveYears != null && input.consecutiveYears >= 3) score += 20;
  if (input.growthRate != null && input.growthRate > 0) score += 15;
  if (input.judgment.cutCount === 0) score += 20;
  else if (input.judgment.cutCount != null && input.judgment.cutCount > 0) score -= 15;
  if (input.payoutRatio != null && input.payoutRatio >= 30 && input.payoutRatio <= 80) score += 15;
  if (input.judgment.rating === '優秀') score += 10;
  if (input.judgment.rating === '注意') score -= 10;
  return clamp(score);
}

function buildDisplayFields(input: {
  dividendYield: number | null;
  payoutRatio: number | null;
  dividendGrowthRate: number | null;
  consecutiveDividendYears: number | null;
  fiveYearCagr: number | null;
  exDividendDate: string | null;
  paymentDate: string | null;
  dividendFrequency: string | null;
  specialDividend: boolean | null;
  sustainabilityScore: number;
}): DividendIntelligenceDisplayFields {
  return {
    dividendYield: fmtPct(input.dividendYield),
    payoutRatio: fmtPct(input.payoutRatio),
    dividendGrowthRate: fmtPct(input.dividendGrowthRate),
    consecutiveDividendYears: fmtNum(input.consecutiveDividendYears),
    fiveYearCagr: fmtPct(input.fiveYearCagr),
    exDividendDate: input.exDividendDate ?? DIVIDEND_FIELD_MISSING_JA,
    paymentDate: input.paymentDate ?? DIVIDEND_FIELD_MISSING_JA,
    dividendFrequency: input.dividendFrequency ?? DIVIDEND_FIELD_MISSING_JA,
    specialDividend:
      input.specialDividend == null
        ? DIVIDEND_FIELD_MISSING_JA
        : input.specialDividend
          ? 'あり'
          : 'なし',
    sustainabilityScore: String(input.sustainabilityScore),
  };
}

function buildEvaluationJa(input: {
  dividendYield: number | null;
  payoutRatio: number | null;
  fiveYearCagr: number | null;
  consecutiveYears: number | null;
  growthRate: number | null;
  judgment: ReturnType<typeof computeDividendJudgment>;
  source: DividendIntelligenceSource;
  fieldAcquisitionRate: number;
}): string {
  const parts = ['Dividend Intelligence'];
  if (input.dividendYield != null) parts.push(`利回り${input.dividendYield.toFixed(2)}%`);
  if (input.payoutRatio != null) parts.push(`性向${input.payoutRatio.toFixed(1)}%`);
  if (input.fiveYearCagr != null) parts.push(`5YCAGR${input.fiveYearCagr.toFixed(1)}%`);
  if (input.consecutiveYears != null && input.consecutiveYears >= 3) parts.push(`連続${input.consecutiveYears}年`);
  if (input.growthRate != null && input.growthRate > 0) parts.push('増配継続');
  if (input.judgment.rating) parts.push(input.judgment.rating);
  parts.push(`取得率${Math.round(input.fieldAcquisitionRate * 100)}%`);
  parts.push(`[${input.source}]`);
  return parts.join(' · ');
}

function emptyAnalysis(reason: string | null = null): BursaDividendIntelligenceAnalysis {
  const missing = DIVIDEND_FIELD_MISSING_JA;
  return {
    availability: 'unavailable',
    availabilityLabelJa: DIVIDEND_INTELLIGENCE_UNAVAILABLE_JA,
    dividendYield: null,
    payoutRatio: null,
    dividendGrowthRate: null,
    consecutiveDividendYears: null,
    fiveYearCagr: null,
    exDividendDate: null,
    paymentDate: null,
    dividendFrequency: null,
    specialDividend: null,
    dividendSustainabilityScore: 0,
    source: 'none',
    fieldAcquisitionRate: 0,
    fieldSources: {},
    materialWeightMax: 0,
    unavailableReason: reason ?? DIVIDEND_INTELLIGENCE_UNAVAILABLE_JA,
    displayJa: {
      dividendYield: missing,
      payoutRatio: missing,
      dividendGrowthRate: missing,
      consecutiveDividendYears: missing,
      fiveYearCagr: missing,
      exDividendDate: missing,
      paymentDate: missing,
      dividendFrequency: missing,
      specialDividend: missing,
      sustainabilityScore: '0',
    },
    evaluationJa: DIVIDEND_INTELLIGENCE_UNAVAILABLE_JA,
    hasExtractableData: false,
    fetchedAt: null,
  };
}

export async function buildDividendIntelligenceAnalysis(input: {
  stockCode: string;
  stockHtml: string | null;
  bundle?: BursaDisclosureBundle | null;
  apiKeys?: AnalysisApiKeys;
  fetchLiveExternal: boolean;
}): Promise<BursaDividendIntelligenceAnalysis> {
  if (!input.fetchLiveExternal) {
    return emptyAnalysis('fetchLiveExternal=false');
  }

  let stockHtml = input.stockHtml;
  if (!stockHtml?.trim()) {
    const page = await fetchKlseStockPageHtml(input.stockCode);
    stockHtml = page?.html ?? null;
  }

  const bundle = input.bundle ?? null;
  let klseHistory = bundle?.dividend.history ?? [];
  if (stockHtml?.trim()) {
    const parsed = parseBursaDividendFromHtml(stockHtml, input.stockCode);
    if (parsed.history.length > 0) klseHistory = parsed.history;
  }

  const klseYield = bundle?.profile.dividendYieldPct ?? null;
  const trend = bundle ? buildBursaFiveYearTrend(bundle) : null;
  const klsePayout =
    bundle?.quarterly.latestQuarter?.dividendPayoutPct ??
    trend?.dividendPayoutPct[trend.dividendPayoutPct.length - 1] ??
    null;
  const klseCagr = trend
    ? (() => {
        const divs = trend.dividend.filter((v): v is number => v != null && v > 0);
        if (divs.length < 2) return null;
        const first = divs[0]!;
        const last = divs[divs.length - 1]!;
        return (Math.pow(last / first, 1 / (divs.length - 1)) - 1) * 100;
      })()
    : null;

  const fmpKey = input.apiKeys?.fmpApiKey?.trim() ?? '';
  const avKey = input.apiKeys?.alphaVantageApiKey?.trim() ?? '';

  const partials = (
    await Promise.all([
      fetchYahooDividendPartial(input.stockCode),
      fmpKey ? fetchFmpDividendPartial(input.stockCode, fmpKey) : null,
      avKey ? fetchAlphaVantageDividendPartial(input.stockCode, avKey) : null,
    ])
  ).filter((p): p is NonNullable<typeof p> => p != null);

  const klsePartial = buildKlseDividendPartial({
    dividendHistory: klseHistory,
    dividendYield: klseYield,
    payoutRatio: klsePayout,
    fiveYearCagr: klseCagr,
  });
  if (klsePartial) partials.push(klsePartial);

  if (partials.length === 0) {
    return emptyAnalysis('配当データ未取得');
  }

  const { merged, fieldSources, primarySource, fieldAcquisitionRate } =
    mergeDividendProviderPartials(partials);

  const dividendHistory =
    merged.dividendHistory.length > 0 ? merged.dividendHistory : klseHistory;

  if (
    dividendHistory.length === 0 &&
    merged.dividendYield == null &&
    merged.payoutRatio == null
  ) {
    return emptyAnalysis('配当データ未取得');
  }

  const syntheticBundle: BursaDisclosureBundle =
    bundle ??
    ({
      stockCode: input.stockCode,
      profile: {
        stockCode: input.stockCode,
        companyName: null,
        companyOverview: null,
        sector: null,
        subSector: null,
        marketCap: null,
        marketCapCurrency: 'MYR',
        sharesOutstanding: null,
        pe: null,
        eps: null,
        dividendYieldPct: merged.dividendYield,
        fetchedFields: [],
        missingFields: [],
        status: 'partial',
        source: 'klse_screener',
        fetchedAt: new Date().toISOString(),
      },
      quarterly: {
        stockCode: input.stockCode,
        latestQuarter: null,
        quarterlyHistory: [],
        annualRecords: [],
        fetchedFields: [],
        missingFields: [],
        status: 'failed',
        source: 'none',
        fetchedAt: new Date().toISOString(),
      },
      dividend: {
        stockCode: input.stockCode,
        history: dividendHistory,
        fetchedFields: dividendHistory.length > 0 ? ['dividendHistory'] : [],
        missingFields: dividendHistory.length === 0 ? ['dividendHistory'] : [],
        status: dividendHistory.length > 0 ? 'ok' : 'failed',
        source: 'klse_screener',
        fetchedAt: new Date().toISOString(),
      },
      dataSource: 'klse_screener',
      fetchedFields: [],
      missingFields: [],
      apiNotes: [],
    } as BursaDisclosureBundle);

  const judgment = computeDividendJudgment(syntheticBundle);

  const yearlyDiv = new Map<number, number>();
  for (const d of dividendHistory) {
    const y = calendarYearFromDividendLabel(d.financialYear);
    const amt = d.amountPerShare;
    if (y == null || amt == null || amt <= 0) continue;
    yearlyDiv.set(y, (yearlyDiv.get(y) ?? 0) + amt);
  }

  const consecutiveDividendYears = computeConsecutiveYears(yearlyDiv);
  const dividendGrowthRate = judgment.growthRatePct;
  const dividendSustainabilityScore = computeSustainabilityScore({
    judgment,
    payoutRatio: merged.payoutRatio,
    consecutiveYears: consecutiveDividendYears,
    growthRate: dividendGrowthRate,
  });

  const materialWeightMax = computeDividendMaterialMaxAdjustment(fieldAcquisitionRate);

  return {
    availability: 'available',
    availabilityLabelJa: '取得済',
    dividendYield: merged.dividendYield,
    payoutRatio: merged.payoutRatio,
    dividendGrowthRate,
    consecutiveDividendYears,
    fiveYearCagr: merged.fiveYearCagr,
    exDividendDate: merged.exDividendDate,
    paymentDate: merged.paymentDate,
    dividendFrequency: merged.dividendFrequency,
    specialDividend: merged.specialDividend,
    dividendSustainabilityScore,
    source: primarySource,
    fieldAcquisitionRate,
    fieldSources,
    materialWeightMax,
    unavailableReason: null,
    displayJa: buildDisplayFields({
      dividendYield: merged.dividendYield,
      payoutRatio: merged.payoutRatio,
      dividendGrowthRate,
      consecutiveDividendYears,
      fiveYearCagr: merged.fiveYearCagr,
      exDividendDate: merged.exDividendDate,
      paymentDate: merged.paymentDate,
      dividendFrequency: merged.dividendFrequency,
      specialDividend: merged.specialDividend,
      sustainabilityScore: dividendSustainabilityScore,
    }),
    evaluationJa: buildEvaluationJa({
      dividendYield: merged.dividendYield,
      payoutRatio: merged.payoutRatio,
      fiveYearCagr: merged.fiveYearCagr,
      consecutiveYears: consecutiveDividendYears,
      growthRate: dividendGrowthRate,
      judgment,
      source: primarySource,
      fieldAcquisitionRate,
    }),
    hasExtractableData: true,
    fetchedAt: new Date().toISOString(),
  };
}

export function dividendIntelligenceToMaterialInputs(
  analysis: BursaDividendIntelligenceAnalysis | null | undefined,
): import('./bursaMaterialSentiment').RawMaterialInput[] {
  if (!analysis || analysis.availability !== 'available' || !analysis.hasExtractableData) {
    return [];
  }
  return [
    {
      source: 'bursa_announcement',
      title: analysis.evaluationJa.slice(0, 180),
      url: null,
      publishedAt: analysis.exDividendDate,
      idSuffix: 'dividend-intelligence',
      sourceLabelJa: 'Dividend Intelligence (Phase17.5)',
    },
  ];
}
