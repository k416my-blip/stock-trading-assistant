import { ORDER_EXPIRY_MS } from '../constants/shadowTrading';
import type {
  BrokerConfirmation,
  ShadowFill,
  ShadowOrder,
  ShadowPortfolioState,
  ShadowPosition,
  SubmitShadowOrderInput,
} from '../types/shadowTrading';
import type { AdaptiveExecutionHints } from '../types/adaptiveExecution';
import { simulateExecutionRealism } from './shadowExecutionEngine';
import { applyTradeToPortfolio } from './portfolio';
import { toMYR } from './fx';
import { safeShares, safePrice } from '../utils/safeNumeric';

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function addConfirmation(order: ShadowOrder, messageJa: string): BrokerConfirmation {
  const c: BrokerConfirmation = {
    id: uid('conf'),
    orderId: order.id,
    messageJa,
    timestamp: new Date().toISOString(),
  };
  order.confirmations.push(c);
  return c;
}

/** シャドー注文送信（実注文なし） */
export function submitShadowOrder(
  state: ShadowPortfolioState,
  input: SubmitShadowOrderInput,
  options?: { capitalPreservationBlock?: boolean; adaptiveHints?: AdaptiveExecutionHints },
): { state: ShadowPortfolioState; order: ShadowOrder; rejected: boolean } {
  if (options?.capitalPreservationBlock && input.side === 'buy') {
    const order: ShadowOrder = {
      id: uid('ord'),
      ...input,
      status: 'rejected',
      filledShares: 0,
      avgFillPrice: 0,
      expectedPrice: input.expectedPrice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executeAfterMs: 0,
      rejectReasonJa: '資本保全モード — 新規買い停止',
      confirmations: [],
    };
    addConfirmation(order, 'ブローカー拒否: 資本保全モード');
    return {
      state: { ...state, orders: [...state.orders, order] },
      order,
      rejected: true,
    };
  }

  const realism = simulateExecutionRealism({
    input,
    config: state.config,
    adaptiveHints: options?.adaptiveHints,
    liquidityScore: options?.adaptiveHints?.liquidityScore,
  });
  if (realism.stalePriceRejected) {
    const order: ShadowOrder = {
      id: uid('ord'),
      ...input,
      status: 'rejected',
      filledShares: 0,
      avgFillPrice: 0,
      expectedPrice: input.expectedPrice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executeAfterMs: 0,
      rejectReasonJa: realism.noteJa,
      confirmations: [],
    };
    addConfirmation(order, '拒否: ステール価格');
    return {
      state: { ...state, orders: [...state.orders, order] },
      order,
      rejected: true,
    };
  }

  const order: ShadowOrder = {
    id: uid('ord'),
    ...input,
    status: 'pending',
    filledShares: 0,
    avgFillPrice: 0,
    expectedPrice: input.expectedPrice,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    executeAfterMs: Date.now() + realism.delayMs,
    confirmations: [],
  };
  addConfirmation(order, `注文受付 — ${input.side === 'buy' ? '買' : '売'} ${input.shares}株 @ ${input.expectedPrice}`);

  return {
    state: { ...state, orders: [...state.orders, order] },
    order,
    rejected: false,
  };
}

