/**
 * 主要指数・VIX・為替・金利プロキシ — Yahoo Finance chart API
 */
import type { Currency } from '../types';
import {
  GLOBAL_INDEX_DEFS,
  GLOBAL_SECTOR_DEFS,
  MACRO_INSTRUMENT_DEFS,
} from '../constants/globalMarket';
import { parseYahooChangePct, parseYahooPrice } from '../utils/yahooChartParser';
import { buildYahooChartUrl } from './quoteProviders/yahooFinanceQuote';
import { fetchHttpWithRetry } from './quoteProviders/providerFetchUtil';
import {
  getCachedGlobalMarketSnapshots,
  setCachedGlobalMarketSnapshots,
} from './globalMarketCache';

export type YahooInstrumentSnapshot = {
  yahooSymbol: string;
  price: number | null;
  changePct: number | null;
  fromLive: boolean;
  errorJa: string | null;
};

const FETCH_TIMEOUT_MS = 12_000;
const BATCH_SIZE = 4;

function allYahooSymbols(): string[] {
  const set = new Set<string>();
  for (const d of GLOBAL_INDEX_DEFS) set.add(d.yahooSymbol);
  for (const d of GLOBAL_SECTOR_DEFS) set.add(d.etfSymbol);
  set.add(MACRO_INSTRUMENT_DEFS.vix.yahooSymbol);
  set.add(MACRO_INSTRUMENT_DEFS.usdjpy.yahooSymbol);
  set.add(MACRO_INSTRUMENT_DEFS.usdmyr.yahooSymbol);
  set.add(MACRO_INSTRUMENT_DEFS.dxy.yahooSymbol);
  set.add(MACRO_INSTRUMENT_DEFS.us10y.yahooSymbol);
  return [...set];
}

async function fetchOneYahooSnapshot(yahooSymbol: string): Promise<YahooInstrumentSnapshot> {
  const url = buildYahooChartUrl(yahooSymbol);
  try {
    const { response, bodyText } = await fetchHttpWithRetry(url, {
      timeoutMs: FETCH_TIMEOUT_MS,
      logLabel: 'global_market',
      symbol: yahooSymbol,
    });
    if (!response.ok) {
      return {
        yahooSymbol,
        price: null,
        changePct: null,
        fromLive: false,
        errorJa: `HTTP ${response.status}`,
      };
    }
    const data = JSON.parse(bodyText) as unknown;
    return {
      yahooSymbol,
      price: parseYahooPrice(data),
      changePct: parseYahooChangePct(data),
      fromLive: true,
      errorJa: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '取得失敗';
    return {
      yahooSymbol,
      price: null,
      changePct: null,
      fromLive: false,
      errorJa: msg,
    };
  }
}

async function fetchBatch(symbols: string[]): Promise<Record<string, YahooInstrumentSnapshot>> {
  const out: Record<string, YahooInstrumentSnapshot> = {};
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const chunk = symbols.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(chunk.map((s) => fetchOneYahooSnapshot(s)));
    for (const r of results) out[r.yahooSymbol] = r;
  }
  return out;
}

/** キャッシュ付きで全市場インストゥルメントを取得 */
export async function fetchGlobalMarketSnapshots(
  forceRefresh = false,
): Promise<Record<string, YahooInstrumentSnapshot>> {
  if (!forceRefresh) {
    const cached = getCachedGlobalMarketSnapshots();
    if (cached) return cached;
  }
  const snapshots = await fetchBatch(allYahooSymbols());
  setCachedGlobalMarketSnapshots(snapshots);
  return snapshots;
}

export function snapshotFor(
  snapshots: Record<string, YahooInstrumentSnapshot>,
  yahooSymbol: string,
): YahooInstrumentSnapshot {
  return (
    snapshots[yahooSymbol] ?? {
      yahooSymbol,
      price: null,
      changePct: null,
      fromLive: false,
      errorJa: '未取得',
    }
  );
}

/** 互換: 単一シンボル取得 */
export async function fetchYahooInstrumentSnapshot(
  yahooSymbol: string,
  _currency: Currency = 'USD',
): Promise<YahooInstrumentSnapshot> {
  const all = await fetchGlobalMarketSnapshots();
  return snapshotFor(all, yahooSymbol);
}
