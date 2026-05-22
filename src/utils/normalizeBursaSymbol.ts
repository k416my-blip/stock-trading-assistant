import type { Market } from '../types';
import { normalizeYahooSymbol } from './normalizeYahooSymbol';

/** Bursa / Malaysia 市場か（market='bursa' または 'Malaysia'） */
export function isMalaysiaMarket(market: Market | string | undefined | null): boolean {
  if (market == null) return false;
  const m = String(market).trim().toLowerCase();
  return m === 'bursa' || m === 'malaysia' || m === 'my';
}

/**
 * Twelve Data / Yahoo 共通 Bursa ティッカー（必ず *.KL）。
 * 7103 → 7103.KL, 1818 → 1818.KL
 */
export function normalizeBursaSymbol(symbol: string): string {
  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) return trimmed;
  if (trimmed.endsWith('.KL')) return trimmed;
  return normalizeYahooSymbol(trimmed, 'bursa');
}

/** market が Malaysia / bursa のとき apiSymbol に .KL を付与 */
export function normalizeSymbolForMarket(symbol: string, market: Market | string): string {
  if (isMalaysiaMarket(market)) {
    return normalizeBursaSymbol(symbol);
  }
  return normalizeYahooSymbol(symbol, market as Market);
}

/** API に裸ティッカー（.KL なし）を送らないよう検証 */
export function isBareBursaTicker(symbol: string): boolean {
  const upper = symbol.trim().toUpperCase();
  if (!upper || upper.endsWith('.KL')) return false;
  return /^[0-9]{3,4}[A-Z]{0,3}$/i.test(upper.replace(/^(KLSE|BURSA):/i, ''));
}
