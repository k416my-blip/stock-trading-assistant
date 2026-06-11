/**
 * Phase21 / 21.5 — Fair Value Intelligence データプロバイダー（推測禁止）
 * フォールバック順: Yahoo → Financial Report → Bursa → Phase17 Dividend
 */
import type {
  FairValueIntelligenceSource,
  FairValueMetricKey,
} from '../../types/bursaFairValueIntelligence';
import { FAIR_VALUE_METRIC_KEYS } from '../../types/bursaFairValueIntelligence';
import type { BursaDividendIntelligenceAnalysis } from '../../types/bursaDividendIntelligence';
import type {
  BursaCompanyProfile,
  BursaDividendBundle,
  BursaQuarterlyBundle,
} from '../../types/bursaDisclosure';
import type { FinancialReportAnalysis } from '../../types/bursaFinancialReportAnalysis';
import {
  fetchYahooQuoteSummaryModules,
  parseYahooRawNumber,
} from '../quoteProviders/yahooQuoteSummaryClient';

export type FairValueRawInputs = {
  currentPrice: number | null;
  freeCashflow: number | null;
  /** Phase21.5 — OCF を FCF 代理に使用した場合 true */
  freeCashflowIsOperatingProxy: boolean;
  fcfGrowth: number | null;
  earningsGrowth: number | null;
  sharesOutstanding: number | null;
  dividendYield: number | null;
  dividendPerShare: number | null;
  dividendGrowth: number | null;
  trailingEps: number | null;
};

export type FairValueProviderPartial = {
  source: FairValueIntelligenceSource;
  inputs: FairValueRawInputs;
  fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>>;
};

function yahooSymbol(stockCode: string): string {
  return `${stockCode.replace(/\.KL$/i, '').trim()}.KL`;
}

function pctFromDecimal(n: number | null): number | null {
  if (n == null) return null;
  return Math.abs(n) <= 1 ? n * 100 : n;
}

function emptyRawInputs(): FairValueRawInputs {
  return {
    currentPrice: null,
    freeCashflow: null,
    freeCashflowIsOperatingProxy: false,
    fcfGrowth: null,
    earningsGrowth: null,
    sharesOutstanding: null,
    dividendYield: null,
    dividendPerShare: null,
    dividendGrowth: null,
    trailingEps: null,
  };
}

export async function fetchYahooFairValuePartial(
  stockCode: string,
): Promise<FairValueProviderPartial | null> {
  const sym = yahooSymbol(stockCode);
  const res = await fetchYahooQuoteSummaryModules(sym, [
    'financialData',
    'defaultKeyStatistics',
    'summaryDetail',
    'cashflowStatementHistory',
  ]);
  if (!res.ok || !res.json) return null;

  const result = (res.json as { quoteSummary?: { result?: unknown[] } })?.quoteSummary
    ?.result?.[0] as Record<string, unknown> | undefined;
  if (!result) return null;

  const financial = result.financialData as Record<string, unknown> | undefined;
  const stats = result.defaultKeyStatistics as Record<string, unknown> | undefined;
  const summary = result.summaryDetail as Record<string, unknown> | undefined;
  const cashflowHist = result.cashflowStatementHistory as
    | { cashflowStatements?: Array<Record<string, unknown>> }
    | undefined;

  const latestCashflow = cashflowHist?.cashflowStatements?.[0];
  const priorCashflow = cashflowHist?.cashflowStatements?.[1];
  const fcfLatest = parseYahooRawNumber(latestCashflow?.freeCashflow as never);
  const fcfPrior = parseYahooRawNumber(priorCashflow?.freeCashflow as never);
  const ocfLatest = parseYahooRawNumber(latestCashflow?.totalCashFromOperatingActivities as never);
  const fcfGrowth =
    fcfLatest != null && fcfPrior != null && fcfPrior !== 0
      ? ((fcfLatest - fcfPrior) / Math.abs(fcfPrior)) * 100
      : null;

  const earningsGrowth = pctFromDecimal(
    parseYahooRawNumber(financial?.earningsGrowth as never),
  );
  const dividendPerShare =
    parseYahooRawNumber(summary?.dividendRate as never) ??
    parseYahooRawNumber(summary?.trailingAnnualDividendRate as never) ??
    parseYahooRawNumber(stats?.lastDividendValue as never);

  let freeCashflow = parseYahooRawNumber(financial?.freeCashflow as never) ?? fcfLatest;
  let freeCashflowIsOperatingProxy = false;
  if ((freeCashflow == null || freeCashflow <= 0) && ocfLatest != null && ocfLatest > 0) {
    freeCashflow = ocfLatest;
    freeCashflowIsOperatingProxy = true;
  }

  const fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>> = {
    currentPrice: 'yahoo_finance',
    sharesOutstanding: 'yahoo_finance',
  };
  if (freeCashflow != null) fieldSources.freeCashflow = 'yahoo_finance';
  if (fcfGrowth != null) fieldSources.fcfGrowth = 'yahoo_finance';
  else if (earningsGrowth != null) fieldSources.fcfGrowth = 'yahoo_finance';

  const dividendYield = pctFromDecimal(
    parseYahooRawNumber(stats?.dividendYield as never) ??
      parseYahooRawNumber(summary?.dividendYield as never),
  );
  if (dividendYield != null) fieldSources.dividendYield = 'yahoo_finance';

  return {
    source: 'yahoo_finance',
    inputs: {
      currentPrice: parseYahooRawNumber(financial?.currentPrice as never),
      freeCashflow,
      freeCashflowIsOperatingProxy,
      fcfGrowth,
      earningsGrowth,
      sharesOutstanding: parseYahooRawNumber(stats?.sharesOutstanding as never),
      dividendYield,
      dividendPerShare,
      dividendGrowth: null,
      trailingEps: parseYahooRawNumber(stats?.trailingEps as never),
    },
    fieldSources,
  };
}

