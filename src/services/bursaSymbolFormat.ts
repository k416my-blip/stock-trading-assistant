import {
  BURSA_FORMAT_CACHE_REVALIDATE_MS,
  BURSA_FORMAT_FAILURE_THRESHOLD,
  TWELVE_DATA_EXCHANGE,
  TWELVE_DATA_MIC,
} from '../constants/marketData';
import type { MarketDataErrorKind, TwelveDataSymbolParams } from '../types/marketData';
import { isDev } from '../utils/isDev';
import {
  loadBursaFormatCacheFromStorage,
  saveBursaFormatCacheToStorage,
  type BursaFormatCacheV2,
  type BursaSymbolFormatEntry,
} from './bursaSymbolFormatCache';

export type BursaFormatId =
  | 'numeric-xkls'
  | 'dotkl-xkls'
  | 'dotkl-plain'
  | 'klse-prefix'
  | 'bursa-prefix'
  | 'klse-exchange'
  | 'bursa-exchange';

export type BursaQuoteAttempt = TwelveDataSymbolParams & {
  formatId: BursaFormatId;
  attempt: string;
};

export type BursaProbeMode = 'cached-only' | 'full';

const FORMAT_ORDER: BursaFormatId[] = [
  'dotkl-xkls',
  'numeric-xkls',
  'dotkl-plain',
  'klse-prefix',
  'bursa-prefix',
  'klse-exchange',
  'bursa-exchange',
];

const FORMAT_FAILURE_KINDS = new Set<MarketDataErrorKind>([
  'symbol_invalid',
  'unsupported_exchange',
]);

let cacheHydrated = false;
let hydratePromise: Promise<void> | null = null;
let symbolCache: Record<string, BursaSymbolFormatEntry> = {};
let globalHintFormatId: BursaFormatId | null = null;

/** アプリ内保存用: 1155.KL / KLSE:5347 → 5347 */
export function normalizeBursaCoreSymbol(symbol: string): string {
  let raw = symbol.trim().toUpperCase();
  raw = raw.replace(/^(KLSE|BURSA):/i, '');
  raw = raw.replace(/\.KL$/i, '');
  return raw;
}

function buildAttempt(formatId: BursaFormatId, numeric: string): BursaQuoteAttempt {
  const exchange = TWELVE_DATA_EXCHANGE.bursa;
  const mic = TWELVE_DATA_MIC.bursa;

  switch (formatId) {
    case 'numeric-xkls':
      return {
        formatId,
        attempt: '5347-style-numeric-xkls',
        symbol: numeric,
        exchange,
        mic_code: mic,
      };
    case 'dotkl-xkls':
      return {
        formatId,
        attempt: '5347.KL-xkls',
        symbol: `${numeric}.KL`,
        exchange,
        mic_code: mic,
      };
    case 'dotkl-plain':
      return {
        formatId,
        attempt: '5347.KL-plain',
        symbol: `${numeric}.KL`,
      };
    case 'klse-prefix':
      return {
        formatId,
        attempt: 'KLSE:5347',
        symbol: `KLSE:${numeric}`,
        exchange,
        mic_code: mic,
      };
    case 'bursa-prefix':
      return {
        formatId,
        attempt: 'BURSA:5347',
        symbol: `BURSA:${numeric}`,
        exchange,
        mic_code: mic,
      };
    case 'klse-exchange':
      return {
        formatId,
        attempt: '5347-exchange-KLSE',
        symbol: numeric,
        exchange: 'KLSE',
        mic_code: mic,
      };
    case 'bursa-exchange':
      return {
        formatId,
        attempt: '5347-exchange-BURSA',
        symbol: numeric,
        exchange: 'BURSA',
        mic_code: mic,
      };
    default:
      return {
        formatId: 'dotkl-xkls',
        attempt: '5347.KL-xkls',
        symbol: `${numeric}.KL`,
        exchange,
        mic_code: mic,
      };
  }
}

