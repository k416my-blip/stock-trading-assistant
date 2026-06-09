/**
 * 注文評価額 — 指値ベース vs Yahoo終値（mark-to-market）
 * 拘束現金・注文超過判定は orderPrice / allocationMYR を使用
 */
import type { ManualOrderItem, PortfolioPosition } from '../types';
import { findStock } from '../data/sampleStocks';
import { getPendingMalaysiaOrders } from './realAccountPortfolio';
import { safePrice } from '../utils/safeNumeric';

export type PendingOrderValuationMode = 'order_price' | 'yahoo_market';

export type PendingOrderValuationRow = {
  orderId: string;
  symbol: string;
  labelJa: string;
  shares: number;
  limitPriceMYR: number;
  allocationMYR: number;
  orderPriceMYR: number;
  yahooCloseMYR: number | null;
  yahooMarketValueMYR: number | null;
  orderVsYahooDeltaMYR: number | null;
  allocationVsOrderDeltaMYR: number;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function yahooClose(
  symbol: string,
  priceBySymbol?: Record<string, number>,
): number | null {
  if (priceBySymbol?.[symbol] != null) return priceBySymbol[symbol]!;
  const sample = findStock(symbol)?.price;
  return sample != null && sample > 0 ? sample : null;
}

/** 指値×株数（allocationMYR フォールバック） */
export function pendingOrderAmountMYR(order: ManualOrderItem): number {
  const byLimit = round3(order.entryPrice * order.estimatedShares);
  if (byLimit > 0) return byLimit;
  return round3(order.allocationMYR);
}

export function buildPendingOrderValuationRows(
  orders: ManualOrderItem[],
  priceBySymbol?: Record<string, number>,
): PendingOrderValuationRow[] {
  return getPendingMalaysiaOrders(orders).map((o) => {
    const orderPriceMYR = pendingOrderAmountMYR(o);
    const yahoo = yahooClose(o.symbol, priceBySymbol);
    const yahooMarketValueMYR =
      yahoo != null && yahoo > 0 ? round3(yahoo * o.estimatedShares) : null;
    return {
      orderId: o.id,
      symbol: o.symbol,
      labelJa: o.name,
      shares: o.estimatedShares,
      limitPriceMYR: o.entryPrice,
      allocationMYR: round3(o.allocationMYR),
      orderPriceMYR,
      yahooCloseMYR: yahoo,
      yahooMarketValueMYR,
      orderVsYahooDeltaMYR:
        yahooMarketValueMYR != null ? round3(orderPriceMYR - yahooMarketValueMYR) : null,
      allocationVsOrderDeltaMYR: round3(o.allocationMYR - orderPriceMYR),
    };
  });
}

export function computePendingOrderValuationTotalMYR(
  orders: ManualOrderItem[],
  mode: PendingOrderValuationMode = 'order_price',
  priceBySymbol?: Record<string, number>,
): number {
  const rows = buildPendingOrderValuationRows(orders, priceBySymbol);
  if (mode === 'yahoo_market') {
    return round3(
      rows.reduce((s, r) => s + (r.yahooMarketValueMYR ?? r.orderPriceMYR), 0),
    );
  }
  return round3(rows.reduce((s, r) => s + r.orderPriceMYR, 0));
}

/** @deprecated 互換 — デフォルトは指値ベース。mark-to-market は mode=yahoo_market */
export function computePendingOrderMarketValueMYR(
  orders: ManualOrderItem[],
  priceBySymbol?: Record<string, number>,
  _positions?: PortfolioPosition[],
  mode: PendingOrderValuationMode = 'order_price',
): number {
  return computePendingOrderValuationTotalMYR(orders, mode, priceBySymbol);
}
