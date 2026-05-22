import { describe, expect, it } from 'vitest';
import { buildHoldingDetails } from '../../src/services/portfolio';
import {
  preserveHoldingCurrentPrice,
  resolveDisplayCurrentPrice,
  resolveHoldingPrice,
} from '../../src/utils/holdingPrice';
import type { HoldingDetail, PortfolioPosition } from '../../src/types';

function pos(partial: Partial<PortfolioPosition>): PortfolioPosition {
  return {
    id: 'p1',
    symbol: '4707',
    market: 'bursa',
    currency: 'MYR',
    shares: 10,
    averageBuyPrice: 90,
    currentPrice: 95,
    openedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('resolveHoldingPrice', () => {
  it('preserveHoldingCurrentPrice never returns invalid when average exists', () => {
    const p = pos({ currentPrice: undefined as unknown as number, averageBuyPrice: 88 });
    expect(preserveHoldingCurrentPrice(p)).toBe(88);
    expect(preserveHoldingCurrentPrice(p, { currentPrice: NaN })).toBe(88);
  });

  it('uses saved price when fetch failed (latestApi ?? saved ?? manual ?? avg)', () => {
    const p = pos({
      currentPrice: 92.5,
      priceFetchStatus: 'failed',
      priceSource: 'api',
      isStale: true,
    });
    const r = resolveHoldingPrice(p);
    expect(r.price).toBe(92.5);
    expect(r.source).toBe('saved');
    expect(r.priceStaleWarning).toBe(true);
    expect(r.showStaleBadge).toBe(true);
  });

  it('prefers latest API price over saved', () => {
    const p = pos({ currentPrice: 100, priceFetchStatus: 'ok', priceSource: 'api' });
    const r = resolveHoldingPrice(p);
    expect(r.price).toBe(100);
    expect(r.source).toBe('api_live');
    expect(r.latestApiPrice).toBe(100);
  });

  it('treats string API prices as live (4707.KL style)', () => {
    const p = pos({
      currentPrice: '95' as unknown as number,
      priceFetchStatus: 'ok',
      priceSource: 'api',
    });
    const r = resolveHoldingPrice(p);
    expect(r.price).toBe(95);
    expect(r.source).toBe('api_live');
    expect(r.latestApiPrice).toBe(95);
    expect(r.priceStaleWarning).toBe(false);
  });

  it('falls back to average buy price', () => {
    const p = pos({
      currentPrice: undefined as unknown as number,
      averageBuyPrice: 88,
      priceFetchStatus: 'failed',
    });
    const r = resolveHoldingPrice(p);
    expect(r.price).toBe(88);
    expect(r.source).toBe('average_buy');
  });

  it('resolveDisplayCurrentPrice derives unit price from currentValue when displayPrice missing', () => {
    const holding = {
      symbol: '4707',
      market: 'bursa',
      shares: 10,
      averageBuyPrice: 1.65,
      currentPrice: 0,
      displayPrice: 0,
      currentValue: 205.7,
      purchaseAmount: 16.5,
      unrealizedProfitLoss: 189.2,
      unrealizedProfitLossPercent: 0,
      positionId: 'p1',
      name: 'Nestlé',
      currency: 'MYR',
      purchaseAmountMYR: 16.5,
      currentValueMYR: 205.7,
      allocationPct: 100,
      stopLossUnitPrice: 1.74,
      takeProfitUnitPrice: 2.02,
      suggestedStopLossTotal: 17.4,
      suggestedTakeProfitTotal: 20.2,
      suggestedStopLossTotalMYR: 17.4,
      suggestedTakeProfitTotalMYR: 20.2,
      isNearStopLoss: false,
      isNearTakeProfit: false,
      priceAvailable: true,
    } as HoldingDetail;

    expect(resolveDisplayCurrentPrice(holding)).toBeCloseTo(20.57, 2);
  });

  it('Nestlé 4707 keeps lastValidPrice after successful API quote', () => {
    const details = buildHoldingDetails(
      [
        pos({
          symbol: '4707',
          currentPrice: 95,
          lastValidPrice: 95,
          priceFetchStatus: 'ok',
          priceSource: 'api',
          lastQuoteProvider: 'yahoo_finance',
          lastSuccessfulFetchAt: new Date().toISOString(),
          lastApiPriceAt: new Date().toISOString(),
          currentPriceUpdatedAt: new Date().toISOString(),
          isStale: false,
        }),
      ],
      950,
    );
    expect(details[0]?.displayPrice).toBe(95);
    expect(details[0]?.currentPrice).toBe(95);
    expect(details[0]?.currentValue).toBe(950);
    expect(details[0]?.lastValidPrice).toBe(95);
    expect(details[0]?.priceStatusLabel).toBe('自動');
  });

  it('buildHoldingDetails aligns valuation with resolved price', () => {
    const details = buildHoldingDetails(
      [
        pos({
          currentPrice: 92.5,
          priceFetchStatus: 'failed',
          priceSource: 'api',
          isStale: true,
        }),
      ],
      1000,
    );
    expect(details[0]?.displayPrice).toBe(92.5);
    expect(details[0]?.currentPrice).toBe(92.5);
    expect(details[0]?.currentValue).toBe(925);
    expect(details[0]?.priceStaleWarning).toBe(true);
  });
});
