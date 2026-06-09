import {
  MALAYSIA_V4_REFERENCE_LABELS,
  MALAYSIA_V4_REFERENCE_SYMBOLS,
  type MalaysiaV4ReferenceSymbol,
} from '../constants/malaysiaV4Reference';
import type { ManualOrderItem } from '../types';
import { toMYR } from './fx';

/** @deprecated 参考モデル — MALAYSIA_V4_REFERENCE_SYMBOLS を使用 */
export const MALAYSIA_V4_ORDER_SYMBOLS = MALAYSIA_V4_REFERENCE_SYMBOLS;

export type MalaysiaV4OrderSymbol = MalaysiaV4ReferenceSymbol;

export const MALAYSIA_V4_SYMBOL_LABELS: Record<string, string> = MALAYSIA_V4_REFERENCE_LABELS;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function validateManualOrderEntryPrice(
  entryPrice: number,
): { ok: true } | { ok: false; error: string } {
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return { ok: false, error: '指値は0より大きい数値を入力してください。' };
  }
  return { ok: true };
}

/** entryPrice×株数で allocationMYR を同期 */
export function syncManualOrderAllocation(
  order: ManualOrderItem,
  entryPrice: number,
  estimatedShares?: number,
): ManualOrderItem {
  const shares = estimatedShares ?? order.estimatedShares;
  const allocationMYR = round3(toMYR(entryPrice * shares, order.currency));
  return {
    ...order,
    entryPrice: round3(entryPrice),
    estimatedShares: shares,
    allocationMYR,
  };
}

export function applyManualOrderEntryPriceUpdate(
  orders: ManualOrderItem[],
  orderId: string,
  entryPrice: number,
  estimatedShares?: number,
): { ok: true; orders: ManualOrderItem[] } | { ok: false; error: string } {
  const validated = validateManualOrderEntryPrice(entryPrice);
  if (!validated.ok) return validated;

  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx < 0) return { ok: false, error: '注文が見つかりません。' };
  if (orders[idx]!.completed) return { ok: false, error: '完了済み注文は編集できません。' };

  const next = [...orders];
  next[idx] = syncManualOrderAllocation(next[idx]!, entryPrice, estimatedShares);
  return { ok: true, orders: next };
}
