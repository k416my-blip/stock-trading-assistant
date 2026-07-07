import { describe, expect, it } from 'vitest';
import {
  DEVICE_VERIFY_TEST_IDS,
  formatPendingManualOrderProbe,
  parsePendingManualOrderProbe,
} from '@/constants/deviceVerifyTestIds';
import {
  buildManualOrderListProbes,
  buildPendingManualOrderProbe,
  countPendingManualOrders,
  parsePendingCountFromAccessibilityLabels,
} from '@/services/manualOrderVerification';
import type { ManualOrderItem } from '@/types';

function order(id: string, completed = false): ManualOrderItem {
  return {
    id,
    symbol: '1155',
    name: 'Test',
    market: 'bursa',
    currency: 'MYR',
    side: 'buy',
    entryPrice: 1,
    estimatedShares: 100,
    allocationMYR: 100,
    orderMethod: 'manual',
    completed,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('deviceVerifyTestIds', () => {
  it('exposes stable home manual order button ids', () => {
    expect(DEVICE_VERIFY_TEST_IDS.homeManualOrderButton('concierge_full')).toBe(
      'home-manual-order-concierge_full',
    );
    expect(DEVICE_VERIFY_TEST_IDS.settingsUxMode('pro')).toBe('settings-ux-mode-pro');
    expect(DEVICE_VERIFY_TEST_IDS.aiInvestmentMode('trust')).toBe('ai-investment-mode-trust');
    expect(DEVICE_VERIFY_TEST_IDS.manualOrderCreate('manual_full')).toBe('manual-order-create-manual_full');
  });

  it('formats and parses pending count probe labels', () => {
    expect(formatPendingManualOrderProbe(3)).toBe('manual-order-pending-count:3');
    expect(parsePendingManualOrderProbe('manual-order-pending-count:3')).toBe(3);
    expect(parsePendingManualOrderProbe('other')).toBeNull();
  });
});

describe('manualOrderVerification', () => {
  it('counts pending orders from state', () => {
    const list = [order('a'), order('b', true), order('c')];
    expect(countPendingManualOrders(list)).toBe(2);
    expect(buildPendingManualOrderProbe(list).probeLabel).toBe('manual-order-pending-count:2');
    const probes = buildManualOrderListProbes(list);
    expect(probes.completedProbeLabel).toBe('manual-order-completed-count:1');
  });

  it('parses pending count from accessibility labels', () => {
    expect(
      parsePendingCountFromAccessibilityLabels([
        'Home',
        'manual-order-pending-count:5',
      ]),
    ).toBe(5);
    expect(parsePendingCountFromAccessibilityLabels(['Home'])).toBeNull();
  });
});
