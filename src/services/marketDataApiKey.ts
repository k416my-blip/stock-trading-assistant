import { TWELVE_DATA_BASE_URL } from '../constants/marketData';
import { devLog } from '../utils/devLog';
import { isUsableApiKey, normalizeTwelveDataApiKey } from './apiKeyValidation';
import { safeGetApiKey, safeSaveApiKey } from './safeApiKey';
import { getSecret, setSecret } from './secretStorage';

const TWELVE_DATA_STORAGE_KEYS = {
  secureStore: 'sta.secret.twelve_data_api_key',
  legacyAsyncStorage: '@sta/twelve_data_api_key',
};

const ENV_KEY_NAMES = [
  'EXPO_PUBLIC_TWELVE_DATA_API_KEY',
  'TWELVE_DATA_API_KEY',
] as const;

export type TwelveDataKeySource = 'secure_store' | 'env' | 'none';

function readTwelveDataKeyFromEnv(): string {
  if (typeof process === 'undefined' || !process.env) return '';
  for (const name of ENV_KEY_NAMES) {
    const v = process.env[name];
    if (typeof v === 'string' && isUsableApiKey(v)) {
      return v.trim();
    }
  }
  return '';
}

/** 接続テスト・株価更新の共通取得（SecureStore 優先 → .env） */
export async function getTwelveDataApiKey(): Promise<{
  key: string;
  source: TwelveDataKeySource;
}> {
  const resolved = await resolveTwelveDataApiKey();
  return { key: resolved.key.trim(), source: resolved.source };
}

export function logTwelveDataKeyForTest(key: string): void {
  devLog('[TEST KEY]', {
    exists: Boolean(key),
    length: key?.length ?? 0,
    head: key?.slice(0, 4) ?? '',
    source: 'api-test',
  });
}

export function logTwelveDataKeyForPriceUpdate(key: string): void {
  devLog('[PRICE UPDATE KEY]', {
    exists: Boolean(key),
    length: key?.length ?? 0,
    head: key?.slice(0, 4) ?? '',
    source: 'holdings-update',
  });
}

/** Twelve Data キー検証 — 無効 env キーを RSI/quote に使わない */
export async function validateTwelveDataApiKey(key: string): Promise<{
  ok: boolean;
  httpStatus: number;
  barCount: number;
}> {
  const trimmed = key.trim();
  if (!isUsableApiKey(trimmed)) {
    return { ok: false, httpStatus: 0, barCount: 0 };
  }
  const url = new URL(`${TWELVE_DATA_BASE_URL}/time_series`);
  url.searchParams.set('symbol', 'AAPL');
  url.searchParams.set('interval', '1day');
  url.searchParams.set('outputsize', '30');
  url.searchParams.set('apikey', trimmed);
  url.searchParams.set('order', 'ASC');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    const json = (await res.json()) as { values?: unknown[] };
    const bars = Array.isArray(json.values) ? json.values.length : 0;
    return { ok: res.ok && bars > 0, httpStatus: res.status, barCount: bars };
  } catch {
    return { ok: false, httpStatus: 0, barCount: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/** モック値は使用しない。SecureStore 優先、未設定時のみ検証済み .env を参照 */
export async function resolveTwelveDataApiKey(): Promise<{
  key: string;
  source: TwelveDataKeySource;
}> {
  const stored = await getSecret('twelveDataApiKey');
  if (isUsableApiKey(stored)) {
    return { key: stored.trim(), source: 'secure_store' };
  }

  const fromEnv = readTwelveDataKeyFromEnv();
  if (fromEnv) {
    const check = await validateTwelveDataApiKey(fromEnv);
    if (check.ok) {
      await setSecret('twelveDataApiKey', fromEnv);
      return { key: fromEnv, source: 'env' };
    }
    return { key: '', source: 'none' };
  }

  return { key: '', source: 'none' };
}

export async function loadTwelveDataApiKey(): Promise<string> {
  const { key } = await getTwelveDataApiKey();
  const apiKey = key.trim();
  devLog('LOADED API KEY', {
    storageKeys: TWELVE_DATA_STORAGE_KEYS,
    source: apiKey ? 'resolved' : 'none',
    keyPresent: apiKey.length > 0,
    keyLength: apiKey.length,
  });
  return apiKey;
}

/** 起動時: .env の TWELVE_DATA_API_KEY が読み込まれたか（値は出さない） */
export function logTwelveDataEnvKeyAtStartup(resolved: {
  key: string;
  source: TwelveDataKeySource;
}): void {
  const envOnly = readTwelveDataKeyFromEnv();
  const hasEnv = Boolean(envOnly);
  const hasKey = Boolean(resolved.key.trim());
  devLog('[TwelveData] ENV_KEY_AT_STARTUP', {
    envVarNames: ENV_KEY_NAMES,
    envKeyPresent: hasEnv,
    envKeyLength: envOnly.length,
    resolvedSource: resolved.source,
    resolvedKeyPresent: hasKey,
    resolvedKeyLength: resolved.key.trim().length,
    first4: hasKey ? resolved.key.trim().slice(0, 4) : '(n/a)',
    last4: hasKey ? resolved.key.trim().slice(-4) : '(n/a)',
  });
}

export async function saveTwelveDataApiKey(
  apiKey: string,
): Promise<{ saved: boolean; reason: string }> {
  const result = await safeSaveApiKey('twelve_data', apiKey);
  if (result.saved) {
    devLog('SAVED API KEY', {
      storageKeys: TWELVE_DATA_STORAGE_KEYS,
      keyPresent: true,
      keyLength: (await safeGetApiKey('twelve_data')).length,
    });
  }
  return result;
}
