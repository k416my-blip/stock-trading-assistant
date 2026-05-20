import { EXECUTION_IDEMPOTENCY_WINDOW_MS } from '../constants/executionSafety';
import type { ExecutionJournalEntry, ExecutionLedgerMode, ExecutionOrderRequest } from '../types/execution';
import type { Market } from '../types';

export function buildIdempotencyKey(
  request: Pick<ExecutionOrderRequest, 'ledgerMode' | 'market' | 'symbol' | 'side' | 'quantity'>,
  atMs: number = Date.now(),
): string {
  const bucket = Math.floor(atMs / EXECUTION_IDEMPOTENCY_WINDOW_MS);
  return [
    request.ledgerMode,
    request.market,
    request.symbol.toUpperCase(),
    request.side,
    String(request.quantity),
    String(bucket),
  ].join(':');
}

export function buildOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function findDuplicateIdempotencyEntry(
  entries: ExecutionJournalEntry[],
  idempotencyKey: string,
): ExecutionJournalEntry | null {
  const duplicate = entries.find(
    (e) =>
      e.idempotencyKey === idempotencyKey &&
      e.status !== 'failed' &&
      e.status !== 'cancelled',
  );
  return duplicate ?? null;
}

export function hasPendingOrderLock(
  entries: ExecutionJournalEntry[],
  params: {
    ledgerMode: ExecutionLedgerMode;
    market: Market;
    symbol: string;
    side: 'buy' | 'sell';
  },
): boolean {
  return entries.some(
    (e) =>
      e.ledgerMode === params.ledgerMode &&
      e.market === params.market &&
      e.symbol.toUpperCase() === params.symbol.toUpperCase() &&
      e.side === params.side &&
      (e.status === 'draft' || e.status === 'pending' || e.status === 'submitted'),
  );
}