export function isBursaFormatCacheExpired(
  entry: BursaSymbolFormatEntry,
  now = Date.now(),
): boolean {
  const last = Date.parse(entry.lastSuccessAt);
  if (!Number.isFinite(last)) return true;
  return now - last >= BURSA_FORMAT_CACHE_REVALIDATE_MS;
}

export function isFormatRelatedCacheFailure(kind: MarketDataErrorKind): boolean {
  return FORMAT_FAILURE_KINDS.has(kind);
}

function getEntry(coreSymbol: string): BursaSymbolFormatEntry | undefined {
  return symbolCache[coreSymbol];
}

function resolvePreferredFormatId(coreSymbol: string): BursaFormatId | null {
  const entry = getEntry(coreSymbol);
  if (entry?.winningFormat) {
    if (entry.consecutiveFailures < BURSA_FORMAT_FAILURE_THRESHOLD && !isBursaFormatCacheExpired(entry)) {
      return entry.winningFormat;
    }
  }
  return globalHintFormatId;
}

/** キャッシュ形式のみ試すか、全形式を試すか */
export function resolveBursaProbeMode(symbol: string): BursaProbeMode {
  const core = normalizeBursaCoreSymbol(symbol);
  const entry = getEntry(core);
  const formatId = resolvePreferredFormatId(core);

  if (!formatId) {
    return 'full';
  }

  if (entry) {
    if (isBursaFormatCacheExpired(entry)) {
      return 'full';
    }
    if (entry.consecutiveFailures >= BURSA_FORMAT_FAILURE_THRESHOLD) {
      return 'full';
    }
    return 'cached-only';
  }

  // 銘柄未登録だが globalHint あり → 1回だけ試す
  return 'cached-only';
}

/** ストレージから銘柄別キャッシュを読み込み */
export async function hydrateBursaFormatCache(): Promise<void> {
  if (cacheHydrated) return;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const loaded = await loadBursaFormatCacheFromStorage();
      applyCacheSnapshot(loaded);
      cacheHydrated = true;
      if (isDev) {
        console.log('[market-data] Bursa per-symbol cache hydrated', {
          symbolCount: Object.keys(symbolCache).length,
          globalHint: globalHintFormatId,
        });
      }
    })();
  }
  await hydratePromise;
}

function applyCacheSnapshot(cache: BursaFormatCacheV2): void {
  symbolCache = { ...cache.symbols };
  globalHintFormatId = cache.globalHint ?? null;
}

async function persistCache(): Promise<void> {
  const payload: BursaFormatCacheV2 = {
    version: 2,
    symbols: { ...symbolCache },
    globalHint: globalHintFormatId ?? undefined,
  };
  await saveBursaFormatCacheToStorage(payload);
}

export function setPreferredBursaFormatForTests(formatId: BursaFormatId | null): void {
  globalHintFormatId = formatId;
  cacheHydrated = true;
}

export function setSymbolCacheForTests(
  coreSymbol: string,
  entry: BursaSymbolFormatEntry | null,
): void {
  const core = normalizeBursaCoreSymbol(coreSymbol);
  if (entry) {
    symbolCache[core] = { ...entry };
  } else {
    delete symbolCache[core];
  }
  cacheHydrated = true;
}

export function getSymbolCacheEntry(symbol: string): BursaSymbolFormatEntry | undefined {
  return getEntry(normalizeBursaCoreSymbol(symbol));
}

/**
 * Bursa ティッカー形式の候補。
 * - cached-only: 保存済み形式のみ（通常は1件）
 * - full: 全形式（成功形式を先頭、skip で除外可）
 */
