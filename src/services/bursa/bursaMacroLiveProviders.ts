/**
 * Phase19 — Live macro indicators (Fed / OPR / CPI)
 * Replaces MACRO_REFERENCE_VALUES with live fetches.
 */
import type { MacroIndicatorId } from '../../types/bursaMacroIntelligence';
import { fetchHttpWithRetry, readEnvKey } from '../quoteProviders/providerFetchUtil';

export type MacroLiveIndicatorId = 'fed_rate' | 'my_opr' | 'us_cpi' | 'my_cpi';

export type MacroLiveIndicatorSnapshot = {
  id: MacroLiveIndicatorId;
  value: number | null;
  changePct: number | null;
  fromLive: boolean;
  source: string;
  errorJa: string | null;
};

export type MacroLiveFetchKeys = {
  alphaVantageApiKey?: string;
  fmpApiKey?: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedLive: Record<MacroLiveIndicatorId, MacroLiveIndicatorSnapshot> | null = null;
let cachedLiveAt = 0;

function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function yoyFromMonthlyIndex(values: number[]): number | null {
  if (values.length < 13) return null;
  const latest = values[values.length - 1]!;
  const yearAgo = values[values.length - 13]!;
  if (yearAgo === 0) return null;
  return ((latest - yearAgo) / yearAgo) * 100;
}

async function fetchFredSeries(seriesId: string): Promise<number[] | null> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
  try {
    const { response, bodyText } = await fetchHttpWithRetry(url, {
      logLabel: 'fred_macro',
      timeoutMs: 15_000,
      symbol: seriesId,
    });
    if (!response.ok) return null;
    const values: number[] = [];
    for (const line of bodyText.trim().split('\n').slice(1)) {
      const parts = line.split(',');
      const val = parseFloat(parts[1]?.trim() ?? '');
      if (Number.isFinite(val)) values.push(val);
    }
    return values.length > 0 ? values : null;
  } catch {
    return null;
  }
}

async function fetchFedRateFromFred(): Promise<MacroLiveIndicatorSnapshot | null> {
  const values = await fetchFredSeries('FEDFUNDS');
  if (!values || values.length === 0) return null;
  const value = values[values.length - 1]!;
  const prev = values.length >= 2 ? values[values.length - 2]! : null;
  return {
    id: 'fed_rate',
    value,
    changePct: prev != null ? pctChange(value, prev) : null,
    fromLive: true,
    source: 'fred',
    errorJa: null,
  };
}

async function fetchUsCpiYoYFromFred(): Promise<MacroLiveIndicatorSnapshot | null> {
  const values = await fetchFredSeries('CPIAUCSL');
  if (!values) return null;
  const yoy = yoyFromMonthlyIndex(values);
  if (yoy == null) return null;
  const prevYoy =
    values.length >= 14 ? yoyFromMonthlyIndex(values.slice(0, -1)) : null;
  return {
    id: 'us_cpi',
    value: yoy,
    changePct: prevYoy != null ? yoy - prevYoy : null,
    fromLive: true,
    source: 'fred',
    errorJa: null,
  };
}

async function fetchMalaysiaCpiFromWorldBank(): Promise<MacroLiveIndicatorSnapshot | null> {
  const url =
    'https://api.worldbank.org/v2/country/MYS/indicator/FP.CPI.TOTL.ZG?format=json&per_page=5';
  try {
    const { response, bodyText } = await fetchHttpWithRetry(url, {
      logLabel: 'worldbank_macro',
      timeoutMs: 20_000,
      symbol: 'MYS_CPI',
    });
    if (!response.ok) return null;
    const parsed = JSON.parse(bodyText) as unknown;
    if (!Array.isArray(parsed) || !Array.isArray(parsed[1])) return null;
    const rows = (parsed[1] as Array<{ date?: string; value?: number | null }>).filter(
      (r) => r.value != null && Number.isFinite(r.value),
    );
    if (rows.length === 0) return null;
    const latest = rows[0]!;
    const prev = rows.length >= 2 ? rows[1]! : null;
    const value = latest.value!;
    return {
      id: 'my_cpi',
      value,
      changePct: prev?.value != null ? value - prev.value : null,
      fromLive: true,
      source: 'world_bank',
      errorJa: null,
    };
  } catch {
    return null;
  }
}

