import { describe, expect, it } from 'vitest';
import { createDefaultAppState } from '../../src/services/storage';
import {
  clearPendingManualOrdersInState,
  removePendingManualOrderInState,
} from '../../src/services/manualOrderListManagement';
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

describe('manualOrderListDelete', () => {
  it('removes a pending order and updates count', () => {
    const state: AppState = {
      ...createDefaultAppState(),
      manualOrderList: [baseOrder({ id: 'p1' }), baseOrder({ id: 'd1', completed: true, status: 'completed' })],
    };
    const result = removePendingManualOrderInState(state, 'p1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.manualOrderList).toHaveLength(1);
  });

  it('clears all pending orders while keeping completed', () => {
    const state: AppState = {
      ...createDefaultAppState(),
      manualOrderList: [
        baseOrder({ id: 'p1' }),
        baseOrder({ id: 'p2', symbol: '1295' }),
        baseOrder({ id: 'd1', completed: true, status: 'completed' }),
      ],
    };
    const result = clearPendingManualOrdersInState(state);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.removedCount).toBe(2);
    expect(result.state.manualOrderList).toHaveLength(1);
  });
});
