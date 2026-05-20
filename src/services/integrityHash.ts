/** 永続化ペイロードの簡易整合性ハッシュ */
export function computeIntegrityHash(payload: unknown): string {
  const canonical = typeof payload === 'string' ? payload : stableStringify(payload);
  let hash = 5381;
  for (let i = 0; i < canonical.length; i += 1) {
    hash = (hash * 33) ^ canonical.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableStringify(value: unknown): string {
  if (value == null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function verifyIntegrityHash(payload: unknown, expected: string): boolean {
  if (!expected) return false;
  return computeIntegrityHash(payload) === expected;
}
