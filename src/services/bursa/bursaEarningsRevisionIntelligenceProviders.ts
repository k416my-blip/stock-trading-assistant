/**
 * Phase23 — Earnings Revision Intelligence データプロバイダー（推測禁止）
 * 優先順位: Yahoo earningsTrend/recommendationTrend → Phase14 Analyst Consensus → Bursa FR → 未取得
 */
import type { BursaAnalystConsensusAnalysis } from '../../types/bursaAnalystConsensus';
import type { FinancialReportAnalysis } from '../../types/bursaFinancialReportAnalysis';
import type { EarningsRevisionIntelligenceSource } from '../../types/bursaEarningsRevisionIntelligence';
import {
  fetchYahooQuoteSummaryModules,
  parseYahooRawNumber,
} from '../quoteProviders/yahooQuoteSummaryClient';

export type EarningsRevisionPartial = {
  source: EarningsRevisionIntelligenceSource;
  epsEstimateCurrentFy: number | null;
  epsEstimateNextFy: number | null;
  epsRevision7d: number | null;
  epsRevision30d: number | null;
  epsRevision90d: number | null;
  revenueEstimateCurrentFy: number | null;
  revenueEstimateNextFy: number | null;
  revenueRevision30d: number | null;
  netProfitEstimateCurrentFy: number | null;
  netProfitRevision30d: number | null;
  upgradeCount: number | null;
  downgradeCount: number | null;
  unavailableReason: string | null;
};

function yahooSymbol(stockCode: string): string {
  return `${stockCode.replace(/\.KL$/i, '').trim()}.KL`;
}

function revisionPct(current: number | null, ago: number | null): number | null {
  if (current == null || ago == null || ago === 0) return null;
  return ((current - ago) / Math.abs(ago)) * 100;
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

function parseRevisions(row: Record<string, unknown> | undefined): {
  upgradeCount: number | null;
  downgradeCount: number | null;
} {
  if (!row) return { upgradeCount: null, downgradeCount: null };
  const up30 = parseYahooRawNumber(row.upLast30days as { raw?: number });
  const down30 = parseYahooRawNumber(row.downLast30days as { raw?: number });
  if (up30 == null && down30 == null) return { upgradeCount: null, downgradeCount: null };
  return {
    upgradeCount: up30 ?? 0,
    downgradeCount: down30 ?? 0,
  };
}

function parseNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number.parseFloat(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function recommendationUpgradeDowngrade(
  trend: Array<Record<string, unknown>> | undefined,
): { upgradeCount: number | null; downgradeCount: number | null } {
  const current = trend?.[0];
  const prior = trend?.[1];
  if (!current || !prior) return { upgradeCount: null, downgradeCount: null };
  const bullish = (row: Record<string, unknown>) =>
    (parseNum(row.strongBuy) ?? 0) + (parseNum(row.buy) ?? 0);
  const bearish = (row: Record<string, unknown>) =>
    (parseNum(row.sell) ?? 0) + (parseNum(row.strongSell) ?? 0);
  const curB = bullish(current);
  const curS = bearish(current);
  const priorB = bullish(prior);
  const priorS = bearish(prior);
  const up = Math.max(0, curB - priorB);
  const down = Math.max(0, curS - priorS);
  if (up === 0 && down === 0) return { upgradeCount: 0, downgradeCount: 0 };
  return { upgradeCount: up, downgradeCount: down };
}

export async function fetchYahooEarningsRevision(
  stockCode: string,
): Promise<EarningsRevisionPartial | null> {
  const symbol = yahooSymbol(stockCode);
  const fetched = await fetchYahooQuoteSummaryModules(symbol, [
    'earningsTrend',
    'recommendationTrend',
  ]);
  if (!fetched.ok || !fetched.json) return null;

  const result = (fetched.json as { quoteSummary?: { result?: Array<Record<string, unknown>> } })
    .quoteSummary?.result?.[0];
  if (!result) return null;

  let epsEstimateCurrentFy: number | null = null;
  let epsEstimateNextFy: number | null = null;
  let revenueEstimateCurrentFy: number | null = null;
  let revenueEstimateNextFy: number | null = null;
  let epsRevision7d: number | null = null;
  let epsRevision30d: number | null = null;
  let epsRevision90d: number | null = null;
  let revenueRevision30d: number | null = null;
  let upgradeCount: number | null = null;
  let downgradeCount: number | null = null;

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
      if (epsAvg != null) epsEstimateCurrentFy = epsAvg;
      if (revAvg != null) revenueEstimateCurrentFy = revAvg;
      const epsTrend = parseTrendRow(row.epsTrend as Record<string, unknown> | undefined);
      epsRevision7d = revisionPct(epsTrend.current, epsTrend.d7);
      epsRevision30d = revisionPct(epsTrend.current, epsTrend.d30);
      epsRevision90d = revisionPct(epsTrend.current, epsTrend.d90);
      const revTrend = parseTrendRow(row.revenueTrend as Record<string, unknown> | undefined);
      revenueRevision30d = revisionPct(revTrend.current, revTrend.d30);
      const rev = parseRevisions(row.epsRevisions as Record<string, unknown> | undefined);
      upgradeCount = rev.upgradeCount;
      downgradeCount = rev.downgradeCount;
    }
    if (period === '+1y') {
      if (epsAvg != null) epsEstimateNextFy = epsAvg;
      if (revAvg != null) revenueEstimateNextFy = revAvg;
    }
  }

  if (upgradeCount == null && downgradeCount == null) {
    const recTrend = (result.recommendationTrend as { trend?: Array<Record<string, unknown>> } | undefined)
      ?.trend;
    const rec = recommendationUpgradeDowngrade(recTrend);
    upgradeCount = rec.upgradeCount;
    downgradeCount = rec.downgradeCount;
  }

  const hasAny =
    epsEstimateCurrentFy != null ||
    epsRevision30d != null ||
    epsRevision90d != null ||
    revenueEstimateCurrentFy != null ||
    upgradeCount != null ||
    downgradeCount != null;

  if (!hasAny) return null;

  return {
    source: 'yahoo_finance',
    epsEstimateCurrentFy,
    epsEstimateNextFy,
    epsRevision7d,
    epsRevision30d,
    epsRevision90d,
    revenueEstimateCurrentFy,
    revenueEstimateNextFy,
    revenueRevision30d,
    netProfitEstimateCurrentFy: null,
    netProfitRevision30d: null,
    upgradeCount,
    downgradeCount,
    unavailableReason: null,
  };
}

