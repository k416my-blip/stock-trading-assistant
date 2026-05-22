/** 数値の安全ガード（NaN / undefined でアプリが壊れないようにする） */

/** API/JSON 由来の価格を正の有限数に正規化（"95" / 95 / 95.0 など） */
export function normalizeQuotePrice(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const normalizedPrice = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(normalizedPrice) || Number.isNaN(normalizedPrice) || normalizedPrice <= 0) {
    return null;
  }
  return normalizedPrice;
}

/** API 取得成功判定: 正の有限数のみ（falsy 判定は使わない） */
export function isValidQuotePrice(value: unknown): value is number {
  return normalizeQuotePrice(value) != null;
}

export function safeNumber(value: unknown, fallback = 0): number {
  const normalized = normalizeQuotePrice(value);
  if (normalized != null) return normalized;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function safePrice(value: unknown, fallback: number, minExclusive = 0): number {
  const normalized = normalizeQuotePrice(value);
  if (normalized != null && normalized > minExclusive) return normalized;
  const n = safeNumber(value, fallback);
  if (n > minExclusive) return n;
  if (fallback > minExclusive) return fallback;
  return 0;
}

export function safeShares(value: unknown, fallback = 0): number {
  const n = safeNumber(value, fallback);
  return n >= 0 ? n : fallback;
}

export type DisplayPriceInput = {
  currentPrice?: unknown;
  averageBuyPrice?: unknown;
  priceSource?: 'manual' | 'api';
  /** 明示的な手動入力価格（未設定時は priceSource=manual の currentPrice） */
  manualPrice?: unknown;
  /** 前回API取得成功時の価格（未設定時は currentPrice を前回として扱う） */
  previousPrice?: unknown;
};

/**
 * 表示・評価・売買計算用の安全な株価。
 * currentPrice → previousPrice → averageBuyPrice → manualPrice → 0
 */
export function resolveDisplayPrice(input: DisplayPriceInput): number {
  const averageBuyPrice = safePrice(input.averageBuyPrice, 0, 0);
  const manualFromField = safePrice(input.manualPrice, 0, 0);
  const manualPrice =
    input.priceSource === 'manual'
      ? safePrice(input.currentPrice, manualFromField > 0 ? manualFromField : averageBuyPrice, 0)
      : manualFromField;
  const currentPrice = safePrice(input.currentPrice, 0, 0);
  const previousPrice = safePrice(input.previousPrice, currentPrice, 0);

  if (currentPrice > 0) return currentPrice;
  if (previousPrice > 0) return previousPrice;
  if (averageBuyPrice > 0) return averageBuyPrice;
  if (manualPrice > 0) return manualPrice;
  return 0;
}

/** toFixed の安全版 */
export function formatFixed(value: unknown, digits = 2, fallback = '0.00'): string {
  const n = safeNumber(value, NaN);
  if (!Number.isFinite(n)) return fallback;
  return n.toFixed(digits);
}

export function formatSafePrice(value: unknown, fallback = 0, digits = 2): string {
  return formatFixed(safePrice(value, fallback, 0), digits);
}
