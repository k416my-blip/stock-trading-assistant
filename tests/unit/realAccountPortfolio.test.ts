import { describe, expect, it } from 'vitest';
import {
  classifyRakutenFlowState,
  getMatchedMalaysiaPositions,
  getPendingMalaysiaOrders,
  matchedSharesForOrder,
  projectPortfolioAfterFullFill,
  resolveRealAccountHoldings,
} from '../../src/services/realAccountPortfolio';
import type { ManualOrderItem, PortfolioPosition } from '../../src/types';

const pendingOrder = (symbol: string, shares: number): ManualOrderItem => ({
  id: `o-${symbol}`,
  symbol,
  name: symbol,
  market: 'bursa',
  currency: 'MYR',
  side: 'buy',
  entryPrice: 10,
  estimatedShares: shares,
  allocationMYR: 10 * shares,
  orderMethod: 'test',
  completed: false,
  createdAt: '2026-01-01',
  source: 'allocation',
});

describe('realAccountPortfolio', () => {
  it('pending order has matchedShares=0', () => {
    expect(matchedSharesForOrder(pendingOrder('5398', 100))).toBe(0);
  });

  it('resolveRealAccountHoldings uses matched only for rebalance', () => {
    const resolved = resolveRealAccountHoldings({
      matchedPositions: [],
      pendingOrders: [pendingOrder('5398', 100), pendingOrder('5347', 100)],
      cashMYR: 5000,
    });
    expect(resolved.rebalanceHoldings).toHaveLength(0);
    expect(resolved.projectedAfterFullFill).toHaveLength(2);
  });

  it('classifies flow states', () => {
    expect(classifyRakutenFlowState({ matchedCount: 0, pendingOrderCount: 0, cashMYR: 5000 })).toBe(
      'cash_only',
    );
    expect(classifyRakutenFlowState({ matchedCount: 0, pendingOrderCount: 5, cashMYR: 5000 })).toBe(
      'orders_pending',
    );
    expect(classifyRakutenFlowState({ matchedCount: 2, pendingOrderCount: 3, cashMYR: 1000 })).toBe(
      'partially_filled',
    );
    expect(classifyRakutenFlowState({ matchedCount: 5, pendingOrderCount: 0, cashMYR: 0 })).toBe(
      'fully_filled',
    );
  });

  it('projectPortfolioAfterFullFill merges pending into matched', () => {
    const matched: PortfolioPosition[] = [
      {
        id: '1',
        symbol: '5347',
        market: 'bursa',
        currency: 'MYR',
        shares: 100,
        averageBuyPrice: 14,
        currentPrice: 14,
        openedAt: '2026-01-01',
      },
    ];
    const projected = projectPortfolioAfterFullFill(matched, [pendingOrder('1023', 50)]);
    expect(projected).toHaveLength(2);
    expect(getMatchedMalaysiaPositions(projected).reduce((s, p) => s + p.shares, 0)).toBe(150);
  });

  it('getPendingMalaysiaOrders excludes completed', () => {
    const orders = [pendingOrder('5398', 100), { ...pendingOrder('1023', 50), completed: true }];
    expect(getPendingMalaysiaOrders(orders)).toHaveLength(1);
  });
});
