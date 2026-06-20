import type { AppState } from '../../types';
import type { ExecutionJournalEntry } from '../../types/execution';
import type {
  BrokerTransactionCandidate,
  DuplicateHint,
} from '../../types/rakutenImport';
import { toMYR } from '../fx';

export type DuplicateDetectionInput = {
  candidate: Pick<
    BrokerTransactionCandidate,
    | 'type'
    | 'executedAt'
    | 'symbol'
    | 'quantity'
    | 'price'
    | 'fee'
    | 'totalMYR'
    | 'referenceNumber'
    | 'currency'
    | 'market'
  >;
  state: AppState;
  journalEntries?: ExecutionJournalEntry[];
};

export type DuplicateDetectionResult = {
  score: number;
  hint: DuplicateHint | null;
  blockSave: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function sameDay(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return false;
  return Math.abs(da - db) <= DAY_MS;
}

function amountClose(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

function tradeAmountMYR(trade: {
  shares: number;
  price: number;
  currency: string;
  brokerageFee: number;
}): number {
  return toMYR(trade.shares * trade.price, trade.currency as 'MYR' | 'USD' | 'HKD') + trade.brokerageFee;
}

function candidateAmountMYR(candidate: DuplicateDetectionInput['candidate']): number | null {
  if (candidate.type === 'deposit' || candidate.type === 'withdrawal') {
    return candidate.totalMYR ?? null;
  }
  if (candidate.type === 'dividend') {
    return candidate.totalMYR ?? null;
  }
  if (candidate.type === 'fee') {
    return candidate.fee ?? candidate.totalMYR ?? null;
  }
  if (candidate.type === 'buy' || candidate.type === 'sell') {
    if (
      candidate.quantity == null ||
      candidate.price == null ||
      !candidate.currency
    ) {
      return null;
    }
    const gross = toMYR(
      candidate.quantity * candidate.price,
      candidate.currency,
    );
    return gross + (candidate.fee ?? 0);
  }
  return candidate.totalMYR ?? null;
}

export function detectDuplicateImport(
  input: DuplicateDetectionInput,
): DuplicateDetectionResult {
  const { candidate, state, journalEntries = [] } = input;

  if (candidate.referenceNumber?.trim()) {
    const ref = candidate.referenceNumber.trim();
    for (const d of state.deposits) {
      if (d.note?.includes(ref)) {
        return {
          score: 0.98,
          blockSave: true,
          hint: {
            matchedEntryId: d.id,
            matchedOn: ['referenceNumber'],
            score: 0.98,
            matchedKind: 'deposit',
          },
        };
      }
    }
    for (const t of state.trades) {
      if (t.notes?.includes(ref)) {
        return {
          score: 0.98,
          blockSave: true,
          hint: {
            matchedEntryId: t.id,
            matchedOn: ['referenceNumber'],
            score: 0.98,
            matchedKind: 'trade',
          },
        };
      }
    }
    for (const j of journalEntries) {
      if (j.brokerReferenceNumber === ref || j.importCandidateId === ref) {
        return {
          score: 0.98,
          blockSave: true,
          hint: {
            matchedEntryId: j.orderId,
            matchedOn: ['referenceNumber'],
            score: 0.98,
            matchedKind: 'journal',
          },
        };
      }
    }
  }

  const candAmount = candidateAmountMYR(candidate);

  if (candidate.type === 'deposit' && candAmount != null) {
    for (const d of state.deposits) {
      if (!d.completed) continue;
      if (sameDay(d.plannedDate, candidate.executedAt) && amountClose(d.amountMYR, candAmount)) {
        return {
          score: 0.92,
          blockSave: true,
          hint: {
            matchedEntryId: d.id,
            matchedOn: ['date', 'amount'],
            score: 0.92,
            matchedKind: 'deposit',
          },
        };
      }
    }
  }

  if (candidate.type === 'withdrawal' && candAmount != null) {
    for (const w of state.withdrawals ?? []) {
      if (sameDay(w.withdrawnAt, candidate.executedAt) && amountClose(w.amountMYR, candAmount)) {
        return {
          score: 0.92,
          blockSave: true,
          hint: {
            matchedEntryId: w.id,
            matchedOn: ['date', 'amount'],
            score: 0.92,
            matchedKind: 'withdrawal',
          },
        };
      }
    }
  }

  if (candidate.type === 'dividend' && candAmount != null && candidate.symbol) {
    const sym = candidate.symbol.toUpperCase();
    for (const d of state.dividends) {
      if (d.symbol.toUpperCase() !== sym) continue;
      if (sameDay(d.receivedAt, candidate.executedAt) && amountClose(d.amount, candAmount)) {
        return {
          score: 0.92,
          blockSave: true,
          hint: {
            matchedEntryId: d.id,
            matchedOn: ['date', 'symbol', 'amount'],
            score: 0.92,
            matchedKind: 'dividend',
          },
        };
      }
    }
  }

  if ((candidate.type === 'buy' || candidate.type === 'sell') && candidate.symbol) {
    const sym = candidate.symbol.toUpperCase();
    for (const t of state.trades) {
      if (t.symbol.toUpperCase() !== sym) continue;
      if (t.side !== candidate.type) continue;
      if (!sameDay(t.executedAt, candidate.executedAt)) continue;
      const qtyMatch =
        candidate.quantity != null && amountClose(t.shares, candidate.quantity, 0.0001);
      const amtMatch =
        candAmount != null && amountClose(tradeAmountMYR(t), candAmount, 0.05);
      if (qtyMatch && amtMatch) {
        return {
          score: 0.95,
          blockSave: true,
          hint: {
            matchedEntryId: t.id,
            matchedOn: ['date', 'symbol', 'quantity', 'amount'],
            score: 0.95,
            matchedKind: 'trade',
          },
        };
      }
      if (qtyMatch) {
        return {
          score: 0.78,
          blockSave: false,
          hint: {
            matchedEntryId: t.id,
            matchedOn: ['date', 'symbol', 'quantity'],
            score: 0.78,
            matchedKind: 'trade',
          },
        };
      }
    }
  }

  return { score: 0, hint: null, blockSave: false };
}
