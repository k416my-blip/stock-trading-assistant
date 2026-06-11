/**
 * Phase22 — Analyst Target Intelligence データプロバイダー（推測禁止）
 * 優先順位: Yahoo Finance → Analyst Consensus（Phase14）→ 未取得
 */
import type { BursaAnalystConsensusAnalysis } from '../../types/bursaAnalystConsensus';
import type {
  AnalystTargetIntelligenceSource,
  RecommendationDistribution,
  TargetRevisionTrend,
} from '../../types/bursaAnalystTargetIntelligence';
import type { ConsensusTrendLabel } from '../../types/bursaAnalystConsensus';
import {
  fetchYahooQuoteSummaryModules,
  parseYahooRawNumber,
} from '../quoteProviders/yahooQuoteSummaryClient';
import { buildYahooChartUrl } from '../quoteProviders/yahooFinanceQuote';
import { defaultQuoteFetchHeaders, fetchHttpWithRetry } from '../quoteProviders/providerFetchUtil';

export type AnalystTargetPartial = {
  source: AnalystTargetIntelligenceSource;
  targetMedian: number | null;
  targetMean: number | null;
  bullCaseTarget: number | null;
  bearCaseTarget: number | null;
  coverageCount: number | null;
  currentPrice: number | null;
  targetRevisionTrend: TargetRevisionTrend | null;
  recommendationDistribution: RecommendationDistribution | null;
};

function yahooSymbol(stockCode: string): string {
  return `${stockCode.replace(/\.KL$/i, '').trim()}.KL`;
}

function parseNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number.parseFloat(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function countsFromRow(row: Record<string, unknown>): RecommendationDistribution | null {
  const strongBuy = parseNum(row.strongBuy) ?? 0;
  const buy = parseNum(row.buy) ?? 0;
  const hold = parseNum(row.hold) ?? 0;
  const sell = parseNum(row.sell) ?? 0;
  const strongSell = parseNum(row.strongSell) ?? 0;
  const total = strongBuy + buy + hold + sell + strongSell;
  if (total <= 0) return null;
  return { strongBuy, buy, hold, reduce: sell, sell: strongSell };
}

function mapConsensusTrendToRevision(
  trend: ConsensusTrendLabel | null,
): TargetRevisionTrend | null {
  if (!trend) return null;
  if (trend === 'Upgraded') return 'Upgrade';
  if (trend === 'Downgraded') return 'Downgrade';
  return 'Stable';
}

function deriveRevisionTrend(
  current: RecommendationDistribution,
  prior: RecommendationDistribution | null,
): TargetRevisionTrend | null {
  if (!prior) return null;
  const bullish = (d: RecommendationDistribution) => d.strongBuy + d.buy;
  const bearish = (d: RecommendationDistribution) => d.reduce + d.sell;
  const curNet = bullish(current) - bearish(current);
  const priorNet = bullish(prior) - bearish(prior);
  if (curNet > priorNet + 1) return 'Upgrade';
  if (curNet < priorNet - 1) return 'Downgrade';
  return 'Stable';
}

async function fetchYahooCurrentPrice(stockCode: string): Promise<number | null> {
  const symbol = yahooSymbol(stockCode);
  try {
    const res = await fetchHttpWithRetry(buildYahooChartUrl(symbol), {
      timeoutMs: 10_000,
      logLabel: 'yahoo_price_for_analyst_target',
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

export async function fetchYahooAnalystTarget(
  stockCode: string,
): Promise<AnalystTargetPartial | null> {
  const symbol = yahooSymbol(stockCode);
  const fetched = await fetchYahooQuoteSummaryModules(symbol, [
    'financialData',
    'recommendationTrend',
    'price',
  ]);
  if (!fetched.ok || !fetched.json) return null;

  const result = (fetched.json as { quoteSummary?: { result?: Array<Record<string, unknown>> } })
    .quoteSummary?.result?.[0];
  if (!result) return null;

  const financial = (result.financialData ?? {}) as Record<string, unknown>;
  const targetMean = parseYahooRawNumber(financial.targetMeanPrice as { raw?: number });
  const targetMedian = parseYahooRawNumber(financial.targetMedianPrice as { raw?: number });
  const bullCaseTarget = parseYahooRawNumber(financial.targetHighPrice as { raw?: number });
  const bearCaseTarget = parseYahooRawNumber(financial.targetLowPrice as { raw?: number });

  const recTrend = (result.recommendationTrend as { trend?: Array<Record<string, unknown>> } | undefined)
    ?.trend;
  const currentRow = recTrend?.[0];
  const priorRow = recTrend?.[1];
  const recommendationDistribution = currentRow ? countsFromRow(currentRow) : null;
  const priorDistribution = priorRow ? countsFromRow(priorRow) : null;
  const targetRevisionTrend = recommendationDistribution
    ? deriveRevisionTrend(recommendationDistribution, priorDistribution)
    : null;

  let coverageCount = parseYahooRawNumber(financial.numberOfAnalystOpinions as { raw?: number });
  if (coverageCount == null && recommendationDistribution) {
    coverageCount =
      recommendationDistribution.strongBuy +
      recommendationDistribution.buy +
      recommendationDistribution.hold +
      recommendationDistribution.reduce +
      recommendationDistribution.sell;
  }

  const priceModule = (result.price ?? {}) as Record<string, unknown>;
  let currentPrice =
    parseYahooRawNumber(priceModule.regularMarketPrice as { raw?: number }) ??
    parseYahooRawNumber(financial.currentPrice as { raw?: number });
  if (currentPrice == null) {
    currentPrice = await fetchYahooCurrentPrice(stockCode);
  }

  const hasTarget =
    targetMedian != null ||
    targetMean != null ||
    bullCaseTarget != null ||
    bearCaseTarget != null;
  if (!hasTarget && coverageCount == null && !recommendationDistribution) return null;

  return {
    source: 'yahoo_finance',
    targetMedian,
    targetMean,
    bullCaseTarget,
    bearCaseTarget,
    coverageCount: coverageCount != null ? Math.round(coverageCount) : null,
    currentPrice,
    targetRevisionTrend,
    recommendationDistribution,
  };
}

export function buildAnalystTargetFromConsensus(
  consensus: BursaAnalystConsensusAnalysis | null | undefined,
): AnalystTargetPartial | null {
  if (!consensus || consensus.availability !== 'available') return null;

  const targetMean = consensus.averageTargetPrice;
  const recommendationDistribution: RecommendationDistribution | null = consensus.ratingCounts
    ? {
        strongBuy: consensus.ratingCounts.strongBuy,
        buy: consensus.ratingCounts.buy,
        hold: consensus.ratingCounts.hold,
        reduce: consensus.ratingCounts.sell,
        sell: consensus.ratingCounts.strongSell,
      }
    : null;

  const hasData =
    targetMean != null ||
    (consensus.ratingCounts?.analystCount ?? 0) > 0 ||
    recommendationDistribution != null;
  if (!hasData) return null;

  return {
    source: 'analyst_consensus',
    targetMedian: targetMean,
    targetMean,
    bullCaseTarget: null,
    bearCaseTarget: null,
    coverageCount: consensus.ratingCounts?.analystCount ?? null,
    currentPrice: consensus.currentPrice,
    targetRevisionTrend: mapConsensusTrendToRevision(consensus.consensusTrend),
    recommendationDistribution,
  };
}

export function mergeAnalystTargetPartials(
  partials: AnalystTargetPartial[],
): AnalystTargetPartial | null {
  if (partials.length === 0) return null;

  const merged: AnalystTargetPartial = {
    source: partials[0]!.source,
    targetMedian: null,
    targetMean: null,
    bullCaseTarget: null,
    bearCaseTarget: null,
    coverageCount: null,
    currentPrice: null,
    targetRevisionTrend: null,
    recommendationDistribution: null,
  };

  for (const p of partials) {
    if (merged.targetMedian == null && p.targetMedian != null) {
      merged.targetMedian = p.targetMedian;
      if (p.source === 'yahoo_finance') merged.source = 'yahoo_finance';
    }
    if (merged.targetMean == null && p.targetMean != null) {
      merged.targetMean = p.targetMean;
      if (p.source === 'yahoo_finance') merged.source = 'yahoo_finance';
    }
    if (merged.bullCaseTarget == null && p.bullCaseTarget != null) {
      merged.bullCaseTarget = p.bullCaseTarget;
      if (p.source === 'yahoo_finance') merged.source = 'yahoo_finance';
    }
    if (merged.bearCaseTarget == null && p.bearCaseTarget != null) {
      merged.bearCaseTarget = p.bearCaseTarget;
      if (p.source === 'yahoo_finance') merged.source = 'yahoo_finance';
    }
    if (merged.coverageCount == null && p.coverageCount != null) {
      merged.coverageCount = p.coverageCount;
    }
    if (merged.currentPrice == null && p.currentPrice != null) {
      merged.currentPrice = p.currentPrice;
    }
    if (!merged.targetRevisionTrend && p.targetRevisionTrend) {
      merged.targetRevisionTrend = p.targetRevisionTrend;
    }
    if (!merged.recommendationDistribution && p.recommendationDistribution) {
      merged.recommendationDistribution = p.recommendationDistribution;
    }
  }

  const hasData =
    merged.targetMedian != null ||
    merged.targetMean != null ||
    merged.bullCaseTarget != null ||
    merged.bearCaseTarget != null ||
    (merged.coverageCount ?? 0) > 0;
  return hasData ? merged : null;
}

export async function fetchAllAnalystTargetPartials(input: {
  stockCode: string;
  analystConsensus?: BursaAnalystConsensusAnalysis | null;
  fetchLiveExternal: boolean;
}): Promise<AnalystTargetPartial | null> {
  const partials: AnalystTargetPartial[] = [];

  if (input.fetchLiveExternal) {
    const yahoo = await fetchYahooAnalystTarget(input.stockCode);
    if (yahoo) partials.push(yahoo);
  }

  const fromConsensus = buildAnalystTargetFromConsensus(input.analystConsensus);
  if (fromConsensus) partials.push(fromConsensus);

  return mergeAnalystTargetPartials(partials);
}

export function countAcquiredAnalystTargetFields(partial: AnalystTargetPartial): number {
  let count = 0;
  if (partial.targetMedian != null) count++;
  if (partial.targetMean != null) count++;
  if (partial.bullCaseTarget != null) count++;
  if (partial.bearCaseTarget != null) count++;
  if (partial.coverageCount != null && partial.coverageCount > 0) count++;
  if (partial.currentPrice != null && partial.currentPrice > 0) count++;
  const refTarget = partial.targetMedian ?? partial.targetMean;
  if (
    refTarget != null &&
    partial.currentPrice != null &&
    partial.currentPrice > 0
  ) {
    count++;
    if (partial.bearCaseTarget != null) count++;
  }
  if (partial.targetRevisionTrend != null) count++;
  if (partial.recommendationDistribution != null) count++;
  return count;
}
