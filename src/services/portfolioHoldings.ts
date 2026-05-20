import type { AppState, Currency, Market, PortfolioPosition, TradeRecord } from '../types';
import type { ExecutionJournalEntry } from '../types/execution';
import { HOLDING_ERRORS } from '../constants/holdingErrors';
import { applyTradeToPortfolio } from './portfolio';
import { executePracticeTrade } from './practice';
import { sanitizePortfolio } from './portfolioPriceUpdate';
import { safeShares } from '../utils/safeNumeric';
import { validateManualHoldingInput } from './holdingFlow';

export type ManualHoldingInput = {
  symbol: string;
  market: Market;
  currency: Currency;
  shares: number;
  averageBuyPrice: number;
  memo?: string;
};

export type HoldingMutationResult =
  | { ok: true; state: AppState; journalEntry?: ExecutionJournalEntry }
  | { ok: false; error: string };

function positionKey(p: Pick<PortfolioPosition, 'market' | 'symbol'>): string {
  return `${p.market}:${p.symbol.toUpperCase()}`;
}

/** Prefer in-memory holdings over stale persistence (symbol-level merge). */
export function mergePortfolioFromPersistence(
  memory: PortfolioPosition[],
  persisted: PortfolioPosition[],
): PortfolioPosition[] {
  const map = new Map<string, PortfolioPosition>();
  const ingest = (list: PortfolioPosition[], preferNew: boolean) => {
    for (const p of sanitizePortfolio(list)) {
      if (safeShares(p.shares, 0) <= 0) continue;
      const key = positionKey(p);
      const existing = map.get(key);
      if (!existing || preferNew || safeShares(p.shares, 0) >= safeShares(existing.shares, 0)) {
        map.set(key, p);
      }
    }
  };
  ingest(persisted, false);
  ingest(memory, true);
  return Array.from(map.values());
}

export function applyManualHoldingToState(
  state: AppState,
  input: ManualHoldingInput,
): HoldingMutationResult {
  const validated = validateManualHoldingInput({
    symbol: input.symbol,
    shares: input.shares,
    averageBuyPrice: input.averageBuyPrice,
    market: input.market,
  });
  if (!validated.ok) return validated;

  const trade: Omit<TradeRecord, 'id'> = {
    symbol: validated.symbol,
    market: input.market,
    currency: input.currency,
    side: 'buy',
    shares: validated.shares,
    price: validated.averageBuyPrice,
    brokerageFee: 0,
    executedAt: new Date().toISOString(),
    notes: input.memo?.trim() || '手動で保有銘柄に追加',
  };

  const record: TradeRecord = {
    ...trade,
    id: `manual_record-${trade.executedAt}-${trade.market}-${trade.symbol}`,
  };

  const portfolio = applyTradeToPortfolio(state.portfolio, record);
  const next: AppState = {
    ...state,
    portfolio,
    trades: [record, ...state.trades],
  };

  const journalEntry: ExecutionJournalEntry = {
    orderId: `manual-${record.id}`,
    idempotencyKey: `manual_record:${record.id}`,
    ledgerMode: 'manual',
    symbol: record.symbol,
    market: record.market,
    currency: record.currency,
    side: 'buy',
    quantity: record.shares,
    requestedPrice: record.price,
    executedPrice: record.price,
    filledQuantity: record.shares,
    status: 'confirmed',
    createdAt: record.executedAt,
    updatedAt: record.executedAt,
    tradeRecordId: record.id,
    recordSource: 'manual_record',
    errorReason: input.memo?.trim() ? `memo:${input.memo.trim()}` : undefined,
  };

  return { ok: true, state: next, journalEntry };
}

export function applyPracticeBuyToState(
  state: AppState,
  trade: Omit<TradeRecord, 'id'>,
): HoldingMutationResult {
  if (state.appMode !== 'practice') {
    return { ok: false, error: HOLDING_ERRORS.notPracticeMode };
  }
  if (trade.shares <= 0) {
    return { ok: false, error: HOLDING_ERRORS.invalidQuantity };
  }
  if (!Number.isFinite(trade.price) || trade.price <= 0) {
    return { ok: false, error: HOLDING_ERRORS.noPrice };
  }

  const exec = executePracticeTrade(state.practice, trade);
  if (!exec.ok) {
    const error =
      exec.error.includes('不足') || exec.error.includes('現金')
        ? HOLDING_ERRORS.insufficientCash
        : exec.error.includes('株数')
          ? HOLDING_ERRORS.insufficientShares
          : exec.error;
    return { ok: false, error };
  }

  return {
    ok: true,
    state: { ...state, practice: exec.practice },
  };
}

export function selectActiveHoldings(state: AppState, isPractice: boolean): PortfolioPosition[] {
  const raw = isPractice ? state.practice.portfolio : state.portfolio;
  return sanitizePortfolio(raw).filter((p) => safeShares(p.shares, 0) > 0);
}
