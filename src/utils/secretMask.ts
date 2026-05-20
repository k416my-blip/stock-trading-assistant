/** APIキー・トークンの表示用マスク（ログ/UI） */
export function maskSecret(value: string | null | undefined, visibleTail = 4): string {
  const raw = (value ?? '').trim();
  if (!raw) return '(未設定)';
  if (raw.length <= visibleTail + 2) return '****';
  const tail = raw.slice(-visibleTail);
  const prefix = raw.includes('_') ? raw.split('_')[0] + '_' : '';
  if (prefix && prefix.length < raw.length - visibleTail) {
    return `${prefix}****${tail}`;
  }
  return `****${tail}`;
}

const SECRET_PATTERNS: RegExp[] = [
  /apikey[=:]\s*['"]?([a-zA-Z0-9_\-]{8,})['"]?/gi,
  /authorization[=:]\s*['"]?([^\s'"]{8,})['"]?/gi,
  /bearer\s+([a-zA-Z0-9_\-\.]{8,})/gi,
  /sk_[a-z]+_[a-zA-Z0-9]{8,}/gi,
];

export function redactSecretsInString(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, (match) => {
      if (match.length <= 12) return '****';
      return match.slice(0, 4) + '****' + match.slice(-4);
    });
  }
  if (out.includes('apikey')) {
    out = out.replace(/"apikey"\s*:\s*"[^"]+"/gi, '"apikey":"***"');
  }
  return out;
}
