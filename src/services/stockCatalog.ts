import { MEGA_CAP_THRESHOLD } from '../constants/stockCatalog';
import type { StockFundamentals } from '../types';
import { toMYR } from './fx';

export function isMegaCap(stock: StockFundamentals): boolean {
  return stock.marketCap >= MEGA_CAP_THRESHOLD;
}

export function oneShareMYR(stock: StockFundamentals): number {
  return Math.ceil(toMYR(stock.price, stock.currency));
}

export function isBeginnerFriendly(stock: StockFundamentals, budgetPerSlotMYR: number): boolean {
  if (stock.beginnerFriendly) return true;
  const one = oneShareMYR(stock);
  return one <= Math.max(80, budgetPerSlotMYR * 1.2);
}

export function isTooExpensiveForSlot(
  stock: StockFundamentals,
  budgetPerSlotMYR: number,
  maxEachMYR: number,
): boolean {
  const one = oneShareMYR(stock);
  return one > maxEachMYR || one > budgetPerSlotMYR * 2.5;
}
