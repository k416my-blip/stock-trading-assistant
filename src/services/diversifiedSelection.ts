import { categoryMixForStyle } from '../constants/stockCatalog';
import type { InvestmentStyle, StockCategory, StockFundamentals } from '../types';
import { isBeginnerFriendly, isMegaCap, isTooExpensiveForSlot, oneShareMYR } from './stockCatalog';

export type ScoredStock = { stock: StockFundamentals; score: number };

function pickBestInCategory(
  pool: ScoredStock[],
  category: StockCategory,
  used: Set<string>,
  megaCapUsed: boolean,
  maxEachMYR: number,
  budgetPerSlotMYR: number,
  preferBeginner: boolean,
): StockFundamentals | undefined {
  const candidates = pool
    .filter((r) => r.stock.category === category && !used.has(r.stock.symbol))
    .filter((r) => !isTooExpensiveForSlot(r.stock, budgetPerSlotMYR, maxEachMYR))
    .filter((r) => !megaCapUsed || !isMegaCap(r.stock))
    .sort((a, b) => {
      let diff = b.score - a.score;
      if (preferBeginner) {
        const aBeg = isBeginnerFriendly(a.stock, budgetPerSlotMYR) ? 12 : 0;
        const bBeg = isBeginnerFriendly(b.stock, budgetPerSlotMYR) ? 12 : 0;
        diff += bBeg - aBeg;
      }
      return diff;
    });

  return candidates[0]?.stock;
}

function pickFallback(
  pool: ScoredStock[],
  used: Set<string>,
  megaCapUsed: boolean,
  maxEachMYR: number,
  budgetPerSlotMYR: number,
): StockFundamentals | undefined {
  const pick = pool.find(
    (r) =>
      !used.has(r.stock.symbol) &&
      !isTooExpensiveForSlot(r.stock, budgetPerSlotMYR, maxEachMYR) &&
      (!megaCapUsed || !isMegaCap(r.stock)),
  );
  return pick?.stock;
}

/**
 * カテゴリ分散＋メガキャップ上限1＋資金に合う銘柄を優先して選定
 */
export function pickDiversifiedStocks(
  ranked: ScoredStock[],
  count: number,
  style: InvestmentStyle,
  maxEachMYR: number,
  budgetPerSlotMYR: number,
  fractional: boolean,
): StockFundamentals[] {
  let pool = ranked;
  if (!fractional) {
    pool = ranked.filter((r) => oneShareFitsCap(r.stock, maxEachMYR));
  }

  const used = new Set<string>();
  const picked: StockFundamentals[] = [];
  let megaCapUsed = false;
  const preferBeginner = budgetPerSlotMYR < 400;
  const mix = categoryMixForStyle(style, count);

  for (const category of mix) {
    if (picked.length >= count) break;
    const stock =
      pickBestInCategory(pool, category, used, megaCapUsed, maxEachMYR, budgetPerSlotMYR, preferBeginner) ??
      pickFallback(pool, used, megaCapUsed, maxEachMYR, budgetPerSlotMYR);
    if (!stock) continue;
    used.add(stock.symbol);
    if (isMegaCap(stock)) megaCapUsed = true;
    picked.push(stock);
  }

  while (picked.length < count) {
    const stock = pickFallback(pool, used, megaCapUsed, maxEachMYR, budgetPerSlotMYR);
    if (!stock) break;
    used.add(stock.symbol);
    if (isMegaCap(stock)) megaCapUsed = true;
    picked.push(stock);
  }

  return picked;
}

function oneShareFitsCap(stock: StockFundamentals, maxEachMYR: number): boolean {
  return oneShareMYR(stock) <= maxEachMYR;
}
