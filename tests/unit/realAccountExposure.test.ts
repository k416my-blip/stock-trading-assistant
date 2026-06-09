import { describe, expect, it } from 'vitest';
import {
  buildRealAccountExposureReport,
  computePendingOrderMarketValueMYR,
  computeCashBreakdown,
} from '../../src/services/realAccountExposure';
import { buildUserPendingOrders } from '../../src/services/forwardValidation/forwardValidationMalaysiaV4RealAccountAudit';

const PRICES = {
  '5347': 14.14,
  '1023': 7.39,
  '5398': 4.32,
  '6742': 4.14,
  '3336': 2.33,
};

describe('realAccountExposure (audit88)', () => {
  it('total assets equals matched + total cash (no double count)', () => {
    const pending = buildUserPendingOrders(PRICES);
    const report = buildRealAccountExposureReport({
      matchedPositions: [],
      pendingOrders: pending,
      availableCashMYR: 5000,
      priceBySymbol: PRICES,
    });
    expect(report.totalAssetsMYR).toBe(
      report.matchedStockValueMYR + report.cash.totalCashMYR,
    );
    expect(report.effectiveExposureMYR).toBe(report.totalAssetsMYR);
    expect(report.matchedStockValueMYR).toBe(0);
    expect(report.cash.totalCashMYR).toBe(5000);
  });

  it('flags audit87 double counting when pending + cash both counted', () => {
    const pending = buildUserPendingOrders(PRICES);
    const report = buildRealAccountExposureReport({
      matchedPositions: [],
      pendingOrders: pending,
      availableCashMYR: 5000,
      priceBySymbol: PRICES,
    });
    expect(report.isDoubleCounting).toBe(true);
    expect(report.audit87EffectiveExposureMYR).toBeGreaterThan(report.totalAssetsMYR);
    expect(report.doubleCountExcessMYR).toBeGreaterThan(0);
  });

  it('splits cash into available and reserved', () => {
    const pending = buildUserPendingOrders(PRICES);
    const pendingValue = computePendingOrderMarketValueMYR(pending, PRICES);
    const cash = computeCashBreakdown({
      totalCashMYR: 5000,
      pendingCommittedMYR: pendingValue,
    });
    expect(cash.buyingPowerDeductsPending).toBe(false);
    expect(cash.reservedCashMYR).toBe(5000);
    expect(cash.availableCashMYR).toBe(0);
    expect(cash.reservedCashMYR + cash.availableCashMYR).toBe(cash.totalCashMYR);
  });

  it('pro forma allocation uses total assets as denominator', () => {
    const pending = buildUserPendingOrders(PRICES);
    const report = buildRealAccountExposureReport({
      matchedPositions: [],
      pendingOrders: pending,
      availableCashMYR: 5000,
      priceBySymbol: PRICES,
    });
    const ytl = report.allocationRows.find((r) => r.symbol === '6742')!;
    expect(ytl.pendingValueMYR).toBeGreaterThan(0);
    expect(ytl.assumedWeightPct).toBeGreaterThan(15);
    expect(report.assumedSummaryJa).toContain('YTL');
  });

  it('flags over-commitment when pending cost exceeds cash', () => {
    const pending = buildUserPendingOrders(PRICES);
    const yahooTotal = computePendingOrderMarketValueMYR(pending, PRICES, undefined, 'yahoo_market');
    expect(yahooTotal).toBeGreaterThan(5000);
    const report = buildRealAccountExposureReport({
      matchedPositions: [],
      pendingOrders: pending,
      availableCashMYR: 5000,
      priceBySymbol: PRICES,
    });
    expect(report.isOverCommitted).toBe(true);
    expect(report.pendingMarkToMarketMYR).toBeGreaterThan(5000);
    expect(report.additionalPurchasableMYR).toBe(0);
    expect(report.cashCushionAfterFillMYR).toBeLessThan(0);
  });
});
