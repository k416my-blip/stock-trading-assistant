import type { PortfolioPosition } from '../types';

export function buildSymbolWeightPctMap(holdings: PortfolioPosition[]): Record<string, number> {
  const active = holdings.filter((p) => (p.shares ?? 0) > 0);
  let total = 0;
  const valueBySymbol: Record<string, number> = {};
  for (const p of active) {
    const price = p.currentPrice ?? p.averageBuyPrice ?? 0;
    const v = price * (p.shares ?? 0);
    valueBySymbol[p.symbol.toUpperCase()] = (valueBySymbol[p.symbol.toUpperCase()] ?? 0) + v;
    total += v;
  }
  const out: Record<string, number> = {};
  if (total <= 0) {
    const share = active.length > 0 ? 100 / active.length : 0;
    for (const p of active) out[p.symbol.toUpperCase()] = share;
    return out;
  }
  for (const [sym, v] of Object.entries(valueBySymbol)) {
    out[sym] = (v / total) * 100;
  }
  return out;
}
