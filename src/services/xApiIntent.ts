import type { Market } from '../types';
import { findStock } from '../data/sampleStocks';

const X_INTENT =
  /\b(x|twitter|ツイッター|ツイート|sns|ソーシャル|話題|バズ|投稿|世論|センチメント)\b/i;

const SYMBOL_RE = /\b\d{3,5}[A-Z]{0,3}\b/gi;
const TICKER_WORDS = /\b(AAPL|TSLA|NVDA|MSFT|GOOGL|AMZN|META)\b/gi;

export function userMessageRequestsXInsight(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  return X_INTENT.test(t);
}

export function extractSymbolsForXLookup(
  message: string,
  holdings: Array<{ symbol: string; market: Market }>,
): Array<{ symbol: string; market: Market }> {
  const found = new Map<string, { symbol: string; market: Market }>();

  for (const match of message.matchAll(SYMBOL_RE)) {
    const sym = match[0].toUpperCase();
    const held = holdings.find((h) => h.symbol.toUpperCase().replace(/\.KL$/, '') === sym);
    const stock = findStock(sym);
    found.set(sym, {
      symbol: held?.symbol ?? stock?.symbol ?? sym,
      market: held?.market ?? stock?.market ?? 'bursa',
    });
  }

  for (const match of message.matchAll(TICKER_WORDS)) {
    const sym = match[0].toUpperCase();
    const stock = findStock(sym);
    if (stock) {
      found.set(sym, { symbol: stock.symbol, market: stock.market });
    }
  }

  if (found.size === 0 && holdings.length === 1) {
    const h = holdings[0];
    return [{ symbol: h.symbol, market: h.market }];
  }

  return [...found.values()].slice(0, 2);
}
