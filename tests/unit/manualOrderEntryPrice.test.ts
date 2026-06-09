import { describe, expect, it } from 'vitest';
import {
  applyManualOrderEntryPriceUpdate,
  syncManualOrderAllocation,
  validateManualOrderEntryPrice,
} from '../../src/services/manualOrderEntryPrice';
import { buildUserPendingOrdersFromLimits } from '../../src/services/forwardValidation/forwardValidationMalaysiaV4RealAccountAudit';
import { EXAMPLE_RAKUTEN_V4_LIMIT_PRICES } from '../../src/services/forwardValidation/forwardValidationMalaysiaV4RakutenRegisterAudit';

describe('manualOrderEntryPrice', () => {
  it('syncs allocationMYR from entryPrice × shares', () => {
    const orders = buildUserPendingOrdersFromLimits({ '5347': 12.15 });
    const updated = syncManualOrderAllocation(orders[0]!, 11.5);
    expect(updated.entryPrice).toBe(11.5);
    expect(updated.allocationMYR).toBe(1150);
  });

  it('updates order in list by id', () => {
    const orders = buildUserPendingOrdersFromLimits(EXAMPLE_RAKUTEN_V4_LIMIT_PRICES);
    const id = orders[0]!.id;
    const result = applyManualOrderEntryPriceUpdate(orders, id, 12.0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.orders[0]!.entryPrice).toBe(12);
      expect(result.orders[0]!.allocationMYR).toBe(1200);
    }
  });

  it('rejects invalid entry price', () => {
    expect(validateManualOrderEntryPrice(0).ok).toBe(false);
    expect(validateManualOrderEntryPrice(-1).ok).toBe(false);
  });
});

describe('buildUserPendingOrdersFromLimits', () => {
  it('uses limit prices not yahoo', () => {
    const orders = buildUserPendingOrdersFromLimits(EXAMPLE_RAKUTEN_V4_LIMIT_PRICES);
    const total = orders.reduce((s, o) => s + o.entryPrice * o.estimatedShares, 0);
    expect(total).toBeGreaterThan(4900);
    expect(total).toBeLessThanOrEqual(5010);
  });
});