export function buildEarningsRevisionFromAnalystConsensus(
  consensus: BursaAnalystConsensusAnalysis | null | undefined,
): EarningsRevisionPartial | null {
  if (!consensus || consensus.availability !== 'available') return null;

  const epsEstimateCurrentFy = consensus.epsForecast?.currentFy ?? null;
  const epsEstimateNextFy = consensus.epsForecast?.nextFy ?? null;
  const revenueEstimateCurrentFy = consensus.revenueForecast?.currentFy ?? null;
  const revenueEstimateNextFy = consensus.revenueForecast?.nextFy ?? null;

  const hasEstimate =
    epsEstimateCurrentFy != null ||
    epsEstimateNextFy != null ||
    revenueEstimateCurrentFy != null ||
    revenueEstimateNextFy != null;

  if (!hasEstimate) return null;

  return {
    source: 'analyst_consensus',
    epsEstimateCurrentFy,
    epsEstimateNextFy,
    epsRevision7d: null,
    epsRevision30d: null,
    epsRevision90d: null,
    revenueEstimateCurrentFy,
    revenueEstimateNextFy,
    revenueRevision30d: null,
    netProfitEstimateCurrentFy: null,
    netProfitRevision30d: null,
    upgradeCount: null,
    downgradeCount: null,
    unavailableReason:
      'Phase14 Analyst Consensus — EPS/売上予想のみ（修正率・Upgrade/Downgrade は Yahoo 未取得）',
  };
}

export function buildEarningsRevisionFromFinancialReport(
  report: FinancialReportAnalysis | null | undefined,
): EarningsRevisionPartial | null {
  if (!report?.hasExtractableData) return null;
  // Bursa/KLSE FR は過去実績成長のみ — 前方予想修正は推測禁止のため使用しない
  return null;
}

