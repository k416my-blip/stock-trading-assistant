import type {
  BrokerTransactionCandidate,
  BrokerTransactionType,
  ImportFieldKey,
} from '../../types/rakutenImport';

export const CONFIDENCE_HIGH = 0.85;
export const CONFIDENCE_MIN_SAVE = 0.6;
export const CONFIDENCE_FIELD_WARN = 0.7;

export type ConfidenceTier = 'high' | 'needs_confirmation' | 'blocked';

export function confidenceTier(overall: number): ConfidenceTier {
  if (overall >= CONFIDENCE_HIGH) return 'high';
  if (overall >= CONFIDENCE_MIN_SAVE) return 'needs_confirmation';
  return 'blocked';
}

export function confidenceLabelJa(overall: number): string {
  switch (confidenceTier(overall)) {
    case 'high':
      return '高';
    case 'needs_confirmation':
      return '要確認';
    case 'blocked':
      return '保存不可';
  }
}

export function getRequiredFields(type: BrokerTransactionType): ImportFieldKey[] {
  switch (type) {
    case 'deposit':
      return ['type', 'total', 'executedAt', 'currency'];
    case 'buy':
    case 'sell':
      return ['type', 'symbol', 'quantity', 'price', 'executedAt'];
    case 'dividend':
      return ['type', 'symbol', 'total', 'executedAt'];
    default:
      return ['type'];
  }
}

function hasRequiredValues(candidate: BrokerTransactionCandidate): boolean {
  switch (candidate.type) {
    case 'deposit':
      return Boolean(candidate.totalMYR && candidate.totalMYR > 0 && candidate.executedAt);
    case 'buy':
    case 'sell':
      return Boolean(
        candidate.symbol?.trim() &&
          candidate.quantity &&
          candidate.quantity > 0 &&
          candidate.price != null &&
          candidate.price > 0 &&
          candidate.executedAt,
      );
    case 'dividend':
      return Boolean(
        candidate.symbol?.trim() &&
          candidate.totalMYR &&
          candidate.totalMYR > 0 &&
          candidate.executedAt,
      );
    default:
      return false;
  }
}

/** R1 commit path supports deposit/buy/sell only; dividend blocked until R3+. */
function isCommittableType(type: BrokerTransactionType): boolean {
  return type === 'deposit' || type === 'buy' || type === 'sell';
}

export function canSaveImportCandidate(candidate: BrokerTransactionCandidate): boolean {
  if (candidate.status === 'duplicate_blocked') return false;
  if (candidate.overallConfidence < CONFIDENCE_MIN_SAVE) return false;
  if (!isCommittableType(candidate.type)) return false;
  if (!hasRequiredValues(candidate)) return false;

  const required = getRequiredFields(candidate.type);
  for (const field of required) {
    if (candidate.lowConfidenceFields.includes(field)) return false;
    const fc = candidate.fieldConfidence[field];
    if (fc !== undefined && fc < CONFIDENCE_FIELD_WARN) return false;
  }
  return true;
}

export function confidenceColorKey(
  overall: number,
): 'success' | 'warning' | 'danger' {
  switch (confidenceTier(overall)) {
    case 'high':
      return 'success';
    case 'needs_confirmation':
      return 'warning';
    case 'blocked':
      return 'danger';
  }
}