/** 保留注文の処理（部分約定・完了） */
export function processPendingShadowOrders(
  state: ShadowPortfolioState,
  priceBySymbol: Map<string, number>,
): ShadowPortfolioState {
  const now = Date.now();
  let next = { ...state, orders: [...state.orders], fills: [...state.fills], ledger: [...state.ledger] };

  for (const order of next.orders) {
    if (order.status !== 'pending' && order.status !== 'partially_filled') continue;
    if (now < order.executeAfterMs) continue;
    if (now - new Date(order.createdAt).getTime() > ORDER_EXPIRY_MS) {
      order.status = 'expired';
      order.updatedAt = new Date().toISOString();
      addConfirmation(order, '期限切れ');
      continue;
    }

    const px = priceBySymbol.get(`${order.market}:${order.symbol}`) ?? order.expectedPrice;
    const realism = simulateExecutionRealism({
      input: {
        ...order,
        expectedPrice: px,
        priceUpdatedAt: new Date().toISOString(),
      },
      config: state.config,
    });

    const remaining = order.shares - order.filledShares;
    const fillShares = Math.max(1, Math.floor(remaining * realism.fillPct));
    const actualFill = Math.min(fillShares, remaining);
    if (actualFill <= 0) continue;

    const fill: ShadowFill = {
      id: uid('fill'),
      orderId: order.id,
      symbol: order.symbol,
      market: order.market,
      currency: order.currency,
      side: order.side,
      shares: actualFill,
      fillPrice: realism.fillPrice,
      slippageBps: realism.slippageBps,
      spreadBps: realism.spreadBps,
      expectedPrice: order.expectedPrice,
      filledAt: new Date().toISOString(),
      noteJa: realism.noteJa,
    };
    next.fills.push(fill);

    const prevFilled = order.filledShares;
    order.filledShares += actualFill;
    order.avgFillPrice =
      prevFilled === 0
        ? realism.fillPrice
        : (order.avgFillPrice * prevFilled + realism.fillPrice * actualFill) / order.filledShares;
    order.status = order.filledShares >= order.shares ? 'filled' : 'partially_filled';
    order.updatedAt = new Date().toISOString();
    addConfirmation(
      order,
      `約定 ${actualFill}株 @ ${realism.fillPrice.toFixed(4)} (${order.status})`,
    );

    next = applyFillToPortfolio(next, fill);
  }

  return next;
}

function applyFillToPortfolio(state: ShadowPortfolioState, fill: ShadowFill): ShadowPortfolioState {
  const feeMYR = toMYR(fill.shares * fill.fillPrice * 0.0003, fill.currency);
  const costMYR = toMYR(fill.shares * fill.fillPrice, fill.currency) + feeMYR;
  let cash = state.cashBalanceMYR;
  let positions = state.positions.map((p) => ({ ...p }));

  if (fill.side === 'buy') {
    if (costMYR > cash) return state;
    cash -= costMYR;
    const applied = applyTradeToPortfolio(
      positions,
      {
        id: fill.id,
        symbol: fill.symbol,
        market: fill.market,
        currency: fill.currency,
        side: 'buy',
        shares: fill.shares,
        price: fill.fillPrice,
        brokerageFee: feeMYR,
        executedAt: fill.filledAt,
      },
    );
    positions = applied.map((p) => {
      const sh = safeShares(p.shares, 0);
      const pr = safePrice(p.averageBuyPrice, fill.fillPrice, 0);
      return { ...p, costBasisMYR: toMYR(sh * pr, p.currency) } as ShadowPosition;
    });
  } else {
    const pos = positions.find((p) => p.symbol === fill.symbol && p.market === fill.market);
    if (!pos || pos.shares < fill.shares) return state;
    const proceeds = toMYR(fill.shares * fill.fillPrice, fill.currency) - feeMYR;
    cash += proceeds;
    positions = applyTradeToPortfolio(positions, {
      id: fill.id,
      symbol: fill.symbol,
      market: fill.market,
      currency: fill.currency,
      side: 'sell',
      shares: fill.shares,
      price: fill.fillPrice,
      brokerageFee: feeMYR,
      executedAt: fill.filledAt,
    }).map(
      (p) =>
        ({
          ...p,
          costBasisMYR: toMYR(safeShares(p.shares, 0) * safePrice(p.averageBuyPrice, 0, 0), p.currency),
        }) as ShadowPosition,
    );
  }

  const ledgerEntry = {
    id: uid('led'),
    timestamp: fill.filledAt,
    type: fill.side === 'buy' ? ('buy' as const) : ('sell' as const),
    amountMYR: fill.side === 'buy' ? -costMYR : costMYR,
    balanceAfterMYR: cash,
    noteJa: `${fill.symbol} ${fill.shares}株 @ ${fill.fillPrice}`,
  };

  return {
    ...state,
    cashBalanceMYR: cash,
    positions,
    ledger: [...state.ledger, ledgerEntry],
  };
}

export function cancelShadowOrder(state: ShadowPortfolioState, orderId: string): ShadowPortfolioState {
  const orders = state.orders.map((o) => {
    if (o.id !== orderId || (o.status !== 'pending' && o.status !== 'partially_filled')) return o;
    const updated = { ...o, status: 'canceled' as const, updatedAt: new Date().toISOString() };
    addConfirmation(updated, 'ユーザー取消');
    return updated;
  });
  return { ...state, orders };
}