export function buildFinancialReportFairValuePartial(
  fr: FinancialReportAnalysis | null | undefined,
): FairValueProviderPartial | null {
  if (!fr?.hasExtractableData) return null;

  const profit = fr.extracted.profitGrowth?.growthPct;
  const revenue = fr.extracted.revenueGrowth?.growthPct;
  const fcfGrowth = profit ?? revenue ?? null;

  if (fcfGrowth == null) return null;

  const inputs = emptyRawInputs();
  const fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>> = {};
  inputs.fcfGrowth = fcfGrowth;
  fieldSources.fcfGrowth = 'financial_report';

  return { source: 'financial_report', inputs, fieldSources };
}

export function buildBursaFairValuePartial(input: {
  profile: BursaCompanyProfile | null | undefined;
  quarterly: BursaQuarterlyBundle | null | undefined;
  dividend: BursaDividendBundle | null | undefined;
}): FairValueProviderPartial | null {
  const { profile, quarterly, dividend } = input;
  if (!profile && !quarterly && !dividend) return null;

  const inputs = emptyRawInputs();
  const fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>> = {};

  if (profile?.eps != null && profile.eps > 0) {
    inputs.trailingEps = profile.eps;
    fieldSources.trailingEps = 'bursa_disclosure';
  } else if (quarterly?.latestQuarter?.eps != null && quarterly.latestQuarter.eps > 0) {
    inputs.trailingEps = quarterly.latestQuarter.eps;
    fieldSources.trailingEps = 'bursa_disclosure';
  }

  if (profile?.dividendYieldPct != null && profile.dividendYieldPct > 0) {
    inputs.dividendYield = profile.dividendYieldPct;
    fieldSources.dividendYield = 'bursa_disclosure';
  }

  if (profile?.sharesOutstanding != null && profile.sharesOutstanding > 0) {
    inputs.sharesOutstanding = profile.sharesOutstanding;
    fieldSources.sharesOutstanding = 'bursa_disclosure';
  }

  const latestDiv = dividend?.history?.find((h) => h.amountPerShare != null && h.amountPerShare > 0);
  if (latestDiv?.amountPerShare != null) {
    inputs.dividendPerShare = latestDiv.amountPerShare;
  }

  const quarterlyHistory = quarterly?.quarterlyHistory ?? [];
  if (quarterlyHistory.length >= 2) {
    const newest = quarterlyHistory[0]?.netProfit;
    const prior = quarterlyHistory[1]?.netProfit;
    if (newest != null && prior != null && prior !== 0) {
      inputs.fcfGrowth = ((newest - prior) / Math.abs(prior)) * 100;
      if (fieldSources.fcfGrowth == null) fieldSources.fcfGrowth = 'bursa_disclosure';
    }
  }

  const hasData =
    inputs.trailingEps != null ||
    inputs.dividendYield != null ||
    inputs.sharesOutstanding != null ||
    inputs.dividendPerShare != null ||
    inputs.fcfGrowth != null;
  if (!hasData) return null;

  return { source: 'bursa_disclosure', inputs, fieldSources };
}

export function buildDividendFairValuePartial(
  dividend: BursaDividendIntelligenceAnalysis | null | undefined,
): FairValueProviderPartial | null {
  if (!dividend?.hasExtractableData) return null;

  const yieldFromPhase17 = dividend.dividendYield;

  const inputs = emptyRawInputs();
  inputs.dividendYield = yieldFromPhase17 ?? null;

  const fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>> = {};
  if (yieldFromPhase17 != null) fieldSources.dividendYield = 'phase17_dividend';

  return { source: 'phase17_dividend', inputs, fieldSources };
}

