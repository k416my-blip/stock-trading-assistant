/**
 * 実口座 — entryPrice固定 · 株数削減で手数料込み現金内に収める
 */
import type { ManualOrderItem } from '../types';
import { syncManualOrderAllocation } from './manualOrderEntryPrice';

/** 削減優先（先頭=先に100株削減 · v4買い優先度の逆） */
export const MALAYSIA_V4_SHARE_REDUCTION_PRIORITY = [
  '6742', // YTL — 超過解消最優先
  '5347', // TENAGA
  '3336', // IJM
  '5398', // GAMUDA
  '1023', // CIMB — 買い増し優先 · 最後まで維持
] as const;

export const SHARE_REDUCTION_CHUNK = 100;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function syncManualOrderShares(
  order: ManualOrderItem,
  estimatedShares: number,
): ManualOrderItem {
  return syncManualOrderAllocation(order, order.entryPrice, estimatedShares);
}

function cloneOrders(orders: ManualOrderItem[]): ManualOrderItem[] {
  return orders.map((o) => ({ ...o }));
}

export function activeBuyOrders(orders: ManualOrderItem[]): ManualOrderItem[] {
  return orders.filter((o) => !o.completed && o.side === 'buy' && o.estimatedShares > 0);
}

export type ShareReductionStep = {
  symbol: string;
  labelJa: string;
  sharesRemoved: number;
  entryPriceMYR: number;
  sharesAfter: number;
  savedOrderMYR: number;
};

export type ShareReductionProposal = {
  originalOrders: ManualOrderItem[];
  proposedOrders: ManualOrderItem[];
  reductions: ShareReductionStep[];
  shortfallMYR: number;
  entryPricesUnchanged: boolean;
  rakutenPriceMatch: boolean;
};

export function verifyEntryPricesUnchanged(
  original: ManualOrderItem[],
  proposed: ManualOrderItem[],
): boolean {
  return original.every((orig) => {
    const next = proposed.find((p) => p.id === orig.id);
    if (!next) return orig.estimatedShares === 0;
    return round3(next.entryPrice) === round3(orig.entryPrice);
  });
}

/** entryPrice は変更せず 100株単位で削減提案 */
export function proposeShareReductionToFitCash(
  orders: ManualOrderItem[],
  cashMYR: number,
  fundingFn: (input: { cashMYR: number; orders: ManualOrderItem[] }) => {
    canPlaceOrders: boolean;
    grandTotalMYR: number;
    balanceAfterMYR: number;
  },
): ShareReductionProposal {
  const originalOrders = cloneOrders(orders.filter((o) => !o.completed && o.side === 'buy'));
  let proposed = cloneOrders(originalOrders);
  const reductions: ShareReductionStep[] = [];

  const originalFunding = fundingFn({ cashMYR, orders: activeBuyOrders(proposed) });
  const shortfallMYR = round3(
    Math.max(0, originalFunding.grandTotalMYR - cashMYR),
  );

  if (originalFunding.canPlaceOrders) {
    return {
      originalOrders,
      proposedOrders: proposed,
      reductions: [],
      shortfallMYR: 0,
      entryPricesUnchanged: true,
      rakutenPriceMatch: true,
    };
  }

  let guard = 0;
  while (guard++ < 64) {
    const funding = fundingFn({ cashMYR, orders: activeBuyOrders(proposed) });
    if (funding.canPlaceOrders) break;

    let reduced = false;
    for (const sym of MALAYSIA_V4_SHARE_REDUCTION_PRIORITY) {
      const idx = proposed.findIndex(
        (o) =>
          o.symbol === sym &&
          !o.completed &&
          o.side === 'buy' &&
          o.estimatedShares >= SHARE_REDUCTION_CHUNK,
      );
      if (idx < 0) continue;

      const before = proposed[idx]!;
      const entryPriceMYR = before.entryPrice;
      const afterShares = before.estimatedShares - SHARE_REDUCTION_CHUNK;
      proposed[idx] = syncManualOrderShares(before, afterShares);
      reductions.push({
        symbol: sym,
        labelJa: before.name,
        sharesRemoved: SHARE_REDUCTION_CHUNK,
        entryPriceMYR,
        sharesAfter: afterShares,
        savedOrderMYR: round3(SHARE_REDUCTION_CHUNK * entryPriceMYR),
      });
      reduced = true;
      break;
    }
    if (!reduced) break;
  }

  const entryPricesUnchanged = verifyEntryPricesUnchanged(originalOrders, proposed);
  const rakutenPriceMatch = entryPricesUnchanged;

  return {
    originalOrders,
    proposedOrders: activeBuyOrders(proposed),
    reductions,
    shortfallMYR,
    entryPricesUnchanged,
    rakutenPriceMatch,
  };
}
