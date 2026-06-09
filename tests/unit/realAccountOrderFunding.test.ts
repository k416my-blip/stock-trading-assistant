import { describe, expect, it } from 'vitest';
import {
  buildOrderFundingSummary,
  fitPendingOrdersToCashWithFees,
} from '../../src/services/realAccountOrderFunding';
import { buildUserPendingOrdersFromLimits } from '../../src/services/forwardValidation/forwardValidationMalaysiaV4RealAccountAudit';
import { EXAMPLE_RAKUTEN_V4_LIMIT_PRICES } from '../../src/services/forwardValidation/forwardValidationMalaysiaV4RakutenRegisterAudit';

describe('realAccountOrderFunding (audit91/92)', () => {
  it('deployable cash equals cash minus fees', () => {
    const orders = buildUserPendingOrdersFromLimits(EXAMPLE_RAKUTEN_V4_LIMIT_PRICES);
    const funding = buildOrderFundingSummary({ cashMYR: 5000, orders });
    expect(funding.deployableCashMYR).toBe(funding.cashMYR - funding.estimatedFeesMYR);
    expect(funding.orderTotalMYR).toBe(5000);
    expect(funding.estimatedFeesMYR).toBe(40);
    expect(funding.grandTotalMYR).toBe(5040);
    expect(funding.canPlaceOrders).toBe(false);
    expect(funding.balanceAfterMYR).toBe(-40);
  });

  it('fits orders to cash by share reduction without changing entryPrice', () => {
    const orders = buildUserPendingOrdersFromLimits(EXAMPLE_RAKUTEN_V4_LIMIT_PRICES);
    const originalPrices = orders.map((o) => ({ symbol: o.symbol, entryPrice: o.entryPrice }));
    const { funding, proposal } = fitPendingOrdersToCashWithFees(orders, 5000);

    expect(proposal.entryPricesUnchanged).toBe(true);
    expect(proposal.rakutenPriceMatch).toBe(true);
    expect(funding.canPlaceOrders).toBe(true);
    expect(funding.balanceAfterMYR).toBeGreaterThanOrEqual(-0.01);
    expect(funding.grandTotalMYR).toBeLessThanOrEqual(5000.01);

    for (const orig of originalPrices) {
      const adjusted = proposal.proposedOrders.find((o) => o.symbol === orig.symbol);
      expect(adjusted?.entryPrice).toBe(orig.entryPrice);
    }

    expect(proposal.reductions.length).toBeGreaterThan(0);
    expect(proposal.reductions[0]?.symbol).toBe('6742');
  });
});