export function getBursaQuoteAttempts(
  symbol: string,
  options?: { mode?: BursaProbeMode; skipFormatIds?: BursaFormatId[] },
): BursaQuoteAttempt[] {
  const numeric = normalizeBursaCoreSymbol(symbol);
  const skip = new Set(options?.skipFormatIds ?? []);
  const mode = options?.mode ?? resolveBursaProbeMode(symbol);
  const preferred = resolvePreferredFormatId(numeric);

  if (mode === 'cached-only' && preferred && !skip.has(preferred)) {
    return [buildAttempt(preferred, numeric)];
  }

  const ordered: BursaQuoteAttempt[] = [];
  if (preferred && !skip.has(preferred)) {
    ordered.push(buildAttempt(preferred, numeric));
  }
  for (const id of FORMAT_ORDER) {
    if (id === preferred || skip.has(id)) continue;
    ordered.push(buildAttempt(id, numeric));
  }

  if (isDev) {
    const entry = getEntry(numeric);
    console.log('[market-data] Bursa quote attempts', {
      input: symbol,
      normalized: numeric,
      mode,
      preferred,
      consecutiveFailures: entry?.consecutiveFailures,
      lastSuccessAt: entry?.lastSuccessAt,
      skip: [...skip],
      count: ordered.length,
      order: ordered.map((a) => a.attempt),
    });
  }

  return ordered;
}

export type BursaCacheFailureResult = {
  shouldExpandToFull: boolean;
  consecutiveFailures: number;
};

/**
 * キャッシュ形式の失敗を記録（形式関連エラーのみカウント）。
 * 閾値到達で同一リクエスト内フルプローブへ切り替え可能。
 */
export async function recordBursaCachedFormatFailure(
  symbol: string,
  errorKind: MarketDataErrorKind,
): Promise<BursaCacheFailureResult> {
  const core = normalizeBursaCoreSymbol(symbol);
  const entry = getEntry(core);

  if (!isFormatRelatedCacheFailure(errorKind)) {
    return {
      shouldExpandToFull: false,
      consecutiveFailures: entry?.consecutiveFailures ?? 0,
    };
  }

  if (!entry?.winningFormat) {
    return { shouldExpandToFull: true, consecutiveFailures: 0 };
  }

  const nextFailures = entry.consecutiveFailures + 1;
  symbolCache[core] = {
    ...entry,
    consecutiveFailures: nextFailures,
  };

  try {
    await persistCache();
  } catch {
    /* メモリ上のカウンタは有効 */
  }

  const shouldExpandToFull = nextFailures >= BURSA_FORMAT_FAILURE_THRESHOLD;

  if (isDev) {
    console.log('[market-data] Bursa cached format failure recorded', {
      core,
      errorKind,
      consecutiveFailures: nextFailures,
      threshold: BURSA_FORMAT_FAILURE_THRESHOLD,
      shouldExpandToFull,
    });
  }

  return { shouldExpandToFull, consecutiveFailures: nextFailures };
}

export async function recordBursaFormatSuccess(
  symbol: string,
  formatId: BursaFormatId,
  attemptLabel: string,
): Promise<void> {
  const core = normalizeBursaCoreSymbol(symbol);
  const now = new Date().toISOString();
  const prev = getEntry(core);

  symbolCache[core] = {
    winningFormat: formatId,
    lastSuccessAt: now,
    consecutiveFailures: 0,
  };
  globalHintFormatId = formatId;
  cacheHydrated = true;

  if (isDev) {
    console.log('[market-data] Bursa symbol format succeeded', {
      core,
      formatId,
      attempt: attemptLabel,
      previousFormat: prev?.winningFormat,
    });
  }

  try {
    await persistCache();
  } catch {
    /* セッション内キャッシュは有効 */
  }
}

/** @deprecated 銘柄別キャッシュを参照 — 未指定時は globalHint */
export function getPreferredBursaFormatId(symbol?: string): BursaFormatId | null {
  if (symbol) {
    return resolvePreferredFormatId(normalizeBursaCoreSymbol(symbol));
  }
  return globalHintFormatId;
}

export function normalizeBursaSymbolForStorage(symbol: string): string {
  return normalizeBursaCoreSymbol(symbol);
}

export function resetBursaFormatPreference(): void {
  symbolCache = {};
  globalHintFormatId = null;
  cacheHydrated = false;
  hydratePromise = null;
}
