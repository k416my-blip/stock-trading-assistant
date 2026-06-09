/**
 * Yahoo Finance quoteSummary（APIキー不要・実データ）
 */
import type { Market } from '../../types';
import { normalizeYahooSymbol } from '../../utils/normalizeYahooSymbol';
import { fetchHttpWithRetry } from './providerFetchUtil';

const YAHOO_SUMMARY_MODULES = [
  'summaryProfile',
  'financialData',
  'defaultKeyStatistics',
  'incomeStatementHistory',
  'cashflowStatementHistory',
].join(',');

const TIMEOUT_MS = 12_000;

export type YahooFundamentalsResult = {
  ok: boolean;
  yahooSymbol: string;
  requestUrl: string;
  fetched: string[];
  missing: string[];
  companyName: string | null;
  sector: string | null;
  businessDescription: string | null;
  marketCap: number | null;
  dividendYieldPct: number | null;
  pe: number | null;
  eps: number | null;
  revenue: number | null;
  profit: number | null;
  operatingIncome: number | null;
  profitMarginPct: number | null;
  revenueGrowthPct: number | null;
  debtToEquity: number | null;
  freeCashflow: number | null;
  operatingCashflow: number | null;
  errorMessage?: string;
};

type YahooRaw = { raw?: number | null; fmt?: string | null };

