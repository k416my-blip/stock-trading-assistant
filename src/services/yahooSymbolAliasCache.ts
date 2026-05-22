import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BURSA_FALLBACK_CANDIDATES,
  BURSA_SYMBOL_MAP,
  BURSA_YAHOO_SYMBOL_SEED,
  YAHOO_SYMBOL_FAILURE_CACHE_MS,
  YAHOO_SYMBOL_NOT_FOUND_MESSAGE,
} from '../constants/yahooFinance';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { normalizeBursaCoreSymbol } from './bursaSymbolFormat';
import { normalizeYahooSymbol } from '../utils/normalizeYahooSymbol';
import { MarketDataError } from './marketDataService';

export type YahooSymbolAliasEntry = {
  yahooSymbol: string;
  shortName?: string;
  exchange?: string;
  longName?: string;
  savedAt: string;
  source: 'seed' | 'search' | 'hardcoded' | 'success';
};

export type YahooSymbolFailureEntry = {
  failedAt: string;
  message: string;
  lastYahooSymbol?: string;
};

type YahooSymbolAliasStore = {
  version: 1;
  aliases: Record<string, YahooSymbolAliasEntry>;
  failures: Record<string, YahooSymbolFailureEntry>;
};

const STORAGE_KEY = STORAGE_KEYS.yahooSymbolAlias;

let memoryStore: YahooSymbolAliasStore | null = null;

function defaultStore(): YahooSymbolAliasStore {
  const aliases: Record<string, YahooSymbolAliasEntry> = {};
  const now = new Date().toISOString();
  for (const [core, seed] of Object.entries(BURSA_YAHOO_SYMBOL_SEED)) {
    aliases[core] = {
      yahooSymbol: seed.yahooSymbol,
      shortName: seed.shortName,
      exchange: seed.exchange,
      longName: seed.longName,
      savedAt: now,
      source: 'seed',
    };
  }
  for (const [core, yahooSymbol] of Object.entries(BURSA_SYMBOL_MAP)) {
    const prev = aliases[core];
    aliases[core] = {
      yahooSymbol,
      shortName: prev?.shortName ?? 'NESTLE',
      exchange: prev?.exchange ?? 'KLS',
      longName: prev?.longName ?? 'Nestlé (Malaysia) Berhad',
      savedAt: now,
      source: 'hardcoded',
    };
  }
  return { version: 1, aliases, failures: {} };
}

async function loadStore(): Promise<YahooSymbolAliasStore> {
  if (memoryStore) return memoryStore;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryStore = defaultStore();
      return memoryStore;
    }
    const parsed = JSON.parse(raw) as YahooSymbolAliasStore;
    if (parsed.version !== 1 || !parsed.aliases) {
      memoryStore = defaultStore();
      return memoryStore;
    }
    const merged = defaultStore();
    for (const [k, v] of Object.entries(parsed.aliases)) {
      merged.aliases[k] = v;
    }
    merged.failures = parsed.failures ?? {};
    for (const core of Object.keys(BURSA_SYMBOL_MAP)) {
      delete merged.failures[core];
    }
    memoryStore = merged;
    return memoryStore;
  } catch {
    memoryStore = defaultStore();
    return memoryStore;
  }
}

async function persistStore(store: YahooSymbolAliasStore): Promise<void> {
  memoryStore = store;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export async function hydrateYahooSymbolAliasCache(): Promise<void> {
  await loadStore();
}

export function getYahooSymbolAlias(coreSymbol: string): YahooSymbolAliasEntry | undefined {
  const core = normalizeBursaCoreSymbol(coreSymbol);
  return memoryStore?.aliases[core];
}

export function getHardcodedBursaYahooSymbol(coreSymbol: string): string | undefined {
  const core = normalizeBursaCoreSymbol(coreSymbol);
  return BURSA_SYMBOL_MAP[core];
}

/** 試行する Yahoo symbol 一覧（hardcoded → cache → fallback 候補） */
export async function resolveYahooSymbolsToTry(
  coreSymbol: string,
  fallbackApiSymbol: string,
): Promise<string[]> {
  await loadStore();
  const core = normalizeBursaCoreSymbol(coreSymbol);
  const seen = new Set<string>();
  const ordered: string[] = [];

  const add = (sym: string | undefined) => {
    if (!sym?.trim()) return;
    const normalized = normalizeYahooSymbol(sym, 'bursa');
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    ordered.push(normalized);
  };

  add(BURSA_SYMBOL_MAP[core]);

  const alias = memoryStore?.aliases[core];
  if (alias?.yahooSymbol) add(alias.yahooSymbol);

  add(fallbackApiSymbol);
  add(core);

  const fallbacks = BURSA_FALLBACK_CANDIDATES[core] ?? [];
  for (const f of fallbacks) add(f);

  return ordered;
}

export async function saveYahooSymbolAlias(
  coreSymbol: string,
  entry: Omit<YahooSymbolAliasEntry, 'savedAt'>,
): Promise<void> {
  const store = await loadStore();
  const core = normalizeBursaCoreSymbol(coreSymbol);
  store.aliases[core] = {
    ...entry,
    savedAt: new Date().toISOString(),
  };
  delete store.failures[core];
  await persistStore(store);
  console.log('[yahoo-alias] SAVED_PERMANENT', { core, yahooSymbol: store.aliases[core].yahooSymbol, source: entry.source });
}

export function isYahooSymbolFailureCached(coreSymbol: string, now = Date.now()): boolean {
  const core = normalizeBursaCoreSymbol(coreSymbol);
  if (BURSA_SYMBOL_MAP[core]) return false;
  const fail = memoryStore?.failures[core];
  if (!fail) return false;
  const at = Date.parse(fail.failedAt);
  if (!Number.isFinite(at)) return false;
  return now - at < YAHOO_SYMBOL_FAILURE_CACHE_MS;
}

export async function recordYahooSymbolFailure(
  coreSymbol: string,
  lastYahooSymbol?: string,
  detail?: string,
): Promise<void> {
  const core = normalizeBursaCoreSymbol(coreSymbol);
  if (BURSA_SYMBOL_MAP[core]) return;
  const store = await loadStore();
  store.failures[core] = {
    failedAt: new Date().toISOString(),
    message: detail ?? YAHOO_SYMBOL_NOT_FOUND_MESSAGE,
    lastYahooSymbol,
  };
  await persistStore(store);
  console.log('[yahoo-alias] FAILURE_CACHED', { core, ...store.failures[core] });
}

export function throwYahooSymbolNotFoundCached(coreSymbol: string): never {
  const core = normalizeBursaCoreSymbol(coreSymbol);
  const fail = memoryStore?.failures[core];
  throw new MarketDataError('symbol_invalid', YAHOO_SYMBOL_NOT_FOUND_MESSAGE, {
    rawMessage: fail?.message ?? YAHOO_SYMBOL_NOT_FOUND_MESSAGE,
  });
}

export function resetYahooSymbolAliasCacheForTests(): void {
  memoryStore = null;
}
