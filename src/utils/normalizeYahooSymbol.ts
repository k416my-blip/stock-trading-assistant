import type { Market } from '../types';
import { isMalaysiaMarket } from './normalizeBursaSymbol';

/** Bursa コア（4707 / 5183 / 0820EA）— プレフィックス・.KL を除去 */
export function normalizeBursaCoreForYahoo(symbol: string): string {
  let clean = symbol.trim().toUpperCase();
  clean = clean.replace(/^(KLSE|BURSA):/i, '');
  clean = clean.replace(/:KL$/i, '');
  clean = clean.replace(/\.KL$/i, '');
  return clean;
}

/**
 * Yahoo Finance API 送信前のティッカー正規化。
 * 数字のみ・4桁 Bursa → *.KL（例: 5183 → 5183.KL, 1155 → 1155.KL）
 */
export function normalizeYahooSymbol(symbol: string, market: Market): string {
  const raw = symbol.trim();
  if (!raw) return raw;

  if (isMalaysiaMarket(market)) {
    const core = normalizeBursaCoreForYahoo(raw);
    if (/^[0-9]{3,5}[A-Z]{0,3}$/i.test(core)) {
      return `${core}.KL`;
    }
    if (/\.KL$/i.test(raw)) return raw.toUpperCase();
    return `${core}.KL`;
  }

  if (market === 'hk') {
    const core = raw.replace(/\.HK$/i, '').replace(/^0+/, '') || '0';
    const padded = core.padStart(4, '0');
    return /\.HK$/i.test(raw) ? raw.toUpperCase() : `${padded}.HK`;
  }

  return raw.toUpperCase();
}
