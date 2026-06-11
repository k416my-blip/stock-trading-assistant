/**
 * Phase20 — Valuation Intelligence データプロバイダー（推測禁止）
 * 優先: Yahoo Finance → Financial Report → Bursa
 */
import type { FinancialReportAnalysis } from '../../types/bursaFinancialReportAnalysis';
import type {
  ValuationIntelligenceSource,
  ValuationMetricKey,
} from '../../types/bursaValuationIntelligence';
import { VALUATION_METRIC_KEYS } from '../../types/bursaValuationIntelligence';
import {
  fetchYahooQuoteSummaryModules,
  parseYahooRawNumber,
} from '../quoteProviders/yahooQuoteSummaryClient';

export type ValuationNumericMetrics = Partial<Record<ValuationMetricKey, number | null>>;

export type ValuationProviderPartial = {
  source: ValuationIntelligenceSource;
  metrics: ValuationNumericMetrics;
  shareBuybackDetected: boolean | null;
};

function yahooSymbol(stockCode: string): string {
  return `${stockCode.replace(/\.KL$/i, '').trim()}.KL`;
}

function pctFromDecimal(n: number | null): number | null {
  if (n == null) return null;
  return Math.abs(n) <= 1 ? n * 100 : n;
}

function safeDivide(num: number | null, den: number | null): number | null {
  if (num == null || den == null || den === 0) return null;
  return num / den;
}

/** Yahoo debtToEquity は % 表記（175.31 = 175.31%）。比率へ正規化。 */
export function normalizeDebtToEquityRatio(raw: number | null): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  return Math.abs(raw) > 5 ? raw / 100 : raw;
}

export async function fetchYahooValuationPartial(
  stockCode: string,
): Promise<ValuationProviderPartial | null> {
  const sym = yahooSymbol(stockCode);
  const res = await fetchYahooQuoteSummaryModules(sym, [
    'financialData',
    'defaultKeyStatistics',
    'summaryDetail',
    'incomeStatementHistory',
    'cashflowStatementHistory',
    'defaultKeyStatistics',
  ]);
  if (!res.ok || !res.json) return null;

  const result = (res.json as { quoteSummary?: { result?: unknown[] } })?.quoteSummary
    ?.result?.[0] as Record<string, unknown> | undefined;
  if (!result) return null;

  const financial = result.financialData as Record<string, unknown> | undefined;
  const stats = result.defaultKeyStatistics as Record<string, unknown> | undefined;
  const summary = result.summaryDetail as Record<string, unknown> | undefined;
  const incomeHist = result.incomeStatementHistory as
    | { incomeStatementHistory?: Array<Record<string, unknown>> }
    | undefined;
  const cashflowHist = result.cashflowStatementHistory as
    | { cashflowStatements?: Array<Record<string, unknown>> }
    | undefined;

  const latestIncome = incomeHist?.incomeStatementHistory?.[0];
  const priorIncome = incomeHist?.incomeStatementHistory?.[1];
  const latestCashflow = cashflowHist?.cashflowStatements?.[0];
  const priorCashflow = cashflowHist?.cashflowStatements?.[1];

  const totalRevenue = parseYahooRawNumber(financial?.totalRevenue as never);
  const freeCashflow = parseYahooRawNumber(financial?.freeCashflow as never);
  const totalCash = parseYahooRawNumber(financial?.totalCash as never);

  const ebit = parseYahooRawNumber(latestIncome?.ebit as never);
  const interestExpense = parseYahooRawNumber(latestIncome?.interestExpense as never);
  const interestCoverage =
    ebit != null && interestExpense != null && interestExpense !== 0
      ? ebit / Math.abs(interestExpense)
      : null;

  const currentLiabilities =
    parseYahooRawNumber(financial?.currentLiabilities as never) ??
    parseYahooRawNumber((financial as Record<string, unknown>)?.totalCurrentLiabilities as never);

  const netIncomeLatest = parseYahooRawNumber(latestIncome?.netIncome as never);
  const netIncomePrior = parseYahooRawNumber(priorIncome?.netIncome as never);
  const netProfitGrowth =
    netIncomeLatest != null && netIncomePrior != null && netIncomePrior !== 0
      ? ((netIncomeLatest - netIncomePrior) / Math.abs(netIncomePrior)) * 100
      : null;

  const fcfLatest = parseYahooRawNumber(latestCashflow?.freeCashflow as never);
  const fcfPrior = parseYahooRawNumber(priorCashflow?.freeCashflow as never);
  const fcfGrowth =
    fcfLatest != null && fcfPrior != null && fcfPrior !== 0
      ? ((fcfLatest - fcfPrior) / Math.abs(fcfPrior)) * 100
      : null;

  const sharesLatest = parseYahooRawNumber(stats?.sharesOutstanding as never);
  const sharesPrior = parseYahooRawNumber(
    (stats as Record<string, unknown>)?.sharesOutstanding as never,
  );
  const shareBuybackDetected =
    sharesLatest != null && sharesPrior != null ? sharesLatest < sharesPrior * 0.995 : null;

  const metrics: ValuationNumericMetrics = {
    roe: pctFromDecimal(parseYahooRawNumber(financial?.returnOnEquity as never)),
    roa: pctFromDecimal(parseYahooRawNumber(financial?.returnOnAssets as never)),
    netMargin: pctFromDecimal(parseYahooRawNumber(financial?.profitMargins as never)),
    operatingMargin: pctFromDecimal(parseYahooRawNumber(financial?.operatingMargins as never)),
    fcfMargin: pctFromDecimal(safeDivide(freeCashflow, totalRevenue)),
    revenueGrowth: pctFromDecimal(parseYahooRawNumber(financial?.revenueGrowth as never)),
    epsGrowth: pctFromDecimal(parseYahooRawNumber(financial?.earningsGrowth as never)),
    netProfitGrowth,
    fcfGrowth,
    pe: parseYahooRawNumber(stats?.trailingPE as never) ?? parseYahooRawNumber(summary?.trailingPE as never),
    forwardPe: parseYahooRawNumber(stats?.forwardPE as never) ?? parseYahooRawNumber(summary?.forwardPE as never),
    pb: parseYahooRawNumber(stats?.priceToBook as never),
    ps: parseYahooRawNumber(stats?.priceToSalesTrailing12Months as never),
    peg: parseYahooRawNumber(stats?.pegRatio as never),
    evEbitda: parseYahooRawNumber(stats?.enterpriseToEbitda as never),
    debtEquity: normalizeDebtToEquityRatio(parseYahooRawNumber(financial?.debtToEquity as never)),
    currentRatio: parseYahooRawNumber(financial?.currentRatio as never),
    interestCoverage,
    cashRatio: safeDivide(totalCash, currentLiabilities),
    dividendYield: pctFromDecimal(
      parseYahooRawNumber(stats?.dividendYield as never) ??
        parseYahooRawNumber(summary?.dividendYield as never),
    ),
    payoutRatio: pctFromDecimal(parseYahooRawNumber(stats?.payoutRatio as never)),
  };

  return {
    source: 'yahoo_finance',
    metrics,
    shareBuybackDetected,
  };
}

