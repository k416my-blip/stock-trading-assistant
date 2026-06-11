/**
 * Phase16.5 — Institutional Trend 解析
 */
import type {
  BursaInstitutionalTrendAnalysis,
  InstitutionalTrendDisplayFields,
  InstitutionalTrendSource,
  TrendDirection,
} from '../../types/bursaInstitutionalTrend';
import {
  INSTITUTIONAL_TREND_FIELD_MISSING_JA,
  INSTITUTIONAL_TREND_UNAVAILABLE_JA,
} from '../../types/bursaInstitutionalTrend';
import { parseInstitutionalOwnershipFromHtml } from './bursaInstitutionalOwnershipParser';
import {
  buildInstitutionalAggregateSeries,
  classifyTrendDirection,
  findAggregatePctNearDate,
  formatTrendPct,
  relativeChangePercent,
} from './bursaInstitutionalTrendParser';
import {
  fetchKlseShareholdingsHtml,
  fetchKlseStockPageHtml,
} from './bursaKlseHtmlClient';

const SOURCE_LABEL: Record<InstitutionalTrendSource, string> = {
  klse_shareholdings_page: 'KLSE Shareholdings',
  klse_shareholding_changes: 'KLSE Shareholding Changes',
  klse_major_shareholders: 'KLSE Major Shareholders',
  none: '—',
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function fmtHoldingPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return INSTITUTIONAL_TREND_FIELD_MISSING_JA;
  return `${n.toFixed(2)}%`;
}

function pickPrimarySource(sources: Set<string>): InstitutionalTrendSource {
  if (sources.has('klse_shareholdings_page')) return 'klse_shareholdings_page';
  if (sources.has('klse_major_shareholders')) return 'klse_major_shareholders';
  if (sources.has('klse_shareholding_changes')) return 'klse_shareholding_changes';
  return 'none';
}

function computeTrendConfidence(input: {
  seriesLength: number;
  hasChange: boolean;
  has3m: boolean;
  has6m: boolean;
  has12m: boolean;
  direction: TrendDirection | null;
}): number {
  let score = 15;
  if (input.seriesLength >= 2) score += 20;
  if (input.hasChange) score += 20;
  if (input.has3m) score += 15;
  if (input.has6m) score += 15;
  if (input.has12m) score += 10;
  if (input.direction && input.direction !== 'Neutral') score += 5;
  return clamp(score);
}

function buildDisplayFields(input: {
  currentHoldingPercent: number | null;
  previousHoldingPercent: number | null;
  changePercent: number | null;
  threeMonthTrend: number | null;
  sixMonthTrend: number | null;
  twelveMonthTrend: number | null;
  trendDirection: TrendDirection | null;
  trendConfidence: number;
}): InstitutionalTrendDisplayFields {
  return {
    previousHoldingPercent: fmtHoldingPct(input.previousHoldingPercent),
    currentHoldingPercent: fmtHoldingPct(input.currentHoldingPercent),
    changePercent: formatTrendPct(input.changePercent),
    threeMonthTrend: formatTrendPct(input.threeMonthTrend),
    sixMonthTrend: formatTrendPct(input.sixMonthTrend),
    twelveMonthTrend: formatTrendPct(input.twelveMonthTrend),
    trendDirection: input.trendDirection ?? INSTITUTIONAL_TREND_FIELD_MISSING_JA,
    trendConfidence: String(input.trendConfidence),
  };
}

function buildEvaluationJa(input: {
  changePercent: number | null;
  trendDirection: TrendDirection | null;
  threeMonthTrend: number | null;
  source: InstitutionalTrendSource;
}): string {
  const parts = ['Institutional Trend'];
  if (input.changePercent != null) parts.push(`増減 ${formatTrendPct(input.changePercent)}`);
  if (input.trendDirection) parts.push(input.trendDirection);
  if (input.threeMonthTrend != null) parts.push(`3M ${formatTrendPct(input.threeMonthTrend)}`);
  parts.push(`[${SOURCE_LABEL[input.source]}]`);
  return parts.join(' · ');
}

function emptyAnalysis(reason: string | null = null): BursaInstitutionalTrendAnalysis {
  const missing = INSTITUTIONAL_TREND_FIELD_MISSING_JA;
  return {
    availability: 'unavailable',
    availabilityLabelJa: INSTITUTIONAL_TREND_UNAVAILABLE_JA,
    previousHoldingPercent: null,
    currentHoldingPercent: null,
    changePercent: null,
    threeMonthTrend: null,
    sixMonthTrend: null,
    twelveMonthTrend: null,
    trendDirection: null,
    trendConfidence: 0,
    source: 'none',
    unavailableReason: reason ?? INSTITUTIONAL_TREND_UNAVAILABLE_JA,
    displayJa: {
      previousHoldingPercent: missing,
      currentHoldingPercent: missing,
      changePercent: missing,
      threeMonthTrend: missing,
      sixMonthTrend: missing,
      twelveMonthTrend: missing,
      trendDirection: missing,
      trendConfidence: '0',
    },
    evaluationJa: INSTITUTIONAL_TREND_UNAVAILABLE_JA,
    hasExtractableData: false,
    fetchedAt: null,
  };
}

