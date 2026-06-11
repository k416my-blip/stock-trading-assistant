/**
 * Phase17.5 — Dividend Intelligence 外部プロバイダー（推測禁止）
 * 優先: Yahoo → FMP → Alpha Vantage → KLSE
 */
import type { BursaDividendRecord } from '../../types/bursaDisclosure';
import type { DividendIntelligenceSource } from '../../types/bursaDividendIntelligence';
import {
  defaultQuoteFetchHeaders,
  fetchHttpWithRetry,
} from '../quoteProviders/providerFetchUtil';
import {
  fetchYahooQuoteSummaryModules,
  parseYahooRawNumber,
} from '../quoteProviders/yahooQuoteSummaryClient';

const TIMEOUT_MS = 12_000;

export type DividendFieldKey =
  | 'dividendYield'
  | 'payoutRatio'
  | 'fiveYearCagr'
  | 'exDividendDate'
  | 'paymentDate'
  | 'dividendFrequency'
  | 'specialDividend';

export type DividendProviderFields = {
  dividendYield: number | null;
  payoutRatio: number | null;
  fiveYearCagr: number | null;
  exDividendDate: string | null;
  paymentDate: string | null;
  dividendFrequency: string | null;
  specialDividend: boolean | null;
  dividendHistory: BursaDividendRecord[];
};

export type DividendProviderPartial = {
  source: DividendIntelligenceSource;
  fields: Partial<DividendProviderFields>;
};

export type DividendApiKeys = {
  fmpApiKey: string;
  alphaVantageApiKey: string;
};

function yahooSymbol(stockCode: string): string {
  return `${stockCode.replace(/\.KL$/i, '').trim()}.KL`;
}

function parseNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number.parseFloat(v.replace(/,/g, '').replace(/%$/, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pctFromDecimal(n: number | null): number | null {
  if (n == null) return null;
  return Math.abs(n) <= 1 ? n * 100 : n;
}

function parseIsoDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const iso = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1]! : null;
}

function inferFrequencyFromHistory(history: BursaDividendRecord[]): string | null {
  const currentYear = new Date().getFullYear();
  const recent = history.filter((d) => {
    const y = Number.parseInt((d.financialYear ?? '').slice(0, 4), 10);
    return (y >= currentYear - 1 || y === 0) && (d.amountPerShare ?? 0) > 0;
  }).length;
  if (recent <= 0) return null;
  if (recent >= 3 && recent <= 5) return '年4回';
  if (recent === 2) return '年2回';
  if (recent === 1) return '年1回';
  return null;
}

