/**
 * Phase14 — Analyst Consensus 解析（Rating / Target / Forecast / Trend）
 */
import type { AnalysisApiKeys } from '../analysisApiKeys';
import type {
  AnalystConsensusDisplayFields,
  BursaAnalystConsensusAnalysis,
} from '../../types/bursaAnalystConsensus';
import {
  ANALYST_CONSENSUS_UNAVAILABLE_JA,
  ANALYST_FIELD_MISSING_JA,
} from '../../types/bursaAnalystConsensus';
import {
  fetchAlphaVantageAnalystConsensus,
  fetchFinnhubAnalystConsensus,
  fetchFmpAnalystConsensus,
  fetchYahooAnalystConsensus,
  mergeAnalystConsensusPartials,
  type AnalystConsensusApiKeys,
  type AnalystConsensusPartial,
} from './bursaAnalystConsensusProviders';
import { buildYahooChartUrl } from '../quoteProviders/yahooFinanceQuote';
import { defaultQuoteFetchHeaders, fetchHttpWithRetry } from '../quoteProviders/providerFetchUtil';

const SOURCE_LABEL: Record<string, string> = {
  finnhub: 'Finnhub',
  alpha_vantage: 'Alpha Vantage',
  fmp: 'FMP',
  yahoo_finance: 'Yahoo Finance',
  none: '—',
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function fmtPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return ANALYST_FIELD_MISSING_JA;
  return `MYR ${n.toLocaleString('en-MY', { maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return ANALYST_FIELD_MISSING_JA;
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtForecast(pair: { currentFy: number | null; nextFy: number | null }): string {
  const cur =
    pair.currentFy != null
      ? pair.currentFy.toLocaleString('en-MY', { maximumFractionDigits: 2 })
      : ANALYST_FIELD_MISSING_JA;
  const next =
    pair.nextFy != null
      ? pair.nextFy.toLocaleString('en-MY', { maximumFractionDigits: 2 })
      : ANALYST_FIELD_MISSING_JA;
  return `Current FY ${cur} / Next FY ${next}`;
}

function computeUpsidePct(target: number | null, current: number | null): number | null {
  if (target == null || current == null || current <= 0) return null;
  return ((target - current) / current) * 100;
}

function computeConfidence(partial: AnalystConsensusPartial, hasUpside: boolean): number {
  let score = 20;
  if (partial.rating) score += 20;
  if (partial.averageTargetPrice != null) score += 20;
  if ((partial.ratingCounts?.analystCount ?? 0) >= 3) score += 10;
  if (partial.epsForecast.currentFy != null) score += 10;
  if (partial.revenueForecast.currentFy != null) score += 10;
  if (partial.consensusTrend) score += 5;
  if (hasUpside) score += 5;
  return clamp(score);
}

function buildDisplayFields(input: {
  partial: AnalystConsensusPartial;
  upsidePct: number | null;
  confidenceScore: number;
}): AnalystConsensusDisplayFields {
  const { partial, upsidePct, confidenceScore } = input;
  return {
    rating: partial.rating ?? ANALYST_FIELD_MISSING_JA,
    targetPrice: fmtPrice(partial.averageTargetPrice),
    upside: fmtPct(upsidePct),
    analystCount:
      partial.ratingCounts?.analystCount != null && partial.ratingCounts.analystCount > 0
        ? String(partial.ratingCounts.analystCount)
        : ANALYST_FIELD_MISSING_JA,
    epsForecast: fmtForecast(partial.epsForecast),
    revenueForecast: fmtForecast(partial.revenueForecast),
    trend: partial.consensusTrend ?? ANALYST_FIELD_MISSING_JA,
    confidence: `${confidenceScore}`,
  };
}

function buildEvaluationJa(partial: AnalystConsensusPartial, upsidePct: number | null): string {
  const parts: string[] = ['Analyst Consensus'];
  if (partial.rating) parts.push(partial.rating);
  if (partial.averageTargetPrice != null) {
    parts.push(`Target ${fmtPrice(partial.averageTargetPrice)}`);
  }
  if (upsidePct != null) parts.push(fmtPct(upsidePct));
  if (partial.ratingCounts?.analystCount) {
    parts.push(`${partial.ratingCounts.analystCount} analysts`);
  }
  parts.push(`[${SOURCE_LABEL[partial.source] ?? partial.source}]`);
  return parts.join(' · ');
}

export function resolveAnalystConsensusApiKeys(
  apiKeys: AnalysisApiKeys,
  overrides?: Partial<AnalystConsensusApiKeys>,
): AnalystConsensusApiKeys {
  const readEnv = (...names: string[]): string => {
    if (typeof process === 'undefined' || !process.env) return '';
    for (const name of names) {
      const v = process.env[name]?.trim();
      if (v && v.length >= 8) return v;
    }
    return '';
  };

  return {
    finnhubApiKey:
      overrides?.finnhubApiKey ??
      apiKeys.earningsApiKey?.trim() ??
      readEnv('FINNHUB_API_KEY', 'EARNINGS_API_KEY', 'EXPO_PUBLIC_EARNINGS_API_KEY'),
    alphaVantageApiKey:
      overrides?.alphaVantageApiKey ??
      apiKeys.alphaVantageApiKey?.trim() ??
      readEnv('ALPHA_VANTAGE_API_KEY', 'EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY'),
    fmpApiKey:
      overrides?.fmpApiKey ??
      apiKeys.fmpApiKey?.trim() ??
      readEnv('FMP_API_KEY', 'EXPO_PUBLIC_FMP_API_KEY'),
  };
}

async function fetchCurrentPrice(stockCode: string): Promise<number | null> {
  const symbol = `${stockCode.replace(/\.KL$/i, '').trim()}.KL`;
  try {
    const res = await fetchHttpWithRetry(buildYahooChartUrl(symbol), {
      timeoutMs: 10_000,
      logLabel: 'yahoo_price_for_consensus',
      headers: defaultQuoteFetchHeaders(),
    });
    if (!res.response.ok) return null;
    const json = JSON.parse(res.bodyText) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
    };
    const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === 'number' && Number.isFinite(price) ? price : null;
  } catch {
    return null;
  }
}

function emptyAnalysis(): BursaAnalystConsensusAnalysis {
  const missing = ANALYST_FIELD_MISSING_JA;
  return {
    availability: 'unavailable',
    availabilityLabelJa: ANALYST_CONSENSUS_UNAVAILABLE_JA,
    source: 'none',
    rating: null,
    ratingCounts: null,
    averageTargetPrice: null,
    currentPrice: null,
    targetPriceUpsidePct: null,
    epsForecast: { currentFy: null, nextFy: null },
    revenueForecast: { currentFy: null, nextFy: null },
    consensusTrend: null,
    confidenceScore: 0,
    displayJa: {
      rating: missing,
      targetPrice: missing,
      upside: missing,
      analystCount: missing,
      epsForecast: missing,
      revenueForecast: missing,
      trend: missing,
      confidence: '0',
    },
    evaluationJa: ANALYST_CONSENSUS_UNAVAILABLE_JA,
    hasRatingOrTarget: false,
    fetchedAt: null,
  };
}

export async function buildAnalystConsensusAnalysis(input: {
  stockCode: string;
  currentPrice?: number | null;
  apiKeys: AnalysisApiKeys;
  fetchLiveExternal: boolean;
  apiKeyOverrides?: Partial<AnalystConsensusApiKeys>;
}): Promise<BursaAnalystConsensusAnalysis> {
  if (!input.fetchLiveExternal) {
    return emptyAnalysis();
  }

  const keys = resolveAnalystConsensusApiKeys(input.apiKeys, input.apiKeyOverrides);
  const partials: AnalystConsensusPartial[] = [];

  const finnhub = await fetchFinnhubAnalystConsensus(input.stockCode, keys.finnhubApiKey);
  if (finnhub) partials.push(finnhub);

  const mergedEarly = mergeAnalystConsensusPartials(partials);
  const needMore =
    !mergedEarly?.rating || mergedEarly.averageTargetPrice == null;

  if (needMore) {
    const av = await fetchAlphaVantageAnalystConsensus(input.stockCode, keys.alphaVantageApiKey);
    if (av) partials.push(av);
  }

  const mergedMid = mergeAnalystConsensusPartials(partials);
  const stillNeed =
    !mergedMid?.rating || mergedMid.averageTargetPrice == null;

  if (stillNeed) {
    const fmp = await fetchFmpAnalystConsensus(input.stockCode, keys.fmpApiKey);
    if (fmp) partials.push(fmp);
  }

  const mergedBeforeYahoo = mergeAnalystConsensusPartials(partials);
  const yahooNeeded =
    !mergedBeforeYahoo?.rating || mergedBeforeYahoo.averageTargetPrice == null;

  if (yahooNeeded) {
    const yahoo = await fetchYahooAnalystConsensus(input.stockCode);
    if (yahoo) partials.push(yahoo);
  }

  const merged = mergeAnalystConsensusPartials(partials);
  if (!merged || (!merged.rating && merged.averageTargetPrice == null)) {
    return emptyAnalysis();
  }

  let currentPrice = input.currentPrice ?? null;
  if (currentPrice == null) {
    currentPrice = await fetchCurrentPrice(input.stockCode);
  }

  const upsidePct = computeUpsidePct(merged.averageTargetPrice, currentPrice);
  const confidenceScore = computeConfidence(merged, upsidePct != null);
  const displayJa = buildDisplayFields({ partial: merged, upsidePct, confidenceScore });

  return {
    availability: 'available',
    availabilityLabelJa: '取得済',
    source: merged.source,
    rating: merged.rating,
    ratingCounts: merged.ratingCounts,
    averageTargetPrice: merged.averageTargetPrice,
    currentPrice,
    targetPriceUpsidePct: upsidePct,
    epsForecast: merged.epsForecast,
    revenueForecast: merged.revenueForecast,
    consensusTrend: merged.consensusTrend,
    confidenceScore,
    displayJa,
    evaluationJa: buildEvaluationJa(merged, upsidePct),
    hasRatingOrTarget: Boolean(merged.rating || merged.averageTargetPrice != null),
    fetchedAt: new Date().toISOString(),
  };
}

export function analystConsensusToMaterialInputs(
  analysis: BursaAnalystConsensusAnalysis | null | undefined,
): import('./bursaMaterialSentiment').RawMaterialInput[] {
  if (!analysis || analysis.availability !== 'available' || !analysis.hasRatingOrTarget) {
    return [];
  }
  return [
    {
      source: 'bursa_announcement',
      title: analysis.evaluationJa.slice(0, 180),
      url: null,
      publishedAt: analysis.fetchedAt,
      idSuffix: 'analyst-consensus',
      sourceLabelJa: 'Analyst Consensus (Phase14)',
    },
  ];
}
