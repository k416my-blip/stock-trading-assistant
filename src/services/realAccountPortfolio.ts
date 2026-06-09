/**
 * Rakuten実口座 — 約定済(Matched/Position) vs 注文中(Order) の分離
 * 推奨配分・評価額は matched のみ。約定後予想は projected として別計算。
 */
import type { AppState, ManualOrderItem, PortfolioPosition } from '../types';
import { isMalaysiaMarket } from '../utils/normalizeBursaSymbol';
import { safePrice, safeShares } from '../utils/safeNumeric';
import { getActivePortfolio } from './portfolioPriceUpdate';
import { portfolioMarketValueMYR } from './portfolio';
import { calculateBuyingPower } from './buyingPower';

export type RakutenAccountFlowStateId =
  | 'cash_only'
  | 'orders_pending'
  | 'partially_filled'
  | 'fully_filled';

export const RAKUTEN_FLOW_STATE_LABEL: Record<RakutenAccountFlowStateId, string> = {
  cash_only: '状態① 現金のみ',
  orders_pending: '状態② 注文中（約定0）',
  partially_filled: '状態③ 一部約定',
  fully_filled: '状態④ 全約定',
};

export type RealAccountOrderRow = {
  orderId: string;
  symbol: string;
  name: string;
  side: 'buy' | 'sell';
  estimatedShares: number;
  matchedShares: number;
  completed: boolean;
  entryPriceMYR: number;
  allocationMYR: number;
};

export type RealAccountSnapshot = {
  cashMYR: number;
  matchedPositions: PortfolioPosition[];
  pendingOrders: ManualOrderItem[];
  flowStateId: RakutenAccountFlowStateId;
  matchedStockValueMYR: number;
  pendingOrderValueMYR: number;
  orderRows: RealAccountOrderRow[];
};