export function mergeFairValueInputs(
  ...partials: (FairValueProviderPartial | null | undefined)[]
): {
  inputs: FairValueRawInputs;
  fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>>;
  primarySource: FairValueIntelligenceSource;
} {
  const inputs = emptyRawInputs();
  const fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>> = {};
  let primarySource: FairValueIntelligenceSource = 'none';

  for (const partial of partials) {
    if (!partial) continue;
    if (primarySource === 'none') primarySource = partial.source;

    if (inputs.currentPrice == null && partial.inputs.currentPrice != null) {
      inputs.currentPrice = partial.inputs.currentPrice;
      fieldSources.currentPrice = partial.fieldSources.currentPrice ?? partial.source;
    }
    if (inputs.freeCashflow == null && partial.inputs.freeCashflow != null) {
      inputs.freeCashflow = partial.inputs.freeCashflow;
      inputs.freeCashflowIsOperatingProxy = partial.inputs.freeCashflowIsOperatingProxy;
      fieldSources.freeCashflow = partial.fieldSources.freeCashflow ?? partial.source;
    }
    if (inputs.fcfGrowth == null && partial.inputs.fcfGrowth != null) {
      inputs.fcfGrowth = partial.inputs.fcfGrowth;
      fieldSources.fcfGrowth = partial.fieldSources.fcfGrowth ?? partial.source;
    }
    if (inputs.earningsGrowth == null && partial.inputs.earningsGrowth != null) {
      inputs.earningsGrowth = partial.inputs.earningsGrowth;
    }
    if (inputs.sharesOutstanding == null && partial.inputs.sharesOutstanding != null) {
      inputs.sharesOutstanding = partial.inputs.sharesOutstanding;
      fieldSources.sharesOutstanding = partial.fieldSources.sharesOutstanding ?? partial.source;
    }
    if (inputs.dividendYield == null && partial.inputs.dividendYield != null) {
      inputs.dividendYield = partial.inputs.dividendYield;
      fieldSources.dividendYield = partial.fieldSources.dividendYield ?? partial.source;
    }
    if (inputs.dividendPerShare == null && partial.inputs.dividendPerShare != null) {
      inputs.dividendPerShare = partial.inputs.dividendPerShare;
    }
    if (inputs.trailingEps == null && partial.inputs.trailingEps != null) {
      inputs.trailingEps = partial.inputs.trailingEps;
      fieldSources.trailingEps = partial.fieldSources.trailingEps ?? partial.source;
    }
    if (inputs.dividendGrowth == null && partial.inputs.dividendGrowth != null) {
      inputs.dividendGrowth = partial.inputs.dividendGrowth;
      fieldSources.dividendGrowth = partial.fieldSources.dividendGrowth ?? partial.source;
    }
  }

  return { inputs, fieldSources, primarySource };
}

export async function fetchAllFairValuePartials(input: {
  stockCode: string;
  dividendIntelligence?: BursaDividendIntelligenceAnalysis | null;
  financialReportAnalysis?: FinancialReportAnalysis | null;
  bursaProfile?: BursaCompanyProfile | null;
  bursaQuarterly?: BursaQuarterlyBundle | null;
  bursaDividend?: BursaDividendBundle | null;
}): Promise<{
  yahoo: FairValueProviderPartial | null;
  financialReport: FairValueProviderPartial | null;
  bursa: FairValueProviderPartial | null;
  dividend: FairValueProviderPartial | null;
  merged: ReturnType<typeof mergeFairValueInputs>;
}> {
  const yahoo = await fetchYahooFairValuePartial(input.stockCode);
  const financialReport = buildFinancialReportFairValuePartial(input.financialReportAnalysis);
  const bursa = buildBursaFairValuePartial({
    profile: input.bursaProfile,
    quarterly: input.bursaQuarterly,
    dividend: input.bursaDividend,
  });
  const dividend = buildDividendFairValuePartial(input.dividendIntelligence);
  const merged = mergeFairValueInputs(yahoo, financialReport, bursa, dividend);
  return { yahoo, financialReport, bursa, dividend, merged };
}

export function countAcquiredFairValueFields(input: {
  inputs: FairValueRawInputs;
  dcfFairPrice: number | null;
  ddmFairPrice: number | null;
  perFairPrice: number | null;
  isDividendStock: boolean;
}): { acquired: number; total: number; rate: number } {
  let acquired = 0;
  const coreKeys: FairValueMetricKey[] = [
    'currentPrice',
    'freeCashflow',
    'fcfGrowth',
    'sharesOutstanding',
  ];
  for (const key of coreKeys) {
    if (key === 'fcfGrowth') {
      const hasGrowth = input.inputs.fcfGrowth != null || input.inputs.earningsGrowth != null;
      if (hasGrowth) acquired += 1;
      continue;
    }
    const v = input.inputs[key as keyof FairValueRawInputs];
    if (v != null && Number.isFinite(v as number)) acquired += 1;
  }
  if (input.dcfFairPrice != null) acquired += 1;
  if (input.perFairPrice != null) acquired += 1;
  if (input.isDividendStock) {
    if (input.inputs.dividendYield != null) acquired += 1;
    if (input.inputs.dividendGrowth != null) acquired += 1;
    if (input.ddmFairPrice != null) acquired += 1;
  }
  const total = input.isDividendStock ? FAIR_VALUE_METRIC_KEYS.length : 6;
  return { acquired, total, rate: total > 0 ? acquired / total : 0 };
}