function fillIfMissing<T>(current: T | null, incoming: T | null | undefined): T | null {
  return current ?? incoming ?? null;
}

export function mergeEarningsRevisionPartials(
  partials: EarningsRevisionPartial[],
): EarningsRevisionPartial | null {
  if (partials.length === 0) return null;

  const ordered = [...partials].sort((a, b) => {
    const rank = (s: EarningsRevisionIntelligenceSource) => {
      if (s === 'yahoo_finance') return 0;
      if (s === 'analyst_consensus') return 1;
      if (s === 'bursa_financial_report') return 2;
      return 3;
    };
    return rank(a.source) - rank(b.source);
  });

  const merged: EarningsRevisionPartial = {
    source: ordered[0].source,
    epsEstimateCurrentFy: null,
    epsEstimateNextFy: null,
    epsRevision7d: null,
    epsRevision30d: null,
    epsRevision90d: null,
    revenueEstimateCurrentFy: null,
    revenueEstimateNextFy: null,
    revenueRevision30d: null,
    netProfitEstimateCurrentFy: null,
    netProfitRevision30d: null,
    upgradeCount: null,
    downgradeCount: null,
    unavailableReason: null,
  };

  for (const p of ordered) {
    merged.epsEstimateCurrentFy = fillIfMissing(merged.epsEstimateCurrentFy, p.epsEstimateCurrentFy);
    merged.epsEstimateNextFy = fillIfMissing(merged.epsEstimateNextFy, p.epsEstimateNextFy);
    merged.epsRevision7d = fillIfMissing(merged.epsRevision7d, p.epsRevision7d);
    merged.epsRevision30d = fillIfMissing(merged.epsRevision30d, p.epsRevision30d);
    merged.epsRevision90d = fillIfMissing(merged.epsRevision90d, p.epsRevision90d);
    merged.revenueEstimateCurrentFy = fillIfMissing(
      merged.revenueEstimateCurrentFy,
      p.revenueEstimateCurrentFy,
    );
    merged.revenueEstimateNextFy = fillIfMissing(merged.revenueEstimateNextFy, p.revenueEstimateNextFy);
    merged.revenueRevision30d = fillIfMissing(merged.revenueRevision30d, p.revenueRevision30d);
    merged.netProfitEstimateCurrentFy = fillIfMissing(
      merged.netProfitEstimateCurrentFy,
      p.netProfitEstimateCurrentFy,
    );
    merged.netProfitRevision30d = fillIfMissing(
      merged.netProfitRevision30d,
      p.netProfitRevision30d,
    );
    merged.upgradeCount = fillIfMissing(merged.upgradeCount, p.upgradeCount);
    merged.downgradeCount = fillIfMissing(merged.downgradeCount, p.downgradeCount);
    if (p.unavailableReason && !merged.unavailableReason) {
      merged.unavailableReason = p.unavailableReason;
    }
  }

  const hasAny =
    merged.epsEstimateCurrentFy != null ||
    merged.epsRevision30d != null ||
    merged.epsRevision90d != null ||
    merged.revenueEstimateCurrentFy != null ||
    merged.upgradeCount != null ||
    merged.downgradeCount != null;

  return hasAny ? merged : null;
}

export async function fetchAllEarningsRevisionPartials(input: {
  stockCode: string;
  analystConsensus?: BursaAnalystConsensusAnalysis | null;
  financialReport?: FinancialReportAnalysis | null;
  fetchLiveExternal: boolean;
}): Promise<EarningsRevisionPartial | null> {
  const partials: EarningsRevisionPartial[] = [];

  if (input.fetchLiveExternal) {
    const yahoo = await fetchYahooEarningsRevision(input.stockCode);
    if (yahoo) partials.push(yahoo);
  }

  const fromConsensus = buildEarningsRevisionFromAnalystConsensus(input.analystConsensus);
  if (fromConsensus) partials.push(fromConsensus);

  const fromFr = buildEarningsRevisionFromFinancialReport(input.financialReport);
  if (fromFr) partials.push(fromFr);

  return mergeEarningsRevisionPartials(partials);
}
