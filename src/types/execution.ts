import type { Currency, Market } from './index';

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'partially_filled'
  | 'failed'
  | 'cancelled'
  | 'reconciled';

export type ExecutionLedgerMode = 'manual' | 'practice';

/** 不変の執行ジャーナル行（自動削除しない） */
export interface ExecutionJournalEntry {
  orderId: string;
  idempotencyKey: string;
  ledgerMode: ExecutionLedgerMode;
  symbol: string;
  market: Market;
  currency: Currency;
  side: 'buy' | 'sell';
  quantity: number;
  requestedPrice: number;
  executedPrice?: number;
  filledQuantity?: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  errorReason?: string;
  tradeRecordId?: string;
  /** manual_record = direct add; rakuten_trade_manual = confirmed from manual order list */
  recordSource?: 'execution' | 'manual_record' | 'practice' | 'rakuten_trade_manual';
  /** User confirmed execution in broker app (not app-executed) */
  userConfirmationStatus?: 'confirmed_by_user';
}

export interface ExecutionOrderRequest {
  ledgerMode: ExecutionLedgerMode;
  symbol: string;
  market: Market;
  currency: Currency;
  side: 'buy' | 'sell';
  quantity: number;
  requestedPrice: number;
  brokerageFee?: number;
  executedAt?: string;
}

export type ExecutionSubmitResult =
  | {
      ok: true;
      orderId: string;
      status: OrderStatus;
      journalEntry: ExecutionJournalEntry;
    }
  | {
      ok: false;
      orderId?: string;
      status?: OrderStatus;
      error: string;
      uncertain?: boolean;
      duplicate?: boolean;
      blockedByStale?: boolean;
    };

export type ExecutionReconciliationMismatch = {
  id: string;
  severity: 'warning' | 'critical';
  messageJa: string;
  symbol?: string;
  market?: Market;
};

export type ExecutionReconciliationReport = {
  computedAt: string;
  journalConfirmedCount: number;
  mismatchCount: number;
  mismatches: ExecutionReconciliationMismatch[];
  hasUnresolvedPending: boolean;
};
