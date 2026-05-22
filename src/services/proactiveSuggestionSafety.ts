const FORBIDDEN_PATTERNS = [
  /買ってください/,
  /売ってください/,
  /必ず買/,
  /必ず売/,
  /自動売買/,
  /今すぐ買/,
  /今すぐ売/,
];

const REQUIRED_SOFTENERS = ['参考', '候補', '確認', 'リスク', 'ご自身'];

export function sanitizeProactiveCopy(text: string): string {
  let out = text.trim();
  for (const re of FORBIDDEN_PATTERNS) {
    out = out.replace(re, '（参考情報としてご確認ください）');
  }
  if (!REQUIRED_SOFTENERS.some((w) => out.includes(w))) {
    out = `${out}（参考情報・確認が必要です）`;
  }
  return out;
}

export function isProactiveCopySafe(text: string): boolean {
  return !FORBIDDEN_PATTERNS.some((re) => re.test(text));
}
