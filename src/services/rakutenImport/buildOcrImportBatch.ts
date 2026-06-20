import type { AppState } from '../../types';
import type { ExecutionJournalEntry } from '../../types/execution';
import type { BrokerTransactionCandidate, ImportBatch } from '../../types/rakutenImport';
import { detectDuplicateImport } from './duplicateDetector';
import { ocrRowToCandidateFields } from './ocrRowToCandidate';
import { canSaveImportCandidate } from './rakutenImportConfidence';
import type { OcrVisionResult } from './ocrVisionTypes';

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function defaultVisionOcr(
  imageUri: string,
  apiKey?: string,
): Promise<OcrVisionResult> {
  const { runTransactionHistoryVisionOcr } = await import('./transactionHistoryVisionOcr');
  return runTransactionHistoryVisionOcr(imageUri, { apiKey });
}

export type BuildOcrImportBatchOptions = {
  visionOcr?: (imageUri: string) => Promise<OcrVisionResult>;
  apiKey?: string;
};

export async function buildOcrImportBatch(
  imageUri: string,
  ctx: { state: AppState; journalEntries?: ExecutionJournalEntry[] },
  options?: BuildOcrImportBatchOptions,
): Promise<{ ok: true; batch: ImportBatch } | { ok: false; error: string }> {
  const vision =
    options?.visionOcr ??
    ((uri: string) => defaultVisionOcr(uri, options?.apiKey));

  const ocr = await vision(imageUri);
  if (!ocr.ok) {
    return { ok: false, error: ocr.error };
  }

  const batchId = newId('import-batch');
  const createdAt = new Date().toISOString();
  const candidates: BrokerTransactionCandidate[] = [];

  for (const row of ocr.rows) {
    const candidateId = newId('import-candidate');
    const partial = ocrRowToCandidateFields(row, {
      candidateId,
      batchId,
      imageLocalUri: imageUri,
    });
    if (!partial) continue;

    let candidate = partial;
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

    candidates.push(candidate);
  }

  if (candidates.length === 0) {
    return { ok: false, error: '有効な取引候補を生成できませんでした。' };
  }

  const batch: ImportBatch = {
    id: batchId,
    source: 'ocr_screenshot',
    candidates,
    createdAt,
    imageLocalUri: imageUri,
  };

  return { ok: true, batch };
}
