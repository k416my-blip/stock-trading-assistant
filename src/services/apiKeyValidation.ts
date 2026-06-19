/** Reject empty, masked, or placeholder API keys before network calls. */

export const MIN_API_KEY_LENGTH = 10;

const PLACEHOLDER_EXACT = new Set([
  'apiキーを入力',
  'api key',
  'apiキー',
  'openai api key',
  'twelve data api key',
  'newsapi key',
  'bearer token',
  '未設定',
  '未設定の場合は参考推定',
  '未設定の場合は参考推定',
]);

export function normalizeStoredApiKey(raw: string): string {
  let key = raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  if (/^bearer\s+/i.test(key)) {
    key = key.replace(/^bearer\s+/i, '').trim();
  }
  return key;
}

/** Twelve Data 専用 — URL 貼り付けや apikey= 付き文字列を除去 */
export function normalizeTwelveDataApiKey(raw: string): string {
  let key = normalizeStoredApiKey(raw);
  if (!key) return '';
  const fromQuery = key.match(/(?:^|[?&])apikey=([^&]+)/i);
  if (fromQuery?.[1]) {
    key = decodeURIComponent(fromQuery[1].trim());
  }
  if (/^https?:\/\//i.test(key)) {
    try {
      const url = new URL(key);
      const param = url.searchParams.get('apikey');
      if (param?.trim()) key = param.trim();
    } catch {
      /* keep trimmed string */
    }
  }
  return key.trim();
}

export function isMaskedOrEmptyApiKey(raw: string | null | undefined): boolean {
  const key = normalizeStoredApiKey(raw ?? '');
  if (!key) return true;
  if (/^\*+$/.test(key)) return true;
  if (/^•+$/.test(key)) return true;
  if (key.includes('****')) return true;
  if (/^x+$/i.test(key) && key.length >= 4) return true;
  return false;
}

export function isUsableApiKey(raw: string | null | undefined): boolean {
  return !isMaskedOrEmptyApiKey(raw);
}

export function isPlaceholderApiKey(raw: string | null | undefined): boolean {
  const key = normalizeStoredApiKey(raw ?? '');
  if (!key) return true;
  const lower = key.toLowerCase();
  if (PLACEHOLDER_EXACT.has(lower)) return true;
  if (/未設定の場合/.test(lower)) return true;
  if (/^your[_-]?api/i.test(key)) return true;
  if (/^sk-your/i.test(lower)) return true;
  return false;
}

/** 永続化してよいキーか（空・マスク・短すぎ・プレースホルダを拒否） */
export function canPersistApiKeyValue(
  raw: string | null | undefined,
  options?: { minLength?: number },
): boolean {
  if (raw == null || raw === undefined) return false;
  const key = normalizeStoredApiKey(String(raw));
  if (!key) return false;
  if (isMaskedOrEmptyApiKey(key)) return false;
  const minLen = options?.minLength ?? MIN_API_KEY_LENGTH;
  if (key.length < minLen) return false;
  if (isPlaceholderApiKey(key)) return false;
  return true;
}

export function canPersistTwelveDataApiKey(raw: string | null | undefined): boolean {
  if (raw == null || raw === undefined) return false;
  const key = normalizeTwelveDataApiKey(String(raw));
  if (!key) return false;
  if (isMaskedOrEmptyApiKey(key)) return false;
  if (key.length < MIN_API_KEY_LENGTH) return false;
  if (isPlaceholderApiKey(key)) return false;
  return true;
}
