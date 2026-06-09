import { describe, expect, it } from 'vitest';
import {
  buildPendingOrderValuationRows,
  computePendingOrderValuationTotalMYR,
  pendingOrderAmountMYR,
} from '../../src/services/realAccountOrderValuation';
import { buildUserPendingOrders } from '../../src/services/forwardValidation/forwardValidationMalaysiaV4RealAccountAudit';

const PRICES = {
  '5347': 14.14,
  '1023': 7.39,
  '5398': 4.32,
  '6742': 4.14,
  '3336': 2.33,
};

describe('realAccountOrderValuation (audit89)', () => {
  it('uses limit price × shares by default', () => {
    const pending = buildUserPendingOrders(PRICES);
    const orderTotal = computePendingOrderValuationTotalMYR(pending, 'order_price', PRICES);
    const yahooTotal = computePendingOrderValuationTotalMYR(pending, 'yahoo_market', PRICES);
    expect(orderTotal).toBe(5820);
    expect(yahooTotal).toBe(5820);
  });

  it('prefers manual limit over yahoo when they differ', () => {
    const pending = buildUserPendingOrders(PRICES);
    pending[0] = { ...pending[0]!, entryPrice: 11.65, allocationMYR: 1165 };
    const orderTotal = computePendingOrderValuationTotalMYR(pending, 'order_price', PRICES);
    const yahooTotal = computePendingOrderValuationTotalMYR(pending, 'yahoo_market', PRICES);
    expect(orderTotal).toBe(5820 - 1414 + 1165);
    expect(yahooTotal).toBe(5820);
  });

  it('builds comparison rows with yahoo delta', () => {
    const pending = buildUserPendingOrders(PRICES);
    pending[3] = { ...pending[3]!, entryPrice: 3.0, allocationMYR: 1500 };
    const rows = buildPendingOrderValuationRows(pending, PRICES);
    const ytl = rows.find((r) => r.symbol === '6742')!;
    expect(ytl.orderPriceMYR).toBe(1500);
    expect(ytl.yahooMarketValueMYR).toBe(2070);
    expect(ytl.orderVsYahooDeltaMYR).toBe(-570);
  });

  it('pendingOrderAmountMYR falls back to allocationMYR', () => {
    const pending = buildUserPendingOrders(PRICES);
    pending[0] = { ...pending[0]!, entryPrice: 0, allocationMYR: 999 };
    expect(pendingOrderAmountMYR(pending[0]!)).toBe(999);
  });
});
