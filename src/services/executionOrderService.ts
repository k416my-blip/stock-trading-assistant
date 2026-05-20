import { EXECUTION_SAFETY_MESSAGES } from '../constants/executionSafety';
import type { PortfolioPosition, PracticeState, TradeRecord } from '../types';
import type {
  ExecutionJournalEntry,
  ExecutionOrderRequest,
  ExecutionSubmitResult,
  OrderStatus,
} from '../types/execution';
import {
  buildIdempotencyKey,
  buildOrderId,
  findDuplicateIdempotencyEntry,
  hasPendingOrderLock,
} from './executionIdempotency';
import {
  appendExecutionJournalEntry,
  loadExecutionJournal,
  updateExecutionJournalEntry,
} from './executionJournalStorage';
import { assessExecutionMarketData } from './executionSafetyGate';
import { executePracticeTrade, type PracticeTradeResult } from './practice';
import { applyTradeToPortfolio, appendPerformanceSnapshot, portfolioMarketValueMYR } from './portfolio';
import type { AppState } from '../types';

export type ExecutionHandlers = {
  getPosition: (
    market: ExecutionOrderRequest['market'],
    symbol: string,
    ledgerMode: ExecutionOrderRequest['ledgerMode'],
  ) => PortfolioPosition | undefined;
  applyPractice: (
    trade: Omit<TradeRecord, 'id'>,
  ) => { ok: true; practice: PracticeState } | { ok: false; error: string };
  applyManual: (trade: Omit<TradeRecord, 'id'>) => void;
};

function journalRow(
  request: ExecutionOrderRequest,
  orderId: string,
  idempotencyKey: string,
  status: OrderStatus,
  extra?: Partial<ExecutionJournalEntry>,
): ExecutionJournalEntry {
  const now = new Date().toISOString();
  return {
    orderId,
    idempotencyKey,
    ledgerMode: request.ledgerMode,
    symbol: request.symbol.toUpperCase(),
    market: request.market,
    currency: request.currency,
    side: request.side,
    quantity: request.quantity,
    requestedPrice: request.requestedPrice,
    status,
    createdAt: extra?.createdAt ?? now,
    updatedAt: now,
    ...extra,
  };
}

async function transition(
  entry: ExecutionJournalEntry,
  status: OrderStatus,
  patch?: Partial<ExecutionJournalEntry>,
): Promise<ExecutionJournalEntry> {
  const updated = await updateExecutionJournalEntry(entry.orderId, {
    status,
    ...patch,
  });
  return updated ?? { ...entry, status, ...patch, updatedAt: new Date().toISOString() };
}