function computeCagrFromHistory(history: BursaDividendRecord[]): number | null {
  const yearly = new Map<number, number>();
  for (const d of history) {
    const y = Number.parseInt((d.financialYear ?? d.announcedDate ?? '').slice(0, 4), 10);
    const amt = d.amountPerShare;
    if (!Number.isFinite(y) || y < 1990 || amt == null || amt <= 0) continue;
    yearly.set(y, (yearly.get(y) ?? 0) + amt);
  }
  const vals = [...yearly.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  const slice = vals.slice(-5).filter((v) => v > 0);
  if (slice.length < 2) return null;
  const first = slice[0]!;
  const last = slice[slice.length - 1]!;
  const years = slice.length - 1;
  if (first <= 0 || years <= 0) return null;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
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

export async function fetchYahooDividendPartial(stockCode: string): Promise<DividendProviderPartial | null> {
  const symbol = yahooSymbol(stockCode);
  const fetched = await fetchYahooQuoteSummaryModules(symbol, [
    'summaryDetail',
    'defaultKeyStatistics',
    'financialData',
    'calendarEvents',
  ]);
  if (!fetched.ok || !fetched.json) return null;

  const result = (fetched.json as { quoteSummary?: { result?: Array<Record<string, unknown>> } })
    .quoteSummary?.result?.[0];
  if (!result) return null;

  const summary = (result.summaryDetail ?? {}) as Record<string, unknown>;
  const stats = (result.defaultKeyStatistics ?? {}) as Record<string, unknown>;
  const financial = (result.financialData ?? {}) as Record<string, unknown>;
  const calendar = (result.calendarEvents ?? {}) as Record<string, unknown>;

  const dividendYield =
    pctFromDecimal(parseYahooRawNumber(stats.dividendYield as { raw?: number })) ??
    pctFromDecimal(parseYahooRawNumber(financial.dividendYield as { raw?: number })) ??
    pctFromDecimal(parseYahooRawNumber(summary.dividendYield as { raw?: number }));

  const payoutRatio =
    pctFromDecimal(parseYahooRawNumber(summary.payoutRatio as { raw?: number })) ??
    pctFromDecimal(parseYahooRawNumber(financial.payoutRatio as { raw?: number }));

  const exDividendDate =
    parseIsoDate(String(summary.exDividendDate ?? '')) ??
    parseIsoDate(
      String(
        (calendar.exDividendDate as { fmt?: string } | undefined)?.fmt ??
          calendar.exDividendDate ??
          '',
      ),
    );

  if (
    dividendYield == null &&
    payoutRatio == null &&
    exDividendDate == null
  ) {
    return null;
  }

  return {
    source: 'yahoo_finance',
    fields: {
      dividendYield,
      payoutRatio,
      exDividendDate,
    },
  };
}

export async function fetchFmpDividendPartial(
  stockCode: string,
  apiKey: string,
): Promise<DividendProviderPartial | null> {
  const key = apiKey.trim();
  if (!key) return null;
  const symbol = encodeURIComponent(yahooSymbol(stockCode));
  const encKey = encodeURIComponent(key);

  const [metricsJson, ratiosJson, divJson] = await Promise.all([
    fetchJson(
      `https://financialmodelingprep.com/stable/key-metrics?symbol=${symbol}&apikey=${encKey}`,
      'fmp_key_metrics',
    ),
    fetchJson(
      `https://financialmodelingprep.com/stable/ratios?symbol=${symbol}&apikey=${encKey}`,
      'fmp_ratios',
    ),
    fetchJson(
      `https://financialmodelingprep.com/stable/dividends?symbol=${symbol}&apikey=${encKey}`,
      'fmp_dividends',
    ),
  ]);

  let dividendYield: number | null = null;
  let payoutRatio: number | null = null;
  if (Array.isArray(metricsJson) && metricsJson[0]) {
    const row = metricsJson[0] as Record<string, unknown>;
    dividendYield =
      pctFromDecimal(parseNum(row.dividendYield)) ??
      pctFromDecimal(parseNum(row.dividendYieldPercentage));
    payoutRatio = pctFromDecimal(parseNum(row.payoutRatio));
  }
  if (payoutRatio == null && Array.isArray(ratiosJson) && ratiosJson[0]) {
    const row = ratiosJson[0] as Record<string, unknown>;
    payoutRatio = pctFromDecimal(parseNum(row.payoutRatio));
    if (dividendYield == null) {
      dividendYield = pctFromDecimal(parseNum(row.dividendYield));
    }
  }

  const history: BursaDividendRecord[] = [];
  if (Array.isArray(divJson)) {
    for (const row of divJson as Array<Record<string, unknown>>) {
      const amount = parseNum(row.adjDividend) ?? parseNum(row.dividend);
      if (amount == null || amount <= 0) continue;
      history.push({
        announcedDate: parseIsoDate(String(row.date ?? row.recordDate ?? '')),
        financialYear: String(row.date ?? '').slice(0, 4) || null,
        dividendType: String(row.label ?? row.type ?? ''),
        exDate: parseIsoDate(String(row.date ?? '')),
        paymentDate: parseIsoDate(String(row.paymentDate ?? '')),
        amountPerShare: amount,
      });
    }
  }

  const exDividendDate = history[0]?.exDate ?? null;
  const paymentDate = history[0]?.paymentDate ?? null;
  const fiveYearCagr = computeCagrFromHistory(history);
  const dividendFrequency = inferFrequencyFromHistory(history);
  const specialDividend = history.some((d) => /special/i.test(d.dividendType ?? ''))
    ? true
    : history.length > 0
      ? false
      : null;

  if (
    dividendYield == null &&
    payoutRatio == null &&
    history.length === 0
  ) {
    return null;
  }

  return {
    source: 'fmp',
    fields: {
      dividendYield,
      payoutRatio,
      fiveYearCagr,
      exDividendDate,
      paymentDate,
      dividendFrequency,
      specialDividend,
      dividendHistory: history,
    },
  };
}

export async function fetchAlphaVantageDividendPartial(
  stockCode: string,
  apiKey: string,
): Promise<DividendProviderPartial | null> {
  const key = apiKey.trim();
  if (!key) return null;
  const symbol = encodeURIComponent(yahooSymbol(stockCode));
  const encKey = encodeURIComponent(key);

  const [overviewJson, divJson] = await Promise.all([
    fetchJson(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${encKey}`,
      'alpha_vantage_overview',
    ),
    fetchJson(
      `https://www.alphavantage.co/query?function=DIVIDENDS&symbol=${symbol}&apikey=${encKey}`,
      'alpha_vantage_dividends',
    ),
  ]);

  const ov = (overviewJson ?? {}) as Record<string, unknown>;
  const dividendYield = pctFromDecimal(parseNum(ov.DividendYield));
  const payoutRatio = pctFromDecimal(parseNum(ov.PayoutRatio));
  const exDividendDate = parseIsoDate(String(ov.ExDividendDate ?? ''));

  const history: BursaDividendRecord[] = [];
  const divData = (divJson as { data?: Array<Record<string, unknown>> } | null)?.data;
  if (Array.isArray(divData)) {
    for (const row of divData) {
      const amount = parseNum(row.amount) ?? parseNum(row.dividend_amount);
      if (amount == null || amount <= 0) continue;
      history.push({
        announcedDate: parseIsoDate(String(row.declaration_date ?? row.ex_dividend_date ?? '')),
        financialYear: String(row.ex_dividend_date ?? '').slice(0, 4) || null,
        dividendType: String(row.type ?? ''),
        exDate: parseIsoDate(String(row.ex_dividend_date ?? '')),
        paymentDate: parseIsoDate(String(row.payment_date ?? '')),
        amountPerShare: amount,
      });
    }
  }

  const fiveYearCagr = computeCagrFromHistory(history);
  const paymentDate = history[0]?.paymentDate ?? null;
  const dividendFrequency = inferFrequencyFromHistory(history);
  const specialDividend = history.some((d) => /special/i.test(d.dividendType ?? ''))
    ? true
    : history.length > 0
      ? false
      : null;

  if (
    dividendYield == null &&
    payoutRatio == null &&
    exDividendDate == null &&
    history.length === 0
  ) {
    return null;
  }

  return {
    source: 'alpha_vantage',
    fields: {
      dividendYield,
      payoutRatio,
      fiveYearCagr,
      exDividendDate,
      paymentDate,
      dividendFrequency,
      specialDividend,
      dividendHistory: history,
    },
  };
}

export function buildKlseDividendPartial(input: {
  dividendHistory: BursaDividendRecord[];
  dividendYield: number | null;
  payoutRatio: number | null;
  fiveYearCagr: number | null;
}): DividendProviderPartial | null {
  const history = input.dividendHistory;
  if (
    history.length === 0 &&
    input.dividendYield == null &&
    input.payoutRatio == null &&
    input.fiveYearCagr == null
  ) {
    return null;
  }

  const latest = history.find((d) => d.amountPerShare != null && d.amountPerShare > 0) ?? null;
  const specialDividend = history.some((d) => /special/i.test(d.dividendType ?? ''))
    ? true
    : history.length > 0
      ? false
      : null;

  return {
    source: 'klse_dividend',
    fields: {
      dividendYield: input.dividendYield,
      payoutRatio: input.payoutRatio,
      fiveYearCagr: input.fiveYearCagr,
      exDividendDate: latest?.exDate ?? null,
      paymentDate: latest?.paymentDate ?? null,
      dividendFrequency: inferFrequencyFromHistory(history),
      specialDividend,
      dividendHistory: history,
    },
  };
}

const FIELD_PRIORITY: DividendIntelligenceSource[] = [
  'yahoo_finance',
  'fmp',
  'alpha_vantage',
  'klse_dividend',
  'financial_report',
  'bursa_disclosure',
];

const TRACKED_FIELDS: DividendFieldKey[] = [
  'dividendYield',
  'payoutRatio',
  'fiveYearCagr',
  'exDividendDate',
  'paymentDate',
  'dividendFrequency',
  'specialDividend',
];

export function mergeDividendProviderPartials(
  partials: DividendProviderPartial[],
): {
  merged: DividendProviderFields;
  fieldSources: Partial<Record<DividendFieldKey, DividendIntelligenceSource>>;
  primarySource: DividendIntelligenceSource;
  fieldAcquisitionRate: number;
} {
  const merged: DividendProviderFields = {
    dividendYield: null,
    payoutRatio: null,
    fiveYearCagr: null,
    exDividendDate: null,
    paymentDate: null,
    dividendFrequency: null,
    specialDividend: null,
    dividendHistory: [],
  };
  const fieldSources: Partial<Record<DividendFieldKey, DividendIntelligenceSource>> = {};

  const ordered = [...partials].sort(
    (a, b) => FIELD_PRIORITY.indexOf(a.source) - FIELD_PRIORITY.indexOf(b.source),
  );

  for (const partial of ordered) {
    for (const key of TRACKED_FIELDS) {
      if (merged[key] != null) continue;
      const val = partial.fields[key];
      if (val == null) continue;
      merged[key] = val as never;
      fieldSources[key] = partial.source;
    }
    if (merged.dividendHistory.length === 0 && partial.fields.dividendHistory?.length) {
      merged.dividendHistory = partial.fields.dividendHistory;
    }
  }

  let filled = TRACKED_FIELDS.filter((k) => merged[k] != null).length;
  const fieldAcquisitionRate = TRACKED_FIELDS.length > 0 ? filled / TRACKED_FIELDS.length : 0;

  const primarySource =
    fieldSources.dividendYield
      ? fieldSources.dividendYield
      : fieldSources.payoutRatio
        ? fieldSources.payoutRatio
        : ordered[0]?.source ?? 'none';

  return { merged, fieldSources, primarySource, fieldAcquisitionRate };
}
