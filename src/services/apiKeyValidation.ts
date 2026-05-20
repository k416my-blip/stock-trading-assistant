/** Reject empty, masked, or placeholder API keys before network calls. */

export function normalizeStoredApiKey(raw: string): string {
  let key = raw.trim();
  if (/^bearer\s+/i.test(key)) {
    key = key.replace(/^bearer\s+/i, '').trim();
  }
  return key;
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
