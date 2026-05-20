import type { PortfolioPosition } from '../types';
import { isValidQuotePrice, safePrice, safeShares } from './safeNumeric';

function hasCorruptRawPrice(price: unknown): boolean {
  return typeof price === 'number' && !Number.isFinite(price);
}

/** 永続化・マージ破損など（重複ID・NaN・コード空） */
export function isPortfolioStructurallyCorrupt(portfolio: PortfolioPosition[]): boolean {
  const seenIds = new Set<string>();
  for (const p of portfolio) {
    const sh = safeShares(p.shares, -1);
    if (sh <= 0) continue;
    if (!Number.isFinite(sh)) return true;
    if (!String(p.symbol ?? '').trim()) return true;
    const avg = safePrice(p.averageBuyPrice, 0, 0);
    if (!Number.isFinite(avg) || avg <= 0) return true;
    if (hasCorruptRawPrice(p.currentPrice)) return true;
    const price = safePrice(p.currentPrice, avg, 0);
    if (!Number.isFinite(price)) return true;
    if (price > 0 && !isValidQuotePrice(price)) return true;
    if (seenIds.has(p.id)) return true;
    seenIds.add(p.id);
  }
  return false;
}

export function hasCorruptPortfolioPrice(price: unknown): boolean {
  return hasCorruptRawPrice(price);
}
