import { YAHOO_CHART_PARSE_FAILED_MESSAGE } from '../constants/yahooFinance';

/** UI に巨大 JSON や生レスポンスを出さない */
export function looksLikeJsonPayload(text: string): boolean {
  const t = text.trim();
  if (t.startsWith('{') || t.startsWith('[')) return true;
  if (t.includes('"timestamp"') && (t.includes('"close"') || t.includes('"quote"'))) return true;
  return false;
}

export function sanitizeErrorForUi(
  text: string | undefined,
  fallback = YAHOO_CHART_PARSE_FAILED_MESSAGE,
): string {
  if (!text?.trim()) return fallback;
  const t = text.trim();
  if (looksLikeJsonPayload(t)) return fallback;
  if (t.length > 120) return `${t.slice(0, 120)}…`;
  return t;
}