function rawNum(v: YahooRaw | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const raw = (v as YahooRaw).raw;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function pctFromDecimal(n: number | null): number | null {
  if (n == null) return null;
  return Math.abs(n) <= 1 ? n * 100 : n;
}

export function buildYahooQuoteSummaryUrl(yahooSymbol: string): string {
  return `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=${YAHOO_SUMMARY_MODULES}`;
}

export function parseYahooQuoteSummaryJson(
  json: unknown,
  yahooSymbol: string,
  requestUrl: string,
): YahooFundamentalsResult {
  const missing: string[] = [];
  const fetched: string[] = [];

  const result = (json as { quoteSummary?: { result?: unknown[] } })?.quoteSummary?.result?.[0] as
    | Record<string, unknown>
    | undefined;

  if (!result) {
    return {
      ok: false,
      yahooSymbol,
      requestUrl,
      fetched: [],
      missing: ['all'],
      companyName: null,
      sector: null,
      businessDescription: null,
      marketCap: null,
      dividendYieldPct: null,
      pe: null,
      eps: null,
      revenue: null,
      profit: null,
      operatingIncome: null,
      profitMarginPct: null,
      revenueGrowthPct: null,
      debtToEquity: null,
      freeCashflow: null,
      operatingCashflow: null,
      errorMessage: 'quoteSummary empty',
    };
  }

  const profile = result.summaryProfile as Record<string, unknown> | undefined;
  const financial = result.financialData as Record<string, unknown> | undefined;
  const stats = result.defaultKeyStatistics as Record<string, unknown> | undefined;
  const incomeHist = result.incomeStatementHistory as
    | { incomeStatementHistory?: Array<Record<string, unknown>> }
    | undefined;
  const latestIncome = incomeHist?.incomeStatementHistory?.[0];

  const companyName = (profile?.longName as string) ?? (profile?.shortName as string) ?? null;
  const sector = (profile?.sector as string) ?? (profile?.industry as string) ?? null;
  const businessDescription = (profile?.longBusinessSummary as string) ?? null;

  if (companyName) fetched.push('companyName');
  else missing.push('companyName');
  if (sector) fetched.push('sector');
  else missing.push('sector');
  if (businessDescription) fetched.push('businessDescription');
  else missing.push('businessDescription');

  const marketCap = rawNum(stats?.marketCap as YahooRaw);
  const pe = rawNum(stats?.trailingPE as YahooRaw);
  const eps = rawNum(stats?.trailingEps as YahooRaw);
  const divRaw = rawNum(stats?.dividendYield as YahooRaw) ?? rawNum(financial?.dividendYield as YahooRaw);
  const dividendYieldPct = pctFromDecimal(divRaw);

  const revenue =
    rawNum(financial?.totalRevenue as YahooRaw) ??
    rawNum(latestIncome?.totalRevenue as YahooRaw);
  const profit =
    rawNum(latestIncome?.netIncome as YahooRaw) ??
    rawNum(financial?.netIncomeToCommon as YahooRaw);
  const operatingIncome =
    rawNum(latestIncome?.ebit as YahooRaw) ?? rawNum(financial?.ebitda as YahooRaw);

  const profitMarginRaw = rawNum(financial?.profitMargins as YahooRaw);
  const profitMarginPct = pctFromDecimal(profitMarginRaw);
  const revenueGrowthPct = pctFromDecimal(rawNum(financial?.revenueGrowth as YahooRaw));
  const debtToEquity = rawNum(financial?.debtToEquity as YahooRaw);
  const freeCashflow = rawNum(financial?.freeCashflow as YahooRaw);
  const operatingCashflow = rawNum(financial?.operatingCashflow as YahooRaw);

  const fieldMap: [string, unknown][] = [
    ['marketCap', marketCap],
    ['pe', pe],
    ['eps', eps],
    ['dividendYield', dividendYieldPct],
    ['revenue', revenue],
    ['profit', profit],
    ['operatingIncome', operatingIncome],
    ['profitMargin', profitMarginPct],
    ['revenueGrowth', revenueGrowthPct],
    ['debtToEquity', debtToEquity],
    ['freeCashflow', freeCashflow],
    ['operatingCashflow', operatingCashflow],
  ];

  for (const [key, val] of fieldMap) {
    if (val != null) fetched.push(key);
    else missing.push(key);
  }

  return {
    ok: fetched.length > 0,
    yahooSymbol,
    requestUrl,
    fetched,
    missing,
    companyName,
    sector,
    businessDescription,
    marketCap,
    dividendYieldPct,
    pe,
    eps,
    revenue,
    profit,
    operatingIncome,
    profitMarginPct,
    revenueGrowthPct,
    debtToEquity,
    freeCashflow,
    operatingCashflow,
  };
}

export async function fetchYahooFinanceFundamentals(
  symbol: string,
  market: Market,
): Promise<YahooFundamentalsResult> {
  const yahooSymbol = normalizeYahooSymbol(symbol, market);
  const requestUrl = buildYahooQuoteSummaryUrl(yahooSymbol);

  try {
    const { response, bodyText } = await fetchHttpWithRetry(requestUrl, {
      timeoutMs: TIMEOUT_MS,
      logLabel: 'yahoo_fundamentals',
      symbol: yahooSymbol,
    });

    if (!response.ok) {
      return {
        ok: false,
        yahooSymbol,
        requestUrl,
        fetched: [],
        missing: ['all'],
        companyName: null,
        sector: null,
        businessDescription: null,
        marketCap: null,
        dividendYieldPct: null,
        pe: null,
        eps: null,
        revenue: null,
        profit: null,
        operatingIncome: null,
        profitMarginPct: null,
        revenueGrowthPct: null,
        debtToEquity: null,
        freeCashflow: null,
        operatingCashflow: null,
        errorMessage: `HTTP ${response.status}`,
      };
    }

    const json = JSON.parse(bodyText) as unknown;
    return parseYahooQuoteSummaryJson(json, yahooSymbol, requestUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      yahooSymbol,
      requestUrl,
      fetched: [],
      missing: ['all'],
      companyName: null,
      sector: null,
      businessDescription: null,
      marketCap: null,
      dividendYieldPct: null,
      pe: null,
      eps: null,
      revenue: null,
      profit: null,
      operatingIncome: null,
      profitMarginPct: null,
      revenueGrowthPct: null,
      debtToEquity: null,
      freeCashflow: null,
      operatingCashflow: null,
      errorMessage: msg,
    };
  }
}
