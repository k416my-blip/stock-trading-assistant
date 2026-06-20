import type { Currency } from '../../types';
import type {
  BrokerTransactionCandidate,
  BrokerTransactionType,
  FieldConfidenceMap,
  ImportFieldKey,
  OcrTransactionRow,
} from '../../types/rakutenImport';
import { CONFIDENCE_FIELD_WARN } from './rakutenImportConfidence';
import { resolveBursaSymbol } from './bursaSymbolResolver';

const VALID_TYPES: BrokerTransactionType[] = [
  'deposit',
  'withdrawal',
  'buy',
  'sell',
  'dividend',
  'fee',
];

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function normalizeCurrency(raw?: string): Currency {
  const c = (raw ?? 'MYR').trim().toUpperCase();
  if (c === 'USD') return 'USD';
  if (c === 'HKD') return 'HKD';
  return 'MYR';
}

/** Parse DD/MM/YYYY or YYYY-MM-DD to ISO date string (YYYY-MM-DD). */
export function normalizeOcrDate(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const iso = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = raw.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  return undefined;
}

function requiredFields(type: BrokerTransactionType): ImportFieldKey[] {
  switch (type) {
    case 'deposit':
      return ['type', 'total', 'executedAt', 'currency'];
    case 'withdrawal':
      return ['type', 'total', 'executedAt'];
    case 'buy':
    case 'sell':
      return ['type', 'symbol', 'quantity', 'price', 'executedAt'];
    case 'dividend':
      return ['type', 'symbol', 'total', 'executedAt'];
    case 'fee':
      return ['type', 'fee', 'executedAt'];
    default:
      return ['type'];
  }
}

function mapFieldConfidence(row: OcrTransactionRow): FieldConfidenceMap {
  const fc = row.fieldConfidence ?? {};
  const mapped: FieldConfidenceMap = {};
  if (fc.type != null) mapped.type = fc.type;
  if (fc.executedAt != null) mapped.executedAt = fc.executedAt;
  if (fc.symbol != null) mapped.symbol = fc.symbol;
  if (fc.companyName != null) mapped.companyName = fc.companyName;
  if (fc.quantity != null) mapped.quantity = fc.quantity;
  if (fc.price != null) mapped.price = fc.price;
  if (fc.fee != null) mapped.fee = fc.fee;
  if (fc.total != null) mapped.total = fc.total;
  if (fc.currency != null) mapped.currency = fc.currency;
  if (fc.referenceNumber != null) mapped.referenceNumber = fc.referenceNumber;
  return mapped;
}

function computeLowConfidenceFields(
  fieldConfidence: FieldConfidenceMap,
  required: ImportFieldKey[],
): ImportFieldKey[] {
  const low: ImportFieldKey[] = [];
  for (const field of required) {
    const c = fieldConfidence[field];
    if (c === undefined || c < CONFIDENCE_FIELD_WARN) {
      low.push(field);
    }
  }
  return low;
}

export function ocrRowToCandidateFields(
  row: OcrTransactionRow,
  ids: { candidateId: string; batchId: string; imageLocalUri?: string },
): BrokerTransactionCandidate | null {
  if (!VALID_TYPES.includes(row.type)) return null;

  const executedAt = normalizeOcrDate(row.date);
  const currency = normalizeCurrency(row.currency);
  const resolved = resolveBursaSymbol(row.symbol, row.company);

  const fieldConfidence = mapFieldConfidence(row);
  const required = requiredFields(row.type);

  if (executedAt) {
    fieldConfidence.executedAt ??= row.confidence ?? 0.75;
  }
  fieldConfidence.type ??= row.confidence ?? 0.8;
  if (row.total != null) fieldConfidence.total ??= row.confidence ?? 0.75;
  if (row.fee != null) fieldConfidence.fee ??= row.confidence ?? 0.75;
  if (resolved?.symbol) fieldConfidence.symbol ??= row.confidence ?? 0.7;
  if (row.quantity != null) fieldConfidence.quantity ??= row.confidence ?? 0.75;
  if (row.price != null) fieldConfidence.price ??= row.confidence ?? 0.75;
  fieldConfidence.currency ??= row.confidence ?? 0.9;

  const confValues = required
    .map((k) => fieldConfidence[k])
    .filter((v): v is number => v !== undefined);
  const overallConfidence =
    row.confidence != null ? row.confidence : avg(confValues.length ? confValues : [0.5]);

  const lowConfidenceFields = computeLowConfidenceFields(fieldConfidence, required);
  const createdAt = new Date().toISOString();

  const base: BrokerTransactionCandidate = {
    id: ids.candidateId,
    batchId: ids.batchId,
    source: 'ocr_screenshot',
    type: row.type,
    status: 'draft',
    currency,
    executedAt,
    symbol: resolved?.symbol ?? row.symbol?.trim(),
    companyName: resolved?.companyName ?? row.company?.trim(),
    market: resolved?.market ?? (resolved?.symbol || row.symbol ? 'bursa' : undefined),
    quantity: row.quantity,
    price: row.price,
    fee: row.fee,
    totalMYR: row.total,
    referenceNumber: row.referenceNumber?.trim() || undefined,
    fieldConfidence,
    overallConfidence,
    lowConfidenceFields,
    rawInputText: `ocr:${row.type}:${row.date ?? ''}:${row.symbol ?? row.company ?? ''}`,
    imageLocalUri: ids.imageLocalUri,
    createdAt,
  };

  return base;
}
