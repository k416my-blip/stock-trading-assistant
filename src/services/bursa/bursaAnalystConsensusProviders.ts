/**
 * Phase14 — Analyst Consensus 外部プロバイダー取得（推測禁止）
 */
import type {
  AnalystConsensusSource,
  AnalystForecastPair,
  AnalystRatingCounts,
  AnalystRatingLabel,
  ConsensusTrendLabel,
} from '../../types/bursaAnalystConsensus';
import {
  defaultQuoteFetchHeaders,
  fetchHttpWithRetry,
} from '../quoteProviders/providerFetchUtil';
import {
  fetchYahooQuoteSummaryModules,
  mapYahooRecommendationKey,
  parseYahooRawNumber,
} from '../quoteProviders/yahooQuoteSummaryClient';

const TIMEOUT_MS = 12_000;

export type AnalystConsensusPartial = {
  source: AnalystConsensusSource;
  rating: AnalystRatingLabel | null;
  ratingCounts: AnalystRatingCounts | null;
  averageTargetPrice: number | null;
  epsForecast: AnalystForecastPair;
  revenueForecast: AnalystForecastPair;
  consensusTrend: ConsensusTrendLabel | null;
};

export type AnalystConsensusApiKeys = {
  finnhubApiKey: string;
  alphaVantageApiKey: string;
  fmpApiKey: string;
};

function yahooSymbol(stockCode: string): string {
  const code = stockCode.replace(/\.KL$/i, '').trim();
  return `${code}.KL`;
}

function parseNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number.parseFloat(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function emptyForecast(): AnalystForecastPair {
  return { currentFy: null, nextFy: null };
}

export function deriveRatingFromCounts(counts: AnalystRatingCounts): AnalystRatingLabel | null {
  const total =
    counts.strongBuy + counts.buy + counts.hold + counts.sell + counts.strongSell;
  if (total <= 0) return null;
  const score =
    (counts.strongBuy * 2 +
      counts.buy * 1 +
      counts.hold * 0 +
      counts.sell * -1 +
      counts.strongSell * -2) /
    total;
  if (score >= 1.5) return 'Strong Buy';
  if (score >= 0.5) return 'Buy';
  if (score <= -1.5) return 'Strong Sell';
  if (score <= -0.5) return 'Sell';
  return 'Hold';
}

export function deriveConsensusTrend(
  current: AnalystRatingCounts,
  prior: AnalystRatingCounts | null,
): ConsensusTrendLabel | null {
  if (!prior) return null;
  const bullish = (c: AnalystRatingCounts) => c.strongBuy + c.buy;
  const bearish = (c: AnalystRatingCounts) => c.sell + c.strongSell;
  const curNet = bullish(current) - bearish(current);
  const priorNet = bullish(prior) - bearish(prior);
  if (curNet > priorNet + 1) return 'Upgraded';
  if (curNet < priorNet - 1) return 'Downgraded';
  return 'Maintained';
}

async function fetchJson(url: string, label: string): Promise<unknown | null> {
  try {
    const res = await fetchHttpWithRetry(url, {
      timeoutMs: TIMEOUT_MS,
      logLabel: label,
      headers: defaultQuoteFetchHeaders(),
    });
    if (!res.response.ok) return null;
    return JSON.parse(res.bodyText) as unknown;
  } catch {
    return null;
  }
}

function countsFromRow(row: Record<string, unknown>): AnalystRatingCounts | null {
  const strongBuy = parseNum(row.strongBuy) ?? 0;
  const buy = parseNum(row.buy) ?? 0;
  const hold = parseNum(row.hold) ?? 0;
  const sell = parseNum(row.sell) ?? 0;
  const strongSell = parseNum(row.strongSell) ?? 0;
  const analystCount = strongBuy + buy + hold + sell + strongSell;
  if (analystCount <= 0) return null;
  return { strongBuy, buy, hold, sell, strongSell, analystCount };
}

export async function fetchFinnhubAnalystConsensus(
  stockCode: string,
  apiKey: string,
): Promise<AnalystConsensusPartial | null> {
  const key = apiKey.trim();
  if (!key) return null;
  const symbol = yahooSymbol(stockCode);
  const token = encodeURIComponent(key);

  const [recJson, ptJson, epsJson, revJson] = await Promise.all([
    fetchJson(
      `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${token}`,
      'finnhub_recommendation',
    ),
    fetchJson(
      `https://finnhub.io/api/v1/stock/price-target?symbol=${encodeURIComponent(symbol)}&token=${token}`,
      'finnhub_price_target',
    ),
    fetchJson(
      `https://finnhub.io/api/v1/stock/eps-estimate?symbol=${encodeURIComponent(symbol)}&token=${token}`,
      'finnhub_eps_estimate',
    ),
    fetchJson(
      `https://finnhub.io/api/v1/stock/revenue-estimate?symbol=${encodeURIComponent(symbol)}&token=${token}`,
      'finnhub_revenue_estimate',
    ),
  ]);

  const recRows = Array.isArray(recJson) ? (recJson as Array<Record<string, unknown>>) : [];
  const latest = recRows[0];
  const prior = recRows[1] ?? null;
  const ratingCounts = latest ? countsFromRow(latest) : null;
  const rating = ratingCounts ? deriveRatingFromCounts(ratingCounts) : null;
  const consensusTrend =
    ratingCounts && prior ? deriveConsensusTrend(ratingCounts, countsFromRow(prior)) : null;

  const pt = ptJson && typeof ptJson === 'object' ? (ptJson as Record<string, unknown>) : null;
  const averageTargetPrice =
    parseNum(pt?.targetMean) ?? parseNum(pt?.targetMedian) ?? parseNum(pt?.targetHigh);

  const epsForecast = emptyForecast();
  const epsData =
    epsJson && typeof epsJson === 'object' && Array.isArray((epsJson as { data?: unknown }).data)
      ? ((epsJson as { data: Array<Record<string, unknown>> }).data ?? [])
      : [];
  if (epsData[0]) epsForecast.currentFy = parseNum(epsData[0].epsAvg);
  if (epsData[1]) epsForecast.nextFy = parseNum(epsData[1].epsAvg);

  const revenueForecast = emptyForecast();
  const revData =
    revJson && typeof revJson === 'object' && Array.isArray((revJson as { data?: unknown }).data)
      ? ((revJson as { data: Array<Record<string, unknown>> }).data ?? [])
      : [];
  if (revData[0]) revenueForecast.currentFy = parseNum(revData[0].revenueAvg);
  if (revData[1]) revenueForecast.nextFy = parseNum(revData[1].revenueAvg);

  if (!rating && averageTargetPrice == null && !ratingCounts) return null;

  return {
    source: 'finnhub',
    rating,
    ratingCounts,
    averageTargetPrice,
    epsForecast,
    revenueForecast,
    consensusTrend,
  };
}

export async function fetchAlphaVantageAnalystConsensus(
  stockCode: string,
  apiKey: string,
): Promise<AnalystConsensusPartial | null> {
  const key = apiKey.trim();
  if (!key) return null;
  const symbol = yahooSymbol(stockCode);

  const overview = await fetchJson(
    `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`,
    'alpha_vantage_overview',
  );
  if (!overview || typeof overview !== 'object') return null;
  const ov = overview as Record<string, unknown>;
  if (ov.Note || ov.Information || ov['Error Message']) return null;

  const averageTargetPrice = parseNum(ov.AnalystTargetPrice);
  const epsForecast = emptyForecast();
  epsForecast.currentFy = parseNum(ov.EPS);

  const earnings = await fetchJson(
    `https://www.alphavantage.co/query?function=EARNINGS&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`,
    'alpha_vantage_earnings',
  );
  if (earnings && typeof earnings === 'object') {
    const est =
      (earnings as { annualEarnings?: Array<{ reportedEPS?: string }> }).annualEarnings ?? [];
    if (est[0]) epsForecast.currentFy = parseNum(est[0].reportedEPS) ?? epsForecast.currentFy;
  }

  if (averageTargetPrice == null && epsForecast.currentFy == null) return null;

  return {
    source: 'alpha_vantage',
    rating: null,
    ratingCounts: null,
    averageTargetPrice,
    epsForecast,
    revenueForecast: emptyForecast(),
    consensusTrend: null,
  };
}

export async function fetchFmpAnalystConsensus(
  stockCode: string,
  apiKey: string,
): Promise<AnalystConsensusPartial | null> {
  const key = apiKey.trim();
  if (!key) return null;
  const symbol = yahooSymbol(stockCode);
  const encKey = encodeURIComponent(key);

  const [ptJson, estJson, gradeJson] = await Promise.all([
    fetchJson(
      `https://financialmodelingprep.com/stable/price-target-consensus?symbol=${encodeURIComponent(symbol)}&apikey=${encKey}`,
      'fmp_price_target',
    ),
    fetchJson(
      `https://financialmodelingprep.com/stable/analyst-estimates?symbol=${encodeURIComponent(symbol)}&period=annual&page=0&limit=2&apikey=${encKey}`,
      'fmp_analyst_estimates',
    ),
    fetchJson(
      `https://financialmodelingprep.com/stable/grades-consensus?symbol=${encodeURIComponent(symbol)}&apikey=${encKey}`,
      'fmp_grades_consensus',
    ),
  ]);

  let averageTargetPrice: number | null = null;
  if (Array.isArray(ptJson) && ptJson[0]) {
    const row = ptJson[0] as Record<string, unknown>;
    averageTargetPrice =
      parseNum(row.targetConsensus) ?? parseNum(row.targetMedian) ?? parseNum(row.targetHigh);
  }

  const epsForecast = emptyForecast();
  const revenueForecast = emptyForecast();
  if (Array.isArray(estJson)) {
    const rows = estJson as Array<Record<string, unknown>>;
    if (rows[0]) {
      epsForecast.currentFy = parseNum(rows[0].epsAvg) ?? parseNum(rows[0].estimatedEpsAvg);
      revenueForecast.currentFy =
        parseNum(rows[0].revenueAvg) ?? parseNum(rows[0].estimatedRevenueAvg);
    }
    if (rows[1]) {
      epsForecast.nextFy = parseNum(rows[1].epsAvg) ?? parseNum(rows[1].estimatedEpsAvg);
      revenueForecast.nextFy =
        parseNum(rows[1].revenueAvg) ?? parseNum(rows[1].estimatedRevenueAvg);
    }
  }

  let ratingCounts: AnalystRatingCounts | null = null;
  if (Array.isArray(gradeJson) && gradeJson[0]) {
    const g = gradeJson[0] as Record<string, unknown>;
    ratingCounts = {
      strongBuy: parseNum(g.strongBuy) ?? 0,
      buy: parseNum(g.buy) ?? 0,
      hold: parseNum(g.hold) ?? 0,
      sell: parseNum(g.sell) ?? 0,
      strongSell: parseNum(g.strongSell) ?? 0,
      analystCount: 0,
    };
    ratingCounts.analystCount =
      ratingCounts.strongBuy +
      ratingCounts.buy +
      ratingCounts.hold +
      ratingCounts.sell +
      ratingCounts.strongSell;
    if (ratingCounts.analystCount <= 0) ratingCounts = null;
  }

  const rating = ratingCounts ? deriveRatingFromCounts(ratingCounts) : null;
  if (!rating && averageTargetPrice == null) return null;

  return {
    source: 'fmp',
    rating,
    ratingCounts,
    averageTargetPrice,
    epsForecast,
    revenueForecast,
    consensusTrend: null,
  };
}

export async function fetchYahooAnalystConsensus(
  stockCode: string,
): Promise<AnalystConsensusPartial | null> {
  const symbol = yahooSymbol(stockCode);
  const fetched = await fetchYahooQuoteSummaryModules(symbol, [
    'financialData',
    'recommendationTrend',
    'earningsTrend',
  ]);
  if (!fetched.ok || !fetched.json) return null;

  const result = (fetched.json as { quoteSummary?: { result?: Array<Record<string, unknown>> } })
    .quoteSummary?.result?.[0];
  if (!result) return null;

  const financial = (result.financialData ?? {}) as Record<string, unknown>;
  const averageTargetPrice =
    parseYahooRawNumber(financial.targetMeanPrice as { raw?: number }) ??
    parseYahooRawNumber(financial.targetMedianPrice as { raw?: number });

  const recTrend = (result.recommendationTrend as { trend?: Array<Record<string, unknown>> } | undefined)
    ?.trend?.[0];
  const ratingCounts = recTrend ? countsFromRow(recTrend) : null;
  const priorTrend = (result.recommendationTrend as { trend?: Array<Record<string, unknown>> } | undefined)
    ?.trend?.[1];
  let rating = ratingCounts ? deriveRatingFromCounts(ratingCounts) : null;
  if (!rating) {
    rating = mapYahooRecommendationKey(financial.recommendationKey as string | undefined);
  }
  const consensusTrend =
    ratingCounts && priorTrend
      ? deriveConsensusTrend(ratingCounts, countsFromRow(priorTrend) ?? ratingCounts)
      : null;

  const epsForecast = emptyForecast();
  const revenueForecast = emptyForecast();
  const earningsTrend = (result.earningsTrend as { trend?: Array<Record<string, unknown>> } | undefined)
    ?.trend;
  for (const row of earningsTrend ?? []) {
    const period = String(row.period ?? '');
    const epsAvg = parseYahooRawNumber(
      (row.earningsEstimate as { avg?: { raw?: number } } | undefined)?.avg,
    );
    const revAvg = parseYahooRawNumber(
      (row.revenueEstimate as { avg?: { raw?: number } } | undefined)?.avg,
    );
    if (period === '0y') {
      if (epsAvg != null) epsForecast.currentFy = epsAvg;
      if (revAvg != null) revenueForecast.currentFy = revAvg;
    }
    if (period === '+1y') {
      if (epsAvg != null) epsForecast.nextFy = epsAvg;
      if (revAvg != null) revenueForecast.nextFy = revAvg;
    }
  }

  const analystOpinions = parseYahooRawNumber(financial.numberOfAnalystOpinions as { raw?: number });
  if (ratingCounts && analystOpinions != null && analystOpinions > ratingCounts.analystCount) {
    ratingCounts.analystCount = Math.round(analystOpinions);
  }

  if (!rating && averageTargetPrice == null) return null;

  return {
    source: 'yahoo_finance',
    rating,
    ratingCounts,
    averageTargetPrice,
    epsForecast,
    revenueForecast,
    consensusTrend,
  };
}

export function mergeAnalystConsensusPartials(
  partials: AnalystConsensusPartial[],
): AnalystConsensusPartial | null {
  if (partials.length === 0) return null;
  const merged: AnalystConsensusPartial = {
    source: partials[0]!.source,
    rating: null,
    ratingCounts: null,
    averageTargetPrice: null,
    epsForecast: emptyForecast(),
    revenueForecast: emptyForecast(),
    consensusTrend: null,
  };

  for (const p of partials) {
    if (!merged.rating && p.rating) {
      merged.rating = p.rating;
      merged.source = p.source;
    }
    if (!merged.ratingCounts && p.ratingCounts) merged.ratingCounts = p.ratingCounts;
    if (merged.averageTargetPrice == null && p.averageTargetPrice != null) {
      merged.averageTargetPrice = p.averageTargetPrice;
      if (!merged.rating) merged.source = p.source;
    }
    if (merged.epsForecast.currentFy == null && p.epsForecast.currentFy != null) {
      merged.epsForecast.currentFy = p.epsForecast.currentFy;
    }
    if (merged.epsForecast.nextFy == null && p.epsForecast.nextFy != null) {
      merged.epsForecast.nextFy = p.epsForecast.nextFy;
    }
    if (merged.revenueForecast.currentFy == null && p.revenueForecast.currentFy != null) {
      merged.revenueForecast.currentFy = p.revenueForecast.currentFy;
    }
    if (merged.revenueForecast.nextFy == null && p.revenueForecast.nextFy != null) {
      merged.revenueForecast.nextFy = p.revenueForecast.nextFy;
    }
    if (!merged.consensusTrend && p.consensusTrend) merged.consensusTrend = p.consensusTrend;
  }

  if (!merged.rating && merged.averageTargetPrice == null) return null;
  return merged;
}
