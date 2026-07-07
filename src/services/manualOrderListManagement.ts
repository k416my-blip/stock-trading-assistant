import { toMYR } from './fx';
import type { AppState, ManualOrderItem, ManualOrderSource, ManualOrderStatus, Market } from '../types';

export const MANUAL_ORDER_LIST_SAFETY_JA =
  '本アプリは実際の注文を送信しません。Rakuten Tradeでの入力・確認・発注はユーザー自身で行ってください。';

export const DELETE_ONE_TITLE = 'この手動注文を削除しますか？';
export const DELETE_ONE_BODY =
  '削除すると元に戻せません。本アプリ内の手動注文リストからのみ削除され、Rakuten Trade側には影響しません。';

export const DELETE_ALL_TITLE = '未完了の手動注文をすべて削除しますか？';
export const DELETE_ALL_BODY = 'この操作は元に戻せません。本アプリ内の未完了リストのみ削除されます。';

export const MARK_COMPLETE_TITLE = 'この注文を実行済みにしますか？';
export const MARK_COMPLETE_BODY =
  'Rakuten Trade側で手入力済みの場合のみ実行してください。本アプリは注文を送信しません。';

/** Legacy `completed` flag takes precedence when status is absent. */
export function resolveManualOrderStatus(item: ManualOrderItem): ManualOrderStatus {
  if (item.status === 'deleted') return 'deleted';
  if (item.status === 'completed') return 'completed';
  if (item.status === 'pending') return 'pending';
  return item.completed ? 'completed' : 'pending';
}

export function isManualOrderPending(item: ManualOrderItem): boolean {
  return resolveManualOrderStatus(item) === 'pending';
}

export function isManualOrderCompleted(item: ManualOrderItem): boolean {
  return resolveManualOrderStatus(item) === 'completed';
}

export function countPendingManualOrdersFromList(manualOrderList: ManualOrderItem[]): number {
  return manualOrderList.filter(isManualOrderPending).length;
}

export function countCompletedManualOrdersFromList(manualOrderList: ManualOrderItem[]): number {
  return manualOrderList.filter(isManualOrderCompleted).length;
}

export type ManualOrderEditInput = {
  symbol: string;
  name: string;
  estimatedShares: number;
  side: 'buy' | 'sell';
  market: Market;
  memo?: string;
  entryPrice?: number;
};

export function validateManualOrderEdit(
  input: ManualOrderEditInput,
): { ok: true } | { ok: false; error: string } {
  const symbol = input.symbol.trim();
  if (!symbol) return { ok: false, error: '銘柄コードを入力してください。' };
  if (!input.name.trim()) return { ok: false, error: '銘柄名を入力してください。' };
  if (!(input.estimatedShares > 0)) return { ok: false, error: '数量は1以上を入力してください。' };
  if (!input.market) return { ok: false, error: '市場を選択してください。' };
  if (input.side !== 'buy' && input.side !== 'sell') return { ok: false, error: '売買区分が不正です。' };
  return { ok: true };
}

export function removePendingManualOrderInState(
  state: AppState,
  orderId: string,
): { ok: true; state: AppState } | { ok: false; error: string } {
  const target = state.manualOrderList.find((i) => i.id === orderId);
  if (!target) return { ok: false, error: '候補が見つかりません' };
  if (!isManualOrderPending(target)) {
    return { ok: false, error: '実行済みとして記録済みの注文は未完了リストから削除できません。' };
  }
  return {
    ok: true,
    state: { ...state, manualOrderList: state.manualOrderList.filter((i) => i.id !== orderId) },
  };
}

export function clearPendingManualOrdersInState(
  state: AppState,
): { ok: true; state: AppState; removedCount: number } | { ok: false; error: string } {
  const pending = state.manualOrderList.filter(isManualOrderPending);
  if (pending.length === 0) {
    return { ok: true, state, removedCount: 0 };
  }
  return {
    ok: true,
    removedCount: pending.length,
    state: {
      ...state,
      manualOrderList: state.manualOrderList.filter(isManualOrderCompleted),
    },
  };
}

export function applyManualOrderEditInState(
  state: AppState,
  orderId: string,
  input: ManualOrderEditInput,
): { ok: true; state: AppState } | { ok: false; error: string } {
  const validation = validateManualOrderEdit(input);
  if (!validation.ok) return validation;

  const idx = state.manualOrderList.findIndex((i) => i.id === orderId);
  if (idx < 0) return { ok: false, error: '候補が見つかりません' };
  const current = state.manualOrderList[idx]!;
  if (!isManualOrderPending(current)) {
    return { ok: false, error: '実行済みの注文は編集できません。' };
  }

  const entryPrice = input.entryPrice ?? current.entryPrice;
  const currency = current.currency;
  const allocationMYR = toMYR(entryPrice * input.estimatedShares, currency);
  const now = new Date().toISOString();
  const updated: ManualOrderItem = {
    ...current,
    symbol: input.symbol.trim().toUpperCase(),
    name: input.name.trim(),
    estimatedShares: input.estimatedShares,
    side: input.side,
    market: input.market,
    memo: input.memo?.trim() || undefined,
    entryPrice,
    allocationMYR,
    updatedAt: now,
    status: 'pending',
  };
  const manualOrderList = [...state.manualOrderList];
  manualOrderList[idx] = updated;
  return { ok: true, state: { ...state, manualOrderList } };
}

export function markManualOrderCompletedInState(
  state: AppState,
  orderId: string,
  completedAt = new Date().toISOString(),
): { ok: true; state: AppState } | { ok: false; error: string } {
  const idx = state.manualOrderList.findIndex((i) => i.id === orderId);
  if (idx < 0) return { ok: false, error: '候補が見つかりません' };
  const current = state.manualOrderList[idx]!;
  if (!isManualOrderPending(current)) {
    return { ok: false, error: 'すでに実行済みです。' };
  }
  const updated: ManualOrderItem = {
    ...current,
    completed: true,
    status: 'completed',
    completedAt,
    updatedAt: completedAt,
  };
  const manualOrderList = [...state.manualOrderList];
  manualOrderList[idx] = updated;
  return { ok: true, state: { ...state, manualOrderList } };
}

/** Normalize legacy items on read (no mutation). */
export function normalizeManualOrderItem(item: ManualOrderItem): ManualOrderItem {
  const status = resolveManualOrderStatus(item);
  return {
    ...item,
    status,
    completed: status === 'completed',
  };
}