async function fetchMalaysiaCpiFromFred(): Promise<MacroLiveIndicatorSnapshot | null> {
  const values = await fetchFredSeries('FPCPITOTLZGMYS');
  if (!values || values.length === 0) return null;
  const value = values[values.length - 1]!;
  const prev = values.length >= 2 ? values[values.length - 2]! : null;
  return {
    id: 'my_cpi',
    value,
    changePct: prev != null ? value - prev : null,
    fromLive: true,
    source: 'fred',
    errorJa: null,
  };
}

async function fetchAlphaVantageSeries(
  fn: string,
  apiKey: string,
): Promise<Array<{ date: string; value: number }> | null> {
  const url = `https://www.alphavantage.co/query?function=${encodeURIComponent(fn)}&interval=monthly&apikey=${encodeURIComponent(apiKey)}`;
  try {
    const { response, bodyText } = await fetchHttpWithRetry(url, {
      logLabel: 'alpha_macro',
      timeoutMs: 20_000,
      symbol: fn,
    });
    if (!response.ok) return null;
    const json = JSON.parse(bodyText) as Record<string, Record<string, string>>;
    const key = Object.keys(json).find((k) => k.includes('data') || k.endsWith('Rate'));
    const block = key ? json[key] : null;
    if (!block || typeof block !== 'object') return null;
    const rows: Array<{ date: string; value: number }> = [];
    for (const [date, raw] of Object.entries(block)) {
      const val = parseFloat(String(raw));
      if (Number.isFinite(val)) rows.push({ date, value: val });
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

async function fetchFedRateFromAlphaVantage(apiKey: string): Promise<MacroLiveIndicatorSnapshot | null> {
  const rows = await fetchAlphaVantageSeries('FEDERAL_FUNDS_RATE', apiKey);
  if (!rows || rows.length === 0) return null;
  const latest = rows[rows.length - 1]!;
  const prev = rows.length >= 2 ? rows[rows.length - 2]! : null;
  return {
    id: 'fed_rate',
    value: latest.value,
    changePct: prev ? pctChange(latest.value, prev.value) : null,
    fromLive: true,
    source: 'alpha_vantage',
    errorJa: null,
  };
}

async function fetchUsCpiFromAlphaVantage(apiKey: string): Promise<MacroLiveIndicatorSnapshot | null> {
  const rows = await fetchAlphaVantageSeries('CPI', apiKey);
  if (!rows || rows.length < 13) return null;
  const values = rows.map((r) => r.value);
  const yoy = yoyFromMonthlyIndex(values);
  if (yoy == null) return null;
  const prevYoy = yoyFromMonthlyIndex(values.slice(0, -1));
  return {
    id: 'us_cpi',
    value: yoy,
    changePct: prevYoy != null ? yoy - prevYoy : null,
    fromLive: true,
    source: 'alpha_vantage',
    errorJa: null,
  };
}

type FmpEconomicRow = { date?: string; value?: number; name?: string };

async function fetchFmpEconomicIndicator(
  name: string,
  apiKey: string,
): Promise<FmpEconomicRow[] | null> {
  const from = new Date();
  from.setFullYear(from.getFullYear() - 3);
  const fromStr = from.toISOString().slice(0, 10);
  const url = `https://financialmodelingprep.com/stable/economic-indicators?name=${encodeURIComponent(name)}&from=${fromStr}&apikey=${encodeURIComponent(apiKey)}`;
  try {
    const { response, bodyText } = await fetchHttpWithRetry(url, {
      logLabel: 'fmp_macro',
      timeoutMs: 20_000,
      symbol: name,
    });
    if (!response.ok) return null;
    const json = JSON.parse(bodyText) as unknown;
    if (!Array.isArray(json)) return null;
    return json as FmpEconomicRow[];
  } catch {
    return null;
  }
}

async function fetchFedRateFromFmp(apiKey: string): Promise<MacroLiveIndicatorSnapshot | null> {
  const rows = await fetchFmpEconomicIndicator('federalFunds', apiKey);
  if (!rows || rows.length === 0) return null;
  const sorted = [...rows].filter((r) => r.value != null && Number.isFinite(r.value));
  sorted.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const latest = sorted[sorted.length - 1]!;
  const prev = sorted.length >= 2 ? sorted[sorted.length - 2]! : null;
  return {
    id: 'fed_rate',
    value: latest.value!,
    changePct: prev?.value != null ? pctChange(latest.value!, prev.value) : null,
    fromLive: true,
    source: 'fmp',
    errorJa: null,
  };
}

async function fetchUsCpiFromFmp(apiKey: string): Promise<MacroLiveIndicatorSnapshot | null> {
  const rows = await fetchFmpEconomicIndicator('CPI', apiKey);
  if (!rows || rows.length < 13) return null;
  const sorted = [...rows].filter((r) => r.value != null && Number.isFinite(r.value));
  sorted.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const values = sorted.map((r) => r.value!);
  const yoy = yoyFromMonthlyIndex(values);
  if (yoy == null) return null;
  const prevYoy = yoyFromMonthlyIndex(values.slice(0, -1));
  return {
    id: 'us_cpi',
    value: yoy,
    changePct: prevYoy != null ? yoy - prevYoy : null,
    fromLive: true,
    source: 'fmp',
    errorJa: null,
  };
}

function parseOprFromHtml(html: string): number | null {
  const patterns = [
    /Overnight Policy Rate[^0-9]{0,40}([\d.]+)\s*(?:%|percent|per cent)/i,
    /OPR[^0-9]{0,20}([\d.]+)\s*(?:%|percent|per cent)/i,
    /"opr"\s*:\s*([\d.]+)/i,
    /Policy Rate[^0-9]{0,30}([\d.]+)\s*%/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const val = parseFloat(m[1]);
      if (Number.isFinite(val) && val >= 1 && val <= 10) return val;
    }
  }
  return null;
}

async function fetchMalaysiaOprFromBnm(): Promise<MacroLiveIndicatorSnapshot | null> {
  const urls = [
    'https://www.bnm.gov.my/monetary-policy',
    'https://www.bnm.gov.my/key-indicators',
    'https://www.bnm.gov.my/',
  ];
  for (const url of urls) {
    try {
      const { response, bodyText } = await fetchHttpWithRetry(url, {
        logLabel: 'bnm_opr',
        timeoutMs: 20_000,
        symbol: 'MY_OPR',
      });
      if (!response.ok) continue;
      const value = parseOprFromHtml(bodyText);
      if (value != null) {
        return {
          id: 'my_opr',
          value,
          changePct: null,
          fromLive: true,
          source: 'bnm',
          errorJa: null,
        };
      }
    } catch {
      /* try next URL */
    }
  }
  return null;
}

async function fetchMalaysiaOprFromFmpCalendar(apiKey: string): Promise<MacroLiveIndicatorSnapshot | null> {
  const from = new Date();
  from.setFullYear(from.getFullYear() - 2);
  const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from.toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}&apikey=${encodeURIComponent(apiKey)}`;
  try {
    const { response, bodyText } = await fetchHttpWithRetry(url, {
      logLabel: 'fmp_calendar',
      timeoutMs: 25_000,
      symbol: 'MY_OPR',
    });
    if (!response.ok) return null;
    const json = JSON.parse(bodyText) as Array<{
      country?: string;
      event?: string;
      actual?: string | number | null;
      date?: string;
    }>;
    if (!Array.isArray(json)) return null;
    const hits = json
      .filter(
        (e) =>
          (e.country === 'MY' || /malaysia/i.test(e.event ?? '')) &&
          /OPR|Overnight Policy|Bank Negara/i.test(e.event ?? '') &&
          e.actual != null &&
          String(e.actual).trim() !== '',
      )
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const latest = hits[0];
    if (!latest) return null;
    const value = parseFloat(String(latest.actual).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(value)) return null;
    return {
      id: 'my_opr',
      value,
      changePct: null,
      fromLive: true,
      source: 'fmp_calendar',
      errorJa: null,
    };
  } catch {
    return null;
  }
}

function unavailable(id: MacroLiveIndicatorId, errorJa: string): MacroLiveIndicatorSnapshot {
  return {
    id,
    value: null,
    changePct: null,
    fromLive: false,
    source: 'none',
    errorJa,
  };
}

export function resolveMacroLiveFetchKeys(input?: MacroLiveFetchKeys): MacroLiveFetchKeys {
  return {
    alphaVantageApiKey:
      input?.alphaVantageApiKey?.trim() ||
      readEnvKey('ALPHA_VANTAGE_API_KEY', 'EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY'),
    fmpApiKey: input?.fmpApiKey?.trim() || readEnvKey('FMP_API_KEY', 'EXPO_PUBLIC_FMP_API_KEY'),
  };
}

export async function fetchMacroLiveIndicators(input?: {
  keys?: MacroLiveFetchKeys;
  forceRefresh?: boolean;
}): Promise<Record<MacroLiveIndicatorId, MacroLiveIndicatorSnapshot>> {
  const now = Date.now();
  if (!input?.forceRefresh && cachedLive && now - cachedLiveAt < CACHE_TTL_MS) {
    return cachedLive;
  }

  const keys = resolveMacroLiveFetchKeys(input?.keys);
  const alpha = keys.alphaVantageApiKey ?? '';
  const fmp = keys.fmpApiKey ?? '';

  const fed = await (async () => {
    const attempts: Array<() => Promise<MacroLiveIndicatorSnapshot | null>> = [
      () => fetchFedRateFromFred(),
    ];
    if (alpha) attempts.push(() => fetchFedRateFromAlphaVantage(alpha));
    if (fmp) attempts.push(() => fetchFedRateFromFmp(fmp));
    for (const fn of attempts) {
      const r = await fn();
      if (r?.fromLive && r.value != null) return r;
    }
    return unavailable('fed_rate', 'データ未取得');
  })();

  const usCpi = await (async () => {
    const attempts: Array<() => Promise<MacroLiveIndicatorSnapshot | null>> = [
      () => fetchUsCpiYoYFromFred(),
    ];
    if (alpha) attempts.push(() => fetchUsCpiFromAlphaVantage(alpha));
    if (fmp) attempts.push(() => fetchUsCpiFromFmp(fmp));
    for (const fn of attempts) {
      const r = await fn();
      if (r?.fromLive && r.value != null) return r;
    }
    return unavailable('us_cpi', 'データ未取得');
  })();

  const myCpi = await (async () => {
    const r =
      (await fetchMalaysiaCpiFromWorldBank()) ?? (await fetchMalaysiaCpiFromFred());
    return r?.fromLive && r.value != null ? r : unavailable('my_cpi', 'データ未取得');
  })();

  const myOpr = await (async () => {
    const r =
      (await fetchMalaysiaOprFromBnm()) ??
      (fmp ? await fetchMalaysiaOprFromFmpCalendar(fmp) : null);
    return r?.fromLive && r.value != null ? r : unavailable('my_opr', 'データ未取得');
  })();

  const out: Record<MacroLiveIndicatorId, MacroLiveIndicatorSnapshot> = {
    fed_rate: fed,
    us_cpi: usCpi,
    my_cpi: myCpi,
    my_opr: myOpr,
  };

  cachedLive = out;
  cachedLiveAt = now;
  return out;
}

export function resetMacroLiveCache(): void {
  cachedLive = null;
  cachedLiveAt = 0;
}

export function macroLiveIdForIndicator(id: MacroIndicatorId): MacroLiveIndicatorId | null {
  if (id === 'fed_rate' || id === 'my_opr' || id === 'us_cpi' || id === 'my_cpi') return id;
  return null;
}

export { parseOprFromHtml, yoyFromMonthlyIndex, pctChange };