export function buildFinancialReportValuationPartial(
  fr: FinancialReportAnalysis | null | undefined,
): ValuationProviderPartial | null {
  if (!fr?.hasExtractableData) return null;
  const metrics: ValuationNumericMetrics = {};
  const rev = fr.extracted.revenueGrowth?.growthPct;
  const profit = fr.extracted.profitGrowth?.growthPct;
  if (rev != null) metrics.revenueGrowth = rev;
  if (profit != null) metrics.netProfitGrowth = profit;
  if (Object.keys(metrics).length === 0) return null;
  return { source: 'financial_report', metrics, shareBuybackDetected: null };
}

export function mergeValuationPartials(
  partials: (ValuationProviderPartial | null | undefined)[],
): {
  metrics: ValuationNumericMetrics;
  fieldSources: Partial<Record<ValuationMetricKey, ValuationIntelligenceSource>>;
  shareBuybackDetected: boolean | null;
  primarySource: ValuationIntelligenceSource;
} {
  const metrics: ValuationNumericMetrics = {};
  const fieldSources: Partial<Record<ValuationMetricKey, ValuationIntelligenceSource>> = {};
  let shareBuybackDetected: boolean | null = null;
  let primarySource: ValuationIntelligenceSource = 'none';

  for (const partial of partials) {
    if (!partial) continue;
    if (primarySource === 'none') primarySource = partial.source;
    for (const key of VALUATION_METRIC_KEYS) {
      if (key === 'shareBuyback') continue;
      const val = partial.metrics[key];
      if (val != null && metrics[key] == null) {
        metrics[key] = val;
        fieldSources[key] = partial.source;
      }
    }
    if (partial.shareBuybackDetected != null && shareBuybackDetected == null) {
      shareBuybackDetected = partial.shareBuybackDetected;
      fieldSources.shareBuyback = partial.source;
    }
  }

  return { metrics, fieldSources, shareBuybackDetected, primarySource };
}

export function countAcquiredValuationFields(
  metrics: ValuationNumericMetrics,
  shareBuybackDetected: boolean | null,
): { acquired: number; total: number; rate: number } {
  let acquired = 0;
  for (const key of VALUATION_METRIC_KEYS) {
    if (key === 'shareBuyback') {
      if (shareBuybackDetected != null) acquired += 1;
      continue;
    }
    if (metrics[key] != null && Number.isFinite(metrics[key] as number)) acquired += 1;
  }
  const total = VALUATION_METRIC_KEYS.length;
  return { acquired, total, rate: total > 0 ? acquired / total : 0 };
}
