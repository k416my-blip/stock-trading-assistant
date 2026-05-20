import { HOLDING_ERRORS } from '../constants/holdingErrors';
import type { AppState, ManualOrderItem, TradeRecord } from '../types';
import type { ExecutionJournalEntry } from '../types/execution';
import { applyTradeToPortfolio, appendPerformanceSnapshot, portfolioMarketValueMYR } from './portfolio';
import { sanitizePortfolio } from './portfolioPriceUpdate';
import { isValidQuotePrice } from '../utils/safeNumeric';
import type { HoldingMutationResult } from './portfolioHoldings';

export type ManualOrderConfirmInput = {
  shares: number;
  executedPrice: number;
  memo?: string;
};

export function validateManualOrderConfirmInput(
  input: ManualOrderConfirmInput,
): { ok: true } | { ok: false; error: string } {
  if (!Number.isFinite(input.shares) || input.shares <= 0) {
    return { ok: false, error: HOLDING_ERRORS.invalidQuantity };
  }
  if (!isValidQuotePrice(input.executedPrice)) {
    return { ok: false, error: HOLDING_ERRORS.invalidExecutedPrice };
  }
  return { ok: true };
}

function buildJournalEntry(
  record: TradeRecord,
  order: ManualOrderItem,
  memo?: string,
): ExecutionJournalEntry {
  const now = record.executedAt;
  return {
    orderId: `manual-order-${order.id}`,
    idempotencyKey: `rakuten_trade_manual:${order.id}:${now}`,
    ledgerMode: 'manual',
    symbol: record.symbol,
    market: record.market,
    currency: record.currency,
    side: record.side,
    quantity: record.shares,
    requestedPrice: order.entryPrice,
    executedPrice: record.price,
    filledQuantity: record.shares,
    status: 'confirmed',
    createdAt: now,
    updatedAt: now,
    tradeRecordId: record.id,
    recordSource: 'rakuten_trade_manual',
    userConfirmationStatus: 'confirmed_by_user',
    errorReason: memo?.trim() ? `memo:${memo.trim()}` : undefined,
  };
}

/** Confirm a manual checklist order after user executed it in Rakuten Trade. */
export function confirmManualOrderInState(
  state: AppState,
  orderId: string,
  input: ManualOrderConfirmInput,
): HoldingMutationResult {
  if (state.appMode === 'practice') {
    return { ok: false, error: HOLDING_ERRORS.manualConfirmLiveAnalysisOnly };
  }

  const validated = validateManualOrderConfirmInput(input);
  if (!validated.ok) return validated;

  const order = state.manualOrderList.find((i) => i.id === orderId);
  if (!order) {
    return { ok: false, error: HOLDING_ERRORS.orderNotFound };
  }
  if (order.completed) {
    return { ok: false, error: HOLDING_ERRORS.orderNotFound };
  }

  const portfolio = sanitizePortfolio(state.portfolio);

  if (order.side === 'sell') {
    const existing = portfolio.find(
      (p) => p.market === order.market && p.symbol.toUpperCase() === order.symbol.toUpperCase(),
    );
    if (!existing || existing.shares < input.shares) {
      return { ok: false, error: HOLDING_ERRORS.insufficientShares };
    }
  }

  const executedAt = new Date().toISOString();
  const trade: Omit<TradeRecord, 'id'> = {
    symbol: order.symbol.toUpperCase(),
    market: order.market,
    currency: order.currency,
    side: order.side,
    shares: input.shares,
    price: input.executedPrice,
    brokerageFee: 0,
    executedAt,
    notes:
      input.memo?.trim() ||
      `手動注文リスト実行済み（${order.source}）`,
  };

  const record: TradeRecord = {
    ...trade,
    id: `rakuten_manual-${executedAt}-${order.market}-${order.symbol}-${order.side}`,
  };

  const nextPortfolio = applyTradeToPortfolio(portfolio, record);
  const valueMYR = portfolioMarketValueMYR({ ...state, portfolio: nextPortfolio });
  const today = new Date().toISOString().slice(0, 10);
  const performanceHistory = appendPerformanceSnapshot(
    state.performanceHistory,
    today,
    valueMYR,
  );

  const manualOrderList = state.manualOrderList.map((i) =>
    i.id === orderId ? { ...i, completed: true } : i,
  );

  const next: AppState = {
    ...state,
    portfolio: nextPortfolio,
    trades: [record, ...state.trades],
    manualOrderList,
    performanceHistory,
  };

  return {
    ok: true,
    state: next,
    journalEntry: buildJournalEntry(record, order, input.memo),
  };
}
