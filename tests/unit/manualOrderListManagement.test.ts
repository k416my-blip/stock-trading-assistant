import { describe, expect, it } from 'vitest';
import { createDefaultAppState } from '../../src/services/storage';
import {
  applyManualOrderEditInState,
  clearPendingManualOrdersInState,
  countCompletedManualOrdersFromList,
  countPendingManualOrdersFromList,
  markManualOrderCompletedInState,
  removePendingManualOrderInState,
  resolveManualOrderStatus,
  validateManualOrderEdit,
} from '../../src/services/manualOrderListManagement';
import { buildManualOrderListProbes } from '../../src/services/manualOrderVerification';
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
    createdAt: '2026-01-01T00:00:00.000Z',
    source: 'allocation',
    ...overrides,
  };
}

describe('manualOrderListManagement', () => {
  it('treats legacy orders without status as pending', () => {
    expect(resolveManualOrderStatus(baseOrder())).toBe('pending');
    expect(resolveManualOrderStatus(baseOrder({ completed: true }))).toBe('completed');
  });

  it('removes one pending order and decreases pending count', () => {
    const state: AppState = {
      ...createDefaultAppState(),
      manualOrderList: [baseOrder({ id: 'p1' }), baseOrder({ id: 'p2', symbol: '1295' })],
    };
    const result = removePendingManualOrderInState(state, 'p1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(countPendingManualOrdersFromList(result.state.manualOrderList)).toBe(1);
  });

  it('clears all pending orders', () => {
    const state: AppState = {
      ...createDefaultAppState(),
      manualOrderList: [
        baseOrder({ id: 'p1' }),
        baseOrder({ id: 'p2' }),
        baseOrder({ id: 'd1', completed: true, status: 'completed' }),
      ],
    };
    const result = clearPendingManualOrdersInState(state);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.removedCount).toBe(2);
    expect(countPendingManualOrdersFromList(result.state.manualOrderList)).toBe(0);
  });

  it('updates edit fields without changing pending count', () => {
    const state: AppState = {
      ...createDefaultAppState(),
      manualOrderList: [baseOrder({ id: 'p1' })],
    };
    const result = applyManualOrderEditInState(state, 'p1', {
      symbol: '1023',
      name: 'CIMB',
      estimatedShares: 50,
      side: 'buy',
      market: 'bursa',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const item = result.state.manualOrderList[0]!;
    expect(item.symbol).toBe('1023');
    expect(item.estimatedShares).toBe(50);
    expect(countPendingManualOrdersFromList(result.state.manualOrderList)).toBe(1);
  });

  it('rejects invalid edit values', () => {
    expect(validateManualOrderEdit({ symbol: '', name: 'X', estimatedShares: 1, side: 'buy', market: 'bursa' }).ok).toBe(false);
    expect(validateManualOrderEdit({ symbol: '1155', name: 'X', estimatedShares: 0, side: 'buy', market: 'bursa' }).ok).toBe(false);
  });

  it('moves order from pending to completed', () => {
    const state: AppState = {
      ...createDefaultAppState(),
      manualOrderList: [baseOrder({ id: 'p1' })],
    };
    const result = markManualOrderCompletedInState(state, 'p1', '2026-07-07T04:00:00.000Z');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(countPendingManualOrdersFromList(result.state.manualOrderList)).toBe(0);
    expect(countCompletedManualOrdersFromList(result.state.manualOrderList)).toBe(1);
    expect(result.state.manualOrderList[0]?.completedAt).toBe('2026-07-07T04:00:00.000Z');
  });

  it('updates pending and completed probes', () => {
    const probes = buildManualOrderListProbes([
      baseOrder({ id: 'p1' }),
      baseOrder({ id: 'd1', completed: true }),
    ]);
    expect(probes.probeLabel).toBe('manual-order-pending-count:1');
    expect(probes.completedProbeLabel).toBe('manual-order-completed-count:1');
  });
});
