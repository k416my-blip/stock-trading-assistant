const DEPOSIT_RE =
  /(?:入金|預け入|deposit|deposited|振込|振り込)/i;
const BUY_RE = /(?:買(?:った|付|い)|購入|bought|buy\b)/i;
const SELL_RE = /(?:売(?:った|却|り)|sold|sell\b)/i;
const DIVIDEND_RE = /(?:配当|dividend)/i;
const AMOUNT_RE =
  /(?:RM\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*(?:リンギット|ringgit|MYR|RM))/i;
const STOCK_RE =
  /(?:maybank|マレー銀行|malayan banking|cimb|シンバ|\d{4}|\d+\s*株|\d+\s*shares?)/i;

/** Heuristic: user wants to record a Rakuten Trade transaction (not general chat). */
export function detectRakutenImportIntent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 280) return false;

  if (DIVIDEND_RE.test(trimmed)) return true;

  if (DEPOSIT_RE.test(trimmed) && AMOUNT_RE.test(trimmed)) return true;
  if (/^RM\s*\d+/i.test(trimmed) && DEPOSIT_RE.test(trimmed)) return true;

  if (BUY_RE.test(trimmed) && (STOCK_RE.test(trimmed) || AMOUNT_RE.test(trimmed))) {
    return true;
  }

  if (SELL_RE.test(trimmed) && STOCK_RE.test(trimmed)) return true;

  return false;
}