export type RealAccountHoldingsResolution = {
  /** リバランス・AI配分に使う保有（Matchedのみ） */
  rebalanceHoldings: PortfolioPosition[];
  /** 全約定後の予想保有（pending buy を合成） */
  projectedAfterFullFill: PortfolioPosition[];
  snapshot: RealAccountSnapshot;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function getMatchedMalaysiaPositions(portfolio: PortfolioPosition[]): PortfolioPosition[] {
  return portfolio.filter(
    (p) => isMalaysiaMarket(p.market) && safeShares(p.shares, 0) > 0,
  );
}

export function getPendingMalaysiaOrders(manualOrderList: ManualOrderItem[]): ManualOrderItem[] {
  return manualOrderList.filter(
    (o) => isMalaysiaMarket(o.market) && !o.completed,
  );
}

export function matchedSharesForOrder(order: ManualOrderItem): number {
  return order.completed ? order.estimatedShares : 0;
}

export function buildOrderRows(orders: ManualOrderItem[]): RealAccountOrderRow[] {
  return orders.map((o) => ({
    orderId: o.id,
    symbol: o.symbol,
    name: o.name,
    side: o.side,
    estimatedShares: o.estimatedShares,
    matchedShares: matchedSharesForOrder(o),
    completed: o.completed,
    entryPriceMYR: o.entryPrice,
    allocationMYR: o.allocationMYR,
  }));
}

export function computeMatchedStockValueMYR(positions: PortfolioPosition[]): number {
  return round3(
    positions.reduce((s, p) => {
      const shares = safeShares(p.shares, 0);
      const price = safePrice(p.currentPrice, p.averageBuyPrice, 0);
      return s + price * shares;
    }, 0),
  );
}

export function computePendingOrderNotionalMYR(orders: ManualOrderItem[]): number {
  return round3(
    orders
      .filter((o) => !o.completed && o.side === 'buy')
      .reduce((s, o) => s + o.allocationMYR, 0),
  );
}

export function classifyRakutenFlowState(input: {
  matchedCount: number;
  pendingOrderCount: number;
  cashMYR: number;
}): RakutenAccountFlowStateId {
  const { matchedCount, pendingOrderCount, cashMYR } = input;
  if (matchedCount === 0 && pendingOrderCount === 0) return 'cash_only';
  if (matchedCount === 0 && pendingOrderCount > 0) return 'orders_pending';
  if (matchedCount > 0 && pendingOrderCount > 0) return 'partially_filled';
  if (matchedCount > 0 && pendingOrderCount === 0) return 'fully_filled';
  if (cashMYR > 0 && matchedCount === 0) return 'cash_only';
  return 'fully_filled';
}

/** pending buy 注文を約定済みと合成した予想ポートフォリオ（全約定仮定） */
export function projectPortfolioAfterFullFill(
  matched: PortfolioPosition[],
  pendingOrders: ManualOrderItem[],
  priceBySymbol?: Record<string, number>,
): PortfolioPosition[] {
  const byKey = new Map<string, PortfolioPosition>();

  for (const p of matched) {
    if (safeShares(p.shares, 0) <= 0) continue;
    byKey.set(`${p.market}:${p.symbol.toUpperCase()}`, { ...p });
  }

  for (const o of pendingOrders) {
    if (o.completed || o.side !== 'buy') continue;
    const key = `${o.market}:${o.symbol.toUpperCase()}`;
    const px = priceBySymbol?.[o.symbol] ?? o.entryPrice;
    const existing = byKey.get(key);
    if (existing) {
      const totalShares = existing.shares + o.estimatedShares;
      const avg =
        (existing.averageBuyPrice * existing.shares + o.entryPrice * o.estimatedShares) /
        totalShares;
      byKey.set(key, {
        ...existing,
        shares: totalShares,
        averageBuyPrice: round3(avg),
        currentPrice: round3(px),
      });
    } else {
      byKey.set(key, {
        id: `projected-${o.symbol}`,
        symbol: o.symbol,
        market: o.market,
        currency: o.currency,
        shares: o.estimatedShares,
        averageBuyPrice: o.entryPrice,
        currentPrice: round3(px),
        openedAt: o.createdAt,
        companyName: o.name,
        priceSource: 'manual',
      });
    }
  }

  return [...byKey.values()];
}

export function snapshotFromAppState(state: AppState): RealAccountSnapshot {
  const matchedPositions = getMatchedMalaysiaPositions(getActivePortfolio(state));
  const pendingOrders = getPendingMalaysiaOrders(state.manualOrderList);
  const buyingPower = calculateBuyingPower(state);
  const cashMYR = round3(buyingPower.buyingPowerMYR);

  return {
    cashMYR,
    matchedPositions,
    pendingOrders,
    flowStateId: classifyRakutenFlowState({
      matchedCount: matchedPositions.length,
      pendingOrderCount: pendingOrders.length,
      cashMYR,
    }),
    matchedStockValueMYR: computeMatchedStockValueMYR(matchedPositions),
    pendingOrderValueMYR: computePendingOrderNotionalMYR(pendingOrders),
    orderRows: buildOrderRows(
      state.manualOrderList.filter((o) => isMalaysiaMarket(o.market)),
    ),
  };
}

export function resolveRealAccountHoldings(input: {
  matchedPositions: PortfolioPosition[];
  pendingOrders: ManualOrderItem[];
  cashMYR: number;
  priceBySymbol?: Record<string, number>;
}): RealAccountHoldingsResolution {
  const matched = getMatchedMalaysiaPositions(input.matchedPositions);
  const pending = getPendingMalaysiaOrders(input.pendingOrders);
  const snapshot: RealAccountSnapshot = {
    cashMYR: input.cashMYR,
    matchedPositions: matched,
    pendingOrders: pending,
    flowStateId: classifyRakutenFlowState({
      matchedCount: matched.length,
      pendingOrderCount: pending.length,
      cashMYR: input.cashMYR,
    }),
    matchedStockValueMYR: computeMatchedStockValueMYR(matched),
    pendingOrderValueMYR: computePendingOrderNotionalMYR(pending),
    orderRows: buildOrderRows(input.pendingOrders.filter((o) => isMalaysiaMarket(o.market))),
  };

  return {
    rebalanceHoldings: matched,
    projectedAfterFullFill: projectPortfolioAfterFullFill(
      matched,
      pending,
      input.priceBySymbol,
    ),
    snapshot,
  };
}

/** AppState の評価額が manualOrderList を含まないことを検証用に露出 */
export function portfolioValueUsesMatchedOnly(state: AppState): {
  portfolioValueMYR: number;
  matchedOnlyValueMYR: number;
  includesPendingOrders: boolean;
} {
  const portfolioValueMYR = round3(portfolioMarketValueMYR(state));
  const matchedOnlyValueMYR = computeMatchedStockValueMYR(getMatchedMalaysiaPositions(state.portfolio));
  return {
    portfolioValueMYR,
    matchedOnlyValueMYR,
    includesPendingOrders: portfolioValueMYR !== matchedOnlyValueMYR,
  };
}

/** @deprecated 監査85合成用 — Rakuten実口座ではない */
export function buildSyntheticAuditHoldings(
  symbols: { symbol: string; shares: number; price: number; label: string }[],
): PortfolioPosition[] {
  const now = new Date().toISOString();
  return symbols.map((s, i) => ({
    id: `synthetic-${s.symbol}-${i}`,
    symbol: s.symbol,
    market: 'bursa' as const,
    currency: 'MYR' as const,
    shares: s.shares,
    averageBuyPrice: s.price,
    currentPrice: s.price,
    openedAt: now,
    companyName: s.label,
  }));
}