/** 執行ジャーナル付き注文送信 — 確認完了後にのみ portfolio を更新 */
export async function submitExecutionOrder(
  request: ExecutionOrderRequest,
  handlers: ExecutionHandlers,
): Promise<ExecutionSubmitResult> {
  const journal = await loadExecutionJournal();
  const position = handlers.getPosition(request.market, request.symbol, request.ledgerMode);
  const marketData = assessExecutionMarketData(request.requestedPrice, position);

  if (!marketData.allowed) {
    return {
      ok: false,
      error: marketData.reasonJa ?? EXECUTION_SAFETY_MESSAGES.quoteUnavailable,
      blockedByStale: marketData.blockedByStale,
    };
  }

  const idempotencyKey = buildIdempotencyKey(request);
  if (findDuplicateIdempotencyEntry(journal.entries, idempotencyKey)) {
    return {
      ok: false,
      error: EXECUTION_SAFETY_MESSAGES.duplicateOrder,
      duplicate: true,
    };
  }

  if (
    hasPendingOrderLock(journal.entries, {
      ledgerMode: request.ledgerMode,
      market: request.market,
      symbol: request.symbol,
      side: request.side,
    })
  ) {
    return {
      ok: false,
      error: EXECUTION_SAFETY_MESSAGES.pendingLock,
    };
  }

  const orderId = buildOrderId();
  let entry = await appendExecutionJournalEntry(
    journalRow(request, orderId, idempotencyKey, 'draft'),
  );
  entry = await transition(entry, 'pending');
  entry = await transition(entry, 'submitted');

  const tradePayload: Omit<TradeRecord, 'id'> = {
    symbol: request.symbol,
    market: request.market,
    currency: request.currency,
    side: request.side,
    shares: request.quantity,
    price: request.requestedPrice,
    brokerageFee: request.brokerageFee ?? 0,
    executedAt: request.executedAt ?? new Date().toISOString(),
  };

  try {
    if (request.ledgerMode === 'practice') {
      const exec = handlers.applyPractice(tradePayload);
      if (!exec.ok) {
        entry = await transition(entry, 'failed', { errorReason: exec.error });
        return { ok: false, orderId, status: entry.status, error: exec.error };
      }
      const record = exec.practice.trades[0];
      entry = await transition(entry, 'confirmed', {
        executedPrice: tradePayload.price,
        filledQuantity: tradePayload.shares,
        tradeRecordId: record?.id,
      });
      return { ok: true, orderId, status: entry.status, journalEntry: entry };
    }

    handlers.applyManual(tradePayload);
    const tradeRecordId = `${tradePayload.executedAt}-${tradePayload.market}-${tradePayload.symbol}-${tradePayload.side}`;
    entry = await transition(entry, 'confirmed', {
      executedPrice: tradePayload.price,
      filledQuantity: tradePayload.shares,
      tradeRecordId,
    });
    return { ok: true, orderId, status: entry.status, journalEntry: entry };
  } catch (err) {
    const message = err instanceof Error ? err.message : '執行中に不明なエラーが発生しました';
    entry = await transition(entry, 'submitted', {
      errorReason: `timeout_uncertain: ${message}`,
    });
    return {
      ok: false,
      orderId,
      status: entry.status,
      error: EXECUTION_SAFETY_MESSAGES.uncertainStatus,
      uncertain: true,
    };
  }
}

/** 部分約定状態へ遷移（手動照合・回復用） */
export async function markExecutionPartiallyFilled(
  orderId: string,
  filledQuantity: number,
  executedPrice: number,
): Promise<ExecutionJournalEntry | null> {
  if (filledQuantity <= 0) return null;
  return updateExecutionJournalEntry(orderId, {
    status: 'partially_filled',
    filledQuantity,
    executedPrice,
    errorReason: undefined,
  });
}

/** 照合完了 */
export async function markExecutionReconciled(orderId: string): Promise<ExecutionJournalEntry | null> {
  return updateExecutionJournalEntry(orderId, { status: 'reconciled', errorReason: undefined });
}

export function createDefaultExecutionHandlers(
  getState: () => AppState,
  setState: (updater: (prev: AppState) => AppState) => void,
  onStateCommitted?: (next: AppState) => void,
): ExecutionHandlers {
  const commit = (next: AppState) => {
    onStateCommitted?.(next);
    setState(() => next);
  };

  return {
    getPosition(market, symbol, ledgerMode) {
      const state = getState();
      const list = ledgerMode === 'practice' ? state.practice.portfolio : state.portfolio;
      return list.find((p) => p.market === market && p.symbol.toUpperCase() === symbol.toUpperCase());
    },
    applyPractice(trade) {
      const state = getState();
      const exec: PracticeTradeResult = executePracticeTrade(state.practice, trade);
      if (!exec.ok) return exec;
      commit({ ...getState(), practice: exec.practice });
      return { ok: true, practice: exec.practice };
    },
    applyManual(trade) {
      const record: TradeRecord = {
        ...trade,
        id: `${trade.executedAt}-${trade.market}-${trade.symbol}-${trade.side}`,
      };
      const prev = getState();
      const portfolio = applyTradeToPortfolio(prev.portfolio, record);
      const valueMYR = portfolioMarketValueMYR({ ...prev, portfolio });
      const today = new Date().toISOString().slice(0, 10);
      const performanceHistory = appendPerformanceSnapshot(
        prev.performanceHistory,
        today,
        valueMYR,
      );
      commit({
        ...prev,
        portfolio,
        trades: [record, ...prev.trades],
        performanceHistory,
      });
    },
  };
}
