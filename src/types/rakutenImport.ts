import type { Currency, Market } from './index';

/** Rakuten Transaction History で観測される種別 */
export type BrokerTransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'fee';

export type ImportSource = 'natural_language' | 'ocr_screenshot' | 'manual_form';

export type ImportCandidateStatus =
  | 'draft'
  | 'user_editing'
  | 'ready_to_confirm'
  | 'confirmed'
  | 'rejected'
  | 'duplicate_blocked';

export type ImportFieldKey =
  | 'executedAt'
  | 'symbol'
  | 'companyName'
  | 'type'
  | 'quantity'
  | 'price'
  | 'fee'
  | 'total'
  | 'currency'
  | 'referenceNumber';

export type FieldConfidenceMap = Partial<Record<ImportFieldKey, number>>;

export interface DuplicateHint {
  matchedEntryId: string;
  matchedOn: ('date' | 'symbol' | 'quantity' | 'amount' | 'referenceNumber')[];
  score: number;
  matchedKind: 'deposit' | 'trade' | 'dividend' | 'withdrawal' | 'journal';
}

export interface BrokerTransactionCandidate {
  id: string;
  batchId: string;
  source: ImportSource;
  type: BrokerTransactionType;
  status: ImportCandidateStatus;

  executedAt?: string;
  symbol?: string;
  companyName?: string;
  market?: Market;
  currency: Currency;
  quantity?: number;
  price?: number;
  fee?: number;
  totalMYR?: number;
  referenceNumber?: string;

  fieldConfidence: FieldConfidenceMap;
  overallConfidence: number;
  lowConfidenceFields: ImportFieldKey[];

  rawInputText?: string;
  /** OCR 元画像（端末内 URI） */
  imageLocalUri?: string;
  duplicateHint?: DuplicateHint;

  mappedRecordIds?: {
    depositId?: string;
    tradeId?: string;
    dividendId?: string;
    withdrawalId?: string;
    feeAdjustmentId?: string;
  };

  createdAt: string;
  confirmedAt?: string;
  rejectedAt?: string;
  userNote?: string;
}

export interface ImportBatch {
  id: string;
  source: ImportSource;
  candidates: BrokerTransactionCandidate[];
  createdAt: string;
  /** バッチ単位の Transaction History スクショ参照 */
  imageLocalUri?: string;
}

/** OpenAI Vision OCR — Transaction History 1行分 */
export type OcrFieldConfidence = Partial<Record<ImportFieldKey, number>>;

export interface OcrTransactionRow {
  type: BrokerTransactionType;
  date?: string;
  symbol?: string;
  company?: string;
  quantity?: number;
  price?: number;
  fee?: number;
  total?: number;
  currency?: string;
  referenceNumber?: string;
  fieldConfidence?: OcrFieldConfidence;
  /** 行全体の信頼度 0.0–1.0 */
  confidence?: number;
}

export interface OcrVisionResponse {
  rows: OcrTransactionRow[];
}

export type RakutenImportAuditEvent =
  | 'candidate_created'
  | 'candidate_updated'
  | 'candidate_confirmed'
  | 'candidate_rejected'
  | 'candidate_duplicate_blocked';

export interface RakutenImportAuditEntry {
  id: string;
  event: RakutenImportAuditEvent;
  batchId: string;
  candidateId: string;
  candidateType: BrokerTransactionType;
  at: string;
  detailJa?: string;
  mappedRecordIds?: BrokerTransactionCandidate['mappedRecordIds'];
}

export interface RakutenImportStagingStore {
  version: 1;
  batches: ImportBatch[];
}

export interface RakutenImportAuditStore {
  version: 1;
  entries: RakutenImportAuditEntry[];
}

/** R1 manual form — deposit / buy / sell only */
export type RakutenImportManualFormInput =
  | {
      type: 'deposit';
      amountMYR: number;
      executedAt: string;
      referenceNumber?: string;
      note?: string;
    }
  | {
      type: 'buy';
      symbol: string;
      market: Market;
      currency: Currency;
      quantity: number;
      price: number;
      fee?: number;
      executedAt: string;
      companyName?: string;
      referenceNumber?: string;
      note?: string;
    }
  | {
      type: 'sell';
      symbol: string;
      market: Market;
      currency: Currency;
      quantity: number;
      price: number;
      fee?: number;
      executedAt: string;
      companyName?: string;
      referenceNumber?: string;
      note?: string;
    };
