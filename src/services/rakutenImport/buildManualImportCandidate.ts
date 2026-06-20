import type {
  BrokerTransactionCandidate,
  ImportBatch,
  RakutenImportManualFormInput,
} from '../../types/rakutenImport';
import { detectDuplicateImport } from './duplicateDetector';
import type { AppState } from '../../types';
import type { ExecutionJournalEntry } from '../../types/execution';

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildManualImportCandidate(
  input: RakutenImportManualFormInput,
  ctx: { state: AppState; journalEntries?: ExecutionJournalEntry[] },
): { batch: ImportBatch; candidate: BrokerTransactionCandidate } {
  const batchId = newId('import-batch');
  const candidateId = newId('import-candidate');
  const createdAt = new Date().toISOString();

  const base = {
    id: candidateId,
    batchId,
    source: 'manual_form' as const,
    status: 'ready_to_confirm' as const,
    fieldConfidence: {},
    overallConfidence: 1,
    lowConfidenceFields: [] as BrokerTransactionCandidate['lowConfidenceFields'],
    createdAt,
  };

  let candidate: BrokerTransactionCandidate;

  if (input.type === 'deposit') {
    candidate = {
      ...base,
      type: 'deposit',
      currency: 'MYR',
      totalMYR: input.amountMYR,
      executedAt: input.executedAt,
      referenceNumber: input.referenceNumber?.trim() || undefined,
      userNote: input.note?.trim() || undefined,
      rawInputText: `deposit RM${input.amountMYR}`,
    };
  } else if (input.type === 'buy') {
    candidate = {
      ...base,
      type: 'buy',
      symbol: input.symbol.toUpperCase(),
      market: input.market,
      currency: input.currency,
      quantity: input.quantity,
      price: input.price,
      fee: input.fee ?? 0,
      executedAt: input.executedAt,
      companyName: input.companyName?.trim() || undefined,
      referenceNumber: input.referenceNumber?.trim() || undefined,
      userNote: input.note?.trim() || undefined,
      rawInputText: `buy ${input.symbol} x${input.quantity} @ ${input.price}`,
    };
  } else {
    candidate = {
      ...base,
      type: 'sell',
      symbol: input.symbol.toUpperCase(),
      market: input.market,
      currency: input.currency,
      quantity: input.quantity,
      price: input.price,
      fee: input.fee ?? 0,
      executedAt: input.executedAt,
      companyName: input.companyName?.trim() || undefined,
      referenceNumber: input.referenceNumber?.trim() || undefined,
      userNote: input.note?.trim() || undefined,
      rawInputText: `sell ${input.symbol} x${input.quantity} @ ${input.price}`,
    };
  }

  const dup = detectDuplicateImport({
    candidate,
    state: ctx.state,
    journalEntries: ctx.journalEntries,
  });
  if (dup.hint) {
    candidate = {
      ...candidate,
      duplicateHint: dup.hint,
      status: dup.blockSave ? 'duplicate_blocked' : 'ready_to_confirm',
    };
  }

  const batch: ImportBatch = {
    id: batchId,
    source: 'manual_form',
    candidates: [candidate],
    createdAt,
  };

  return { batch, candidate };
}
