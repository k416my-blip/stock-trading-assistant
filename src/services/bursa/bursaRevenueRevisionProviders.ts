/**
 * Phase23 — Revenue Revision ライブプロバイダー（推測禁止）
 * 優先順位: Yahoo revenueTrend → FMP analyst-estimates → Finnhub revenue-estimate → Alpha Vantage → estimate snapshot
 */
import type { EarningsRevisionIntelligenceSource } from '../../types/bursaEarningsRevisionIntelligence';
import {
  defaultQuoteFetchHeaders,
  fetchHttpWithRetry,
} from '../quoteProviders/providerFetchUtil';
import {
  fetchYahooQuoteSummaryModules,
  parseYahooRawNumber,
} from '../quoteProviders/yahooQuoteSummaryClient';
import {
  computeRevisionPctFromSnapshots,
  recordRevenueEstimateSnapshot,
} from './bursaRevenueRevisionSnapshotStore';

const TIMEOUT_MS = 12_000;

export type RevenueRevisionApiKeys = {
  finnhubApiKey?: string;
  alphaVantageApiKey?: string;
  fmpApiKey?: string;
};

export type RevenueRevisionPartial = {
  source: EarningsRevisionIntelligenceSource;
  revenueRevision7d: number | null;
  revenueRevision30d: number | null;
  revenueRevision90d: number | null;
  revenueEstimateCurrentFy: number | null;
  fiscalPeriodEnd: string | null;
  unavailableReason: string | null;
};

function yahooSymbol(stockCode: string): string {
  return `${stockCode.replace(/\.KL$/i, '').trim()}.KL`;
}

export function revisionPct(current: number | null, ago: number | null): number | null {
  if (current == null || ago == null || ago === 0) return null;
  return ((current - ago) / Math.abs(ago)) * 100;
}

function parseNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number.parseFloat(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseTrendRow(row: Record<string, unknown> | undefined): {
  current: number | null;
  d7: number | null;
  d30: number | null;
  d90: number | null;
} {
  if (!row) return { current: null, d7: null, d30: null, d90: null };
  return {
    current: parseYahooRawNumber(row.current as { raw?: number }),
    d7: parseYahooRawNumber(row['7daysAgo'] as { raw?: number }),
    d30: parseYahooRawNumber(row['30daysAgo'] as { raw?: number }),
    d90: parseYahooRawNumber(row['90daysAgo'] as { raw?: number }),
  };
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

function pickYahooTrendRow(
  trend: Array<Record<string, unknown>> | undefined,
): Record<string, unknown> | null {
  if (!trend?.length) return null;
  const priority = ['0y', '0q', '+1q', '+1y'];
  for (const period of priority) {
    const row = trend.find((r) => String(r.period ?? '') === period);
    if (row) return row;
  }
  return trend[0] ?? null;
}

export async function fetchYahooRevenueRevisionPartial(
  stockCode: string,
): Promise<RevenueRevisionPartial | null> {
  const symbol = yahooSymbol(stockCode);
  const fetched = await fetchYahooQuoteSummaryModules(symbol, ['earningsTrend']);
  if (!fetched.ok || !fetched.json) return null;

  const trend = (
    fetched.json as { quoteSummary?: { result?: Array<Record<string, unknown>> } }
  ).quoteSummary?.result?.[0]?.earningsTrend as
    | { trend?: Array<Record<string, unknown>> }
    | undefined;

  const rows = trend?.trend ?? [];
  let revenueRevision7d: number | null = null;
  let revenueRevision30d: number | null = null;
  let revenueRevision90d: number | null = null;
  let revenueEstimateCurrentFy: number | null = null;
  let fiscalPeriodEnd: string | null = null;

  for (const row of rows) {
    const revTrend = parseTrendRow(row.revenueTrend as Record<string, unknown> | undefined);
    if (revTrend.current != null && revTrend.d30 != null) {
      revenueRevision7d = revisionPct(revTrend.current, revTrend.d7);
      revenueRevision30d = revisionPct(revTrend.current, revTrend.d30);
      revenueRevision90d = revisionPct(revTrend.current, revTrend.d90);
      revenueEstimateCurrentFy = revTrend.current;
      fiscalPeriodEnd = typeof row.endDate === 'string' ? row.endDate : fiscalPeriodEnd;
      break;
    }
  }

  if (revenueRevision30d != null) {
    return {
      source: 'yahoo_finance',
      revenueRevision7d,
      revenueRevision30d,
      revenueRevision90d,
      revenueEstimateCurrentFy,
      fiscalPeriodEnd,
      unavailableReason: null,
    };
  }

  const row0y = pickYahooTrendRow(rows);
  if (!row0y) return null;

  revenueEstimateCurrentFy = parseYahooRawNumber(
    (row0y.revenueEstimate as { avg?: { raw?: number } } | undefined)?.avg,
  );
  fiscalPeriodEnd = typeof row0y.endDate === 'string' ? row0y.endDate : null;

  if (revenueEstimateCurrentFy == null || !fiscalPeriodEnd) return null;

  recordRevenueEstimateSnapshot({
    stockCode,
    fiscalPeriodEnd,
    revenueEstimate: revenueEstimateCurrentFy,
    source: 'yahoo_finance',
    observedAt: new Date().toISOString(),
  });

  const fromSnapshot = computeRevisionPctFromSnapshots({
    stockCode,
    fiscalPeriodEnd,
    currentRevenue: revenueEstimateCurrentFy,
  });

  if (fromSnapshot.revision30d == null) {
    return {
      source: 'yahoo_finance',
      revenueRevision7d: null,
      revenueRevision30d: null,
      revenueRevision90d: null,
      revenueEstimateCurrentFy,
      fiscalPeriodEnd,
      unavailableReason:
        'Yahoo revenueTrend 未取得（.KL 銘柄）— スナップショット蓄積待ち（30日後に修正率算出可）',
    };
  }

  return {
    source: 'estimate_snapshot',
    revenueRevision7d: null,
    revenueRevision30d: fromSnapshot.revision30d,
    revenueRevision90d: null,
    revenueEstimateCurrentFy,
    fiscalPeriodEnd,
    unavailableReason: null,
  };
}

function nearestForwardAnnualRow(
  rows: Array<Record<string, unknown>>,
): Record<string, unknown> | null {
  const now = Date.now();
  let best: Record<string, unknown> | null = null;
  let bestDelta = Infinity;
  for (const row of rows) {
    const date = String(row.date ?? '');
    const t = Date.parse(date);
    if (!Number.isFinite(t)) continue;
    const delta = t - now;
    if (delta >= -180 * 24 * 60 * 60 * 1000 && Math.abs(delta) < bestDelta) {
      best = row;
      bestDelta = Math.abs(delta);
    }
  }
  return best ?? rows[0] ?? null;
}

export async function fetchFmpRevenueRevisionPartial(
  stockCode: string,
  apiKey: string,
): Promise<RevenueRevisionPartial | null> {
  const key = apiKey.trim();
  if (!key) return null;
  const symbol = yahooSymbol(stockCode);
  const encKey = encodeURIComponent(key);

  const [annualJson, quarterJson] = await Promise.all([
    fetchJson(
      `https://financialmodelingprep.com/stable/analyst-estimates?symbol=${encodeURIComponent(symbol)}&period=annual&page=0&limit=4&apikey=${encKey}`,
      'fmp_revenue_revision_annual',
    ),
    fetchJson(
      `https://financialmodelingprep.com/stable/analyst-estimates?symbol=${encodeURIComponent(symbol)}&period=quarter&page=0&limit=8&apikey=${encKey}`,
      'fmp_revenue_revision_quarter',
    ),
  ]);

  const rows: Array<Record<string, unknown>> = [];
  if (Array.isArray(annualJson)) rows.push(...annualJson);
  if (Array.isArray(quarterJson)) rows.push(...quarterJson);
  if (rows.length === 0) return null;

  const target = nearestForwardAnnualRow(rows);
  if (!target) return null;

  const revenue =
    parseNum(target.revenueAvg) ??
    parseNum(target.estimatedRevenueAvg) ??
    parseNum(target.revenueLow);
  const fiscalPeriodEnd = String(target.date ?? '');
  if (revenue == null || !fiscalPeriodEnd) return null;

  recordRevenueEstimateSnapshot({
    stockCode,
    fiscalPeriodEnd,
    revenueEstimate: revenue,
    source: 'fmp',
    observedAt: new Date().toISOString(),
  });

  const fromSnapshot = computeRevisionPctFromSnapshots({
    stockCode,
    fiscalPeriodEnd,
    currentRevenue: revenue,
  });

  if (fromSnapshot.revision30d == null) {
    return {
      source: 'fmp',
      revenueRevision7d: null,
      revenueRevision30d: null,
      revenueRevision90d: null,
      revenueEstimateCurrentFy: revenue,
      fiscalPeriodEnd,
      unavailableReason: 'FMP analyst-estimates — 売上予想のみ（修正率はスナップショット蓄積後）',
    };
  }

  return {
    source: 'estimate_snapshot',
    revenueRevision7d: null,
    revenueRevision30d: fromSnapshot.revision30d,
    revenueRevision90d: null,
    revenueEstimateCurrentFy: revenue,
    fiscalPeriodEnd,
    unavailableReason: null,
  };
}

export async function fetchFinnhubRevenueRevisionPartial(
  stockCode: string,
  apiKey: string,
): Promise<RevenueRevisionPartial | null> {
  const key = apiKey.trim();
  if (!key) return null;
  const symbol = yahooSymbol(stockCode);
  const token = encodeURIComponent(key);

  const revJson = await fetchJson(
    `https://finnhub.io/api/v1/stock/revenue-estimate?symbol=${encodeURIComponent(symbol)}&freq=annual&token=${token}`,
    'finnhub_revenue_revision',
  );

  const data =
    revJson && typeof revJson === 'object' && Array.isArray((revJson as { data?: unknown }).data)
      ? ((revJson as { data: Array<Record<string, unknown>> }).data ?? [])
      : [];

  if (data.length === 0) return null;

  const now = Date.now();
  let target = data[0]!;
  let bestDelta = Infinity;
  for (const row of data) {
    const period = String(row.period ?? '');
    const t = Date.parse(period);
    if (!Number.isFinite(t)) continue;
    const delta = Math.abs(t - now);
    if (t >= now - 180 * 24 * 60 * 60 * 1000 && delta < bestDelta) {
      target = row;
      bestDelta = delta;
    }
  }

  const revenue = parseNum(target.revenueAvg);
  const fiscalPeriodEnd = String(target.period ?? '');
  if (revenue == null || !fiscalPeriodEnd) return null;

  recordRevenueEstimateSnapshot({
    stockCode,
    fiscalPeriodEnd,
    revenueEstimate: revenue,
    source: 'finnhub',
    observedAt: new Date().toISOString(),
  });

  const fromSnapshot = computeRevisionPctFromSnapshots({
    stockCode,
    fiscalPeriodEnd,
    currentRevenue: revenue,
  });

  if (fromSnapshot.revision30d == null) {
    return {
      source: 'finnhub',
      revenueRevision7d: null,
      revenueRevision30d: null,
      revenueRevision90d: null,
      revenueEstimateCurrentFy: revenue,
      fiscalPeriodEnd,
      unavailableReason: 'Finnhub revenue-estimate — 売上予想のみ（修正率はスナップショット蓄積後）',
    };
  }

  return {
    source: 'estimate_snapshot',
    revenueRevision7d: null,
    revenueRevision30d: fromSnapshot.revision30d,
    revenueRevision90d: null,
    revenueEstimateCurrentFy: revenue,
    fiscalPeriodEnd,
    unavailableReason: null,
  };
}

export async function fetchAlphaVantageRevenueRevisionPartial(
  stockCode: string,
  apiKey: string,
): Promise<RevenueRevisionPartial | null> {
  const key = apiKey.trim();
  if (!key) return null;
  const symbol = yahooSymbol(stockCode);

  const earnings = await fetchJson(
    `https://www.alphavantage.co/query?function=EARNINGS&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`,
    'alpha_vantage_earnings_revision',
  );
  if (!earnings || typeof earnings !== 'object') return null;
  const payload = earnings as Record<string, unknown>;
  if (payload.Note || payload.Information || payload['Error Message']) return null;

  const quarterly =
    (payload.quarterlyEarnings as Array<Record<string, unknown>> | undefined) ?? [];
  const forward = quarterly.find((row) => {
    const est = parseNum(row.estimatedEPS);
    const reported = parseNum(row.reportedEPS);
    return est != null && (reported == null || reported === 0);
  });

  const revenue =
    parseNum(forward?.estimatedRevenue) ??
    parseNum(forward?.estimatedRevenueUSD) ??
    parseNum(forward?.revenueEstimate);
  const fiscalPeriodEnd = String(forward?.fiscalDateEnding ?? forward?.reportedDate ?? '');
  if (revenue == null || !fiscalPeriodEnd) return null;

  recordRevenueEstimateSnapshot({
    stockCode,
    fiscalPeriodEnd,
    revenueEstimate: revenue,
    source: 'alpha_vantage',
    observedAt: new Date().toISOString(),
  });

  const fromSnapshot = computeRevisionPctFromSnapshots({
    stockCode,
    fiscalPeriodEnd,
    currentRevenue: revenue,
  });

  if (fromSnapshot.revision30d == null) {
    return {
      source: 'alpha_vantage',
      revenueRevision7d: null,
      revenueRevision30d: null,
      revenueRevision90d: null,
      revenueEstimateCurrentFy: revenue,
      fiscalPeriodEnd,
      unavailableReason: 'Alpha Vantage EARNINGS — 売上予想のみ（修正率はスナップショット蓄積後）',
    };
  }

  return {
    source: 'estimate_snapshot',
    revenueRevision7d: null,
    revenueRevision30d: fromSnapshot.revision30d,
    revenueRevision90d: null,
    revenueEstimateCurrentFy: revenue,
    fiscalPeriodEnd,
    unavailableReason: null,
  };
}

function fillIfMissing<T>(current: T | null, incoming: T | null | undefined): T | null {
  return current ?? incoming ?? null;
}

export function mergeRevenueRevisionPartials(
  partials: RevenueRevisionPartial[],
): RevenueRevisionPartial | null {
  if (partials.length === 0) return null;

  const ordered = [...partials].sort((a, b) => {
    const rank = (s: EarningsRevisionIntelligenceSource) => {
      if (s === 'yahoo_finance') return 0;
      if (s === 'estimate_snapshot') return 1;
      if (s === 'fmp') return 2;
      if (s === 'finnhub') return 3;
      if (s === 'alpha_vantage') return 4;
      return 9;
    };
    return rank(a.source) - rank(b.source);
  });

  const merged: RevenueRevisionPartial = {
    source: ordered[0]!.source,
    revenueRevision7d: null,
    revenueRevision30d: null,
    revenueRevision90d: null,
    revenueEstimateCurrentFy: null,
    fiscalPeriodEnd: null,
    unavailableReason: null,
  };

  for (const p of ordered) {
    if (p.revenueRevision30d != null && merged.revenueRevision30d == null) {
      merged.source = p.source;
    }
    merged.revenueRevision7d = fillIfMissing(merged.revenueRevision7d, p.revenueRevision7d);
    merged.revenueRevision30d = fillIfMissing(merged.revenueRevision30d, p.revenueRevision30d);
    merged.revenueRevision90d = fillIfMissing(merged.revenueRevision90d, p.revenueRevision90d);
    merged.revenueEstimateCurrentFy = fillIfMissing(
      merged.revenueEstimateCurrentFy,
      p.revenueEstimateCurrentFy,
    );
    merged.fiscalPeriodEnd = fillIfMissing(merged.fiscalPeriodEnd, p.fiscalPeriodEnd);
    if (p.unavailableReason && !merged.unavailableReason && merged.revenueRevision30d == null) {
      merged.unavailableReason = p.unavailableReason;
    }
  }

  return merged.revenueRevision30d != null || merged.revenueEstimateCurrentFy != null
    ? merged
    : null;
}

export async function fetchAllRevenueRevisionPartials(input: {
  stockCode: string;
  fetchLiveExternal: boolean;
  apiKeys?: RevenueRevisionApiKeys;
}): Promise<RevenueRevisionPartial | null> {
  if (!input.fetchLiveExternal) return null;

  const partials: RevenueRevisionPartial[] = [];
  const keys = input.apiKeys ?? {};

  const yahoo = await fetchYahooRevenueRevisionPartial(input.stockCode);
  if (yahoo) partials.push(yahoo);

  if (keys.fmpApiKey?.trim()) {
    const fmp = await fetchFmpRevenueRevisionPartial(input.stockCode, keys.fmpApiKey);
    if (fmp) partials.push(fmp);
  }
  if (keys.finnhubApiKey?.trim()) {
    const finnhub = await fetchFinnhubRevenueRevisionPartial(
      input.stockCode,
      keys.finnhubApiKey,
    );
    if (finnhub) partials.push(finnhub);
  }
  if (keys.alphaVantageApiKey?.trim()) {
    const av = await fetchAlphaVantageRevenueRevisionPartial(
      input.stockCode,
      keys.alphaVantageApiKey,
    );
    if (av) partials.push(av);
  }

  return mergeRevenueRevisionPartials(partials);
}

export function applyRevenueRevisionPartialToEarningsPartial<
  T extends {
    revenueRevision30d: number | null;
    revenueEstimateCurrentFy: number | null;
    source: EarningsRevisionIntelligenceSource;
    unavailableReason: string | null;
  },
>(base: T, revenue: RevenueRevisionPartial | null): T {
  if (!revenue) return base;
  return {
    ...base,
    revenueRevision30d: base.revenueRevision30d ?? revenue.revenueRevision30d,
    revenueEstimateCurrentFy:
      base.revenueEstimateCurrentFy ?? revenue.revenueEstimateCurrentFy,
    source:
      base.revenueRevision30d == null && revenue.revenueRevision30d != null
        ? revenue.source
        : base.source,
    unavailableReason:
      revenue.revenueRevision30d != null
        ? base.unavailableReason
        : base.unavailableReason ?? revenue.unavailableReason,
  };
}