export async function buildInstitutionalTrendAnalysis(input: {
  stockCode: string;
  stockHtml: string | null;
  shareholdingsHtml?: string | null;
  fetchLiveExternal: boolean;
  referenceDate?: Date;
}): Promise<BursaInstitutionalTrendAnalysis> {
  if (!input.fetchLiveExternal) {
    return emptyAnalysis('fetchLiveExternal=false');
  }

  const ref = input.referenceDate ?? new Date();

  let stockHtml = input.stockHtml;
  if (!stockHtml?.trim()) {
    const page = await fetchKlseStockPageHtml(input.stockCode);
    stockHtml = page?.html ?? null;
  }

  let shareholdingsHtml = input.shareholdingsHtml ?? null;
  if (!shareholdingsHtml?.trim()) {
    const sh = await fetchKlseShareholdingsHtml(input.stockCode);
    shareholdingsHtml = sh?.html ?? null;
  }

  if (!stockHtml?.trim() && !shareholdingsHtml?.trim()) {
    return emptyAnalysis('KLSE HTML 未取得');
  }

  const snapshots = parseInstitutionalOwnershipFromHtml({
    stockCode: input.stockCode,
    stockHtml,
    shareholdingsHtml,
  });

  const withPct = snapshots.filter((s) => s.directPct != null);
  if (withPct.length === 0) {
    return emptyAnalysis('機関保有比率の時系列データなし');
  }

  const series = buildInstitutionalAggregateSeries(snapshots);
  if (series.length < 2) {
    return emptyAnalysis('前回比較に必要な2時点以上のデータなし');
  }

  const currentHoldingPercent = series[0]!.totalHoldingPercent;
  const previousHoldingPercent = series[1]!.totalHoldingPercent;
  const changePercent = relativeChangePercent(currentHoldingPercent, previousHoldingPercent);

  if (changePercent == null) {
    return emptyAnalysis('増減率を算出できません');
  }

  const d3 = new Date(ref);
  d3.setDate(d3.getDate() - 90);
  const d6 = new Date(ref);
  d6.setDate(d6.getDate() - 180);
  const d12 = new Date(ref);
  d12.setDate(d12.getDate() - 365);

  const pct3mBase = findAggregatePctNearDate(series, d3);
  const pct6mBase = findAggregatePctNearDate(series, d6);
  const pct12mBase = findAggregatePctNearDate(series, d12);

  const threeMonthTrend =
    pct3mBase != null ? relativeChangePercent(currentHoldingPercent, pct3mBase) : null;
  const sixMonthTrend =
    pct6mBase != null ? relativeChangePercent(currentHoldingPercent, pct6mBase) : null;
  const twelveMonthTrend =
    pct12mBase != null ? relativeChangePercent(currentHoldingPercent, pct12mBase) : null;

  const trendDirection = classifyTrendDirection(changePercent);
  const sources = new Set(withPct.map((s) => s.source));
  const trendConfidence = computeTrendConfidence({
    seriesLength: series.length,
    hasChange: changePercent != null,
    has3m: threeMonthTrend != null,
    has6m: sixMonthTrend != null,
    has12m: twelveMonthTrend != null,
    direction: trendDirection,
  });
  const source = pickPrimarySource(sources);

  return {
    availability: 'available',
    availabilityLabelJa: '取得済',
    previousHoldingPercent,
    currentHoldingPercent,
    changePercent,
    threeMonthTrend,
    sixMonthTrend,
    twelveMonthTrend,
    trendDirection,
    trendConfidence,
    source,
    unavailableReason: null,
    displayJa: buildDisplayFields({
      currentHoldingPercent,
      previousHoldingPercent,
      changePercent,
      threeMonthTrend,
      sixMonthTrend,
      twelveMonthTrend,
      trendDirection,
      trendConfidence,
    }),
    evaluationJa: buildEvaluationJa({ changePercent, trendDirection, threeMonthTrend, source }),
    hasExtractableData: true,
    fetchedAt: new Date().toISOString(),
  };
}

export function institutionalTrendToMaterialInputs(
  analysis: BursaInstitutionalTrendAnalysis | null | undefined,
): import('./bursaMaterialSentiment').RawMaterialInput[] {
  if (!analysis || analysis.availability !== 'available' || !analysis.hasExtractableData) {
    return [];
  }
  return [
    {
      source: 'bursa_announcement',
      title: analysis.evaluationJa.slice(0, 180),
      url: null,
      publishedAt: null,
      idSuffix: 'institutional-trend',
      sourceLabelJa: 'Institutional Trend (Phase16.5)',
    },
  ];
}

export { institutionalTrendMaterialScoreAdjustment } from './bursaMaterialWeightCalibration';
