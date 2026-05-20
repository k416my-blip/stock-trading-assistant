import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { BursaFormatId } from './bursaSymbolFormat';

export type BursaSymbolFormatEntry = {
  winningFormat: BursaFormatId;
  lastSuccessAt: string;
  consecutiveFailures: number;
};

export type BursaFormatCacheV2 = {
  version: 2;
  symbols: Record<string, BursaSymbolFormatEntry>;
  /** 未キャッシュ銘柄向けのヒント（旧 v1 グローバル形式） */
  globalHint?: BursaFormatId;
};

type BursaFormatCacheV1 = {
  version: 1;
  formatId: BursaFormatId;
  updatedAt: string;
};

const VALID_FORMAT_IDS = new Set<BursaFormatId>([
  'numeric-xkls',
  'dotkl-xkls',
  'dotkl-plain',
  'klse-prefix',
  'bursa-prefix',
  'klse-exchange',
  'bursa-exchange',
]);

function isBursaFormatId(value: unknown): value is BursaFormatId {
  return typeof value === 'string' && VALID_FORMAT_IDS.has(value as BursaFormatId);
}

function isEntry(value: unknown): value is BursaSymbolFormatEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as BursaSymbolFormatEntry;
  return (
    isBursaFormatId(e.winningFormat) &&
    typeof e.lastSuccessAt === 'string' &&
    typeof e.consecutiveFailures === 'number' &&
    Number.isFinite(e.consecutiveFailures) &&
    e.consecutiveFailures >= 0
  );
}

function parseV2(raw: string): BursaFormatCacheV2 | null {
  try {
    const parsed = JSON.parse(raw) as BursaFormatCacheV2;
    if (parsed?.version !== 2 || !parsed.symbols || typeof parsed.symbols !== 'object') {
      return null;
    }
    const symbols: Record<string, BursaSymbolFormatEntry> = {};
    for (const [key, entry] of Object.entries(parsed.symbols)) {
      if (isEntry(entry)) {
        symbols[key] = {
          winningFormat: entry.winningFormat,
          lastSuccessAt: entry.lastSuccessAt,
          consecutiveFailures: Math.floor(entry.consecutiveFailures),
        };
      }
    }
    return {
      version: 2,
      symbols,
      globalHint: isBursaFormatId(parsed.globalHint) ? parsed.globalHint : undefined,
    };
  } catch {
    return null;
  }
}

function migrateV1(raw: string): BursaFormatCacheV2 | null {
  try {
    const parsed = JSON.parse(raw) as BursaFormatCacheV1;
    if (parsed?.version !== 1 || !isBursaFormatId(parsed.formatId)) {
      return null;
    }
    return {
      version: 2,
      symbols: {},
      globalHint: parsed.formatId,
    };
  } catch {
    return null;
  }
}

export async function loadBursaFormatCacheFromStorage(): Promise<BursaFormatCacheV2> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.bursaSymbolFormat);
    if (!raw) {
      return { version: 2, symbols: {} };
    }
    const v2 = parseV2(raw);
    if (v2) return v2;
    const migrated = migrateV1(raw);
    if (migrated) {
      await saveBursaFormatCacheToStorage(migrated);
      return migrated;
    }
    return { version: 2, symbols: {} };
  } catch {
    return { version: 2, symbols: {} };
  }
}

export async function saveBursaFormatCacheToStorage(cache: BursaFormatCacheV2): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.bursaSymbolFormat, JSON.stringify(cache));
}

export async function clearBursaFormatStorage(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.bursaSymbolFormat);
}
