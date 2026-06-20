import type {
  BrokerTransactionCandidate,
  ImportBatch,
} from '../../types/rakutenImport';
import type { AppState } from '../../types';
import type { ExecutionJournalEntry } from '../../types/execution';
import { detectDuplicateImport } from './duplicateDetector';
import {
  parseNaturalLanguageTransaction,
  type NlParseResult,
} from './naturalLanguageTransactionParser';
import { canSaveImportCandidate } from './rakutenImportConfidence';

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildNaturalLanguageImportCandidate(
  text: string,
  ctx: { state: AppState; journalEntries?: ExecutionJournalEntry[] },
):
  | { ok: true; batch: ImportBatch; candidate: BrokerTransactionCandidate }
  | { ok: false; error: string } {
  const parsed = parseNaturalLanguageTransaction(text, ctx);
  if ('ok' in parsed && parsed.ok === false) {
    return parsed;
  }
  const nl = parsed as NlParseResult;

  const batchId = newId('import-batch');
  const candidateId = newId('import-candidate');
  const createdAt = new Date().toISOString();

  let candidate: BrokerTransactionCandidate = {
    id: candidateId,
    batchId,
    source: 'natural_language',
    type: nl.type,
    status: 'draft',
    executedAt: nl.executedAt,
    symbol: nl.symbol,
    companyName: nl.companyName,
    market: nl.market,
    currency: nl.currency,
    quantity: nl.quantity,
    price: nl.price,
    totalMYR: nl.totalMYR,
    fieldConfidence: nl.fieldConfidence,
    overallConfidence: nl.overallConfidence,
    lowConfidenceFields: nl.lowConfidenceFields,
    rawInputText: nl.rawInputText,
    createdAt,
  };

  if (canSaveImportCandidate(candidate)) {
    candidate = { ...candidate, status: 'ready_to_confirm' };
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
      status: dup.blockSave ? 'duplicate_blocked' : candidate.status,
    };
  }

  const batch: ImportBatch = {
    id: batchId,
    source: 'natural_language',
    candidates: [candidate],
    createdAt,
  };

  return { ok: true, batch, candidate };
}
