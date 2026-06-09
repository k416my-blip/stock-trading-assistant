import { TWELVE_DATA_BASE_URL } from '../constants/marketData';
import { isUsableApiKey, normalizeTwelveDataApiKey } from './apiKeyValidation';
import { getTwelveDataApiKey } from './marketDataApiKey';
import { getSecret } from './secretStorage';

const TEST_SYMBOL = 'AAPL';

/** 接続テスト用キー — 入力 → SecureStore → env の順で解決 */
export async function resolveTwelveDataKeyForTest(inputKey?: string): Promise<string> {
  const fromInput = normalizeTwelveDataApiKey(inputKey ?? '');
  if (isUsableApiKey(fromInput)) return fromInput;

  const stored = normalizeTwelveDataApiKey(await getSecret('twelveDataApiKey'));
  if (isUsableApiKey(stored)) return stored;

  const { key } = await getTwelveDataApiKey();
  return normalizeTwelveDataApiKey(key);
}

export function buildTwelveDataQuoteTestUrl(apiKey: string): string {
  const url = new URL(`${TWELVE_DATA_BASE_URL}/quote`);
  url.searchParams.set('symbol', TEST_SYMBOL);
  url.searchParams.set('apikey', apiKey.trim());
  return url.toString();
}

/** 接続テスト直前の診断ログ（ユーザー指定フォーマット含む） */
export function logTwelveDataConnectionTestProbe(apiKey: string): void {
  const trimmed = apiKey.trim();
  const url = buildTwelveDataQuoteTestUrl(trimmed);
  const masked = url.replace(/apikey=[^&]+/i, 'apikey=***');

  console.log('[TWELVE TEST]', trimmed.slice(0, 4), trimmed.length);
  console.log('[TWELVE TEST URL]', masked);
  console.log('[TWELVE TEST apikey]', {
    defined: trimmed.length > 0,
    empty: trimmed.length === 0,
    length: trimmed.length,
    inUrl: /apikey=[^&]+/.test(url) && !/apikey=&|apikey=$/.test(url),
  });
  console.log('[TWELVE TEST storage]', {
    secureStoreKey: 'sta.secret.twelve_data_api_key',
    secretKeyId: 'twelveDataApiKey',
    legacyAsyncKey: '@sta/twelve_data_api_key',
    envNames: ['EXPO_PUBLIC_TWELVE_DATA_API_KEY', 'TWELVE_DATA_API_KEY'],
  });
}

export function logTwelveDataConnectionTestFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.log('[TWELVE TEST FAIL]', {
    message: message.slice(0, 200),
    baseUrl: TWELVE_DATA_BASE_URL,
  });
}
