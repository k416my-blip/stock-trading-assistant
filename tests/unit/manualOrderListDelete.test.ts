import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultAppState } from '../../src/services/storage';
import {
  getPersonalKillSwitchesSnapshot,
  savePersonalKillSwitches,
} from '../../src/services/personalKillSwitches';
import type { AppState, ManualOrderItem } from '../../src/types';

function baseOrder(overrides: Partial<ManualOrderItem> = {}): ManualOrderItem {
  return {
    id: 'order-1',
    symbol: '1155',
    name: 'Test Bank',
    market: 'bursa',
    currency: 'MYR',
    side: 'buy',
    entryPrice: 10,
    estimatedShares: 100,
    allocationMYR: 1000,
    orderMethod: '成行',
    completed: false,
    createdAt: new Date().toISOString(),
    source: 'allocation',
    ...overrides,
  };
}

function removePendingManualOrderInState(
  state: AppState,
  orderId: string,
): { next: AppState; result: { ok: boolean; error?: string } } {
  if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
    return { next: state, result: { ok: false, error: '読み取り専用モードでは削除できません' } };
  }
  const target = state.manualOrderList.find((i) => i.id === orderId);
  if (!target) {
    return { next: state, result: { ok: false, error: '候補が見つかりません' } };
  }
  if (target.completed) {
    return {
      next: state,
      result: {
        ok: false,
        error: '実行済みとして記録済みの注文は未完了リストから削除できません。',
      },
    };
  }
  const nextList = state.manualOrderList.filter((i) => i.id !== orderId);
  return {
    next: { ...state, manualOrderList: nextList },
    result: { ok: true },
  };
}

function clearPendingManualOrdersInState(state: AppState): {
  next: AppState;
  result: { ok: boolean; error?: string; removedCount?: number };
} {
  if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
    return { next: state, result: { ok: false, error: '読み取り専用モードでは削除できません' } };
  }
  const pending = state.manualOrderList.filter((i) => !i.completed);
  if (pending.length === 0) {
    return { next: state, result: { ok: true, removedCount: 0 } };
  }
  return {
    next: {
      ...state,
      manualOrderList: state.manualOrderList.filter((i) => i.completed),
    },
    result: { ok: true, removedCount: pending.length },
  };
}

describe('manualOrderListDelete', () => {
  beforeEach(async () => {
    await savePersonalKillSwitches({
      readOnlyMode: false,
      disableTradeSubmission: false,
    });
  });

  it('removes a pending order and updates count', () => {
    const pending = baseOrder({ id: 'p1' });
    const done = baseOrder({ id: 'd1', completed: true });
    const state: AppState = {
      ...createDefaultAppState(),
      manualOrderList: [pending, done],
    };

    const { next, result } = removePendingManualOrderInState(state, 'p1');
    expect(result.ok).toBe(true);
    expect(next.manualOrderList).toHaveLength(1);
    expect(next.manualOrderList[0]?.id).toBe('d1');
    expect(next.manualOrderList.filter((i) => !i.completed)).toHaveLength(0);
  });

  it('rejects deleting completed orders from pending delete path', () => {
    const done = baseOrder({ id: 'd1', completed: true });
    const state: AppState = {
      ...createDefaultAppState(),
      manualOrderList: [done],
    };

    const { next, result } = removePendingManualOrderInState(state, 'd1');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('実行済み');
    expect(next.manualOrderList).toHaveLength(1);
  });

  it('clears all pending orders while keeping completed', () => {
    const state: AppState = {
      ...createDefaultAppState(),
      manualOrderList: [
        baseOrder({ id: 'p1' }),
        baseOrder({ id: 'p2', symbol: '1295' }),
        baseOrder({ id: 'd1', completed: true }),
      ],
    };

    const { next, result } = clearPendingManualOrdersInState(state);
    expect(result.ok).toBe(true);
    expect(result.removedCount).toBe(2);
    expect(next.manualOrderList).toHaveLength(1);
    expect(next.manualOrderList[0]?.completed).toBe(true);
  });

  it('blocks delete in read-only mode', async () => {
    await savePersonalKillSwitches({
      readOnlyMode: true,
      disableTradeSubmission: false,
    });
    const state: AppState = {
      ...createDefaultAppState(),
      manualOrderList: [baseOrder()],
    };

    const single = removePendingManualOrderInState(state, 'order-1');
    expect(single.result.ok).toBe(false);

    const bulk = clearPendingManualOrdersInState(state);
    expect(bulk.result.ok).toBe(false);
  });
});
