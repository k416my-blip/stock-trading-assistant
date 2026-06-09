import { describe, expect, it } from 'vitest';
import {
  getHoldingsSymbols,
  getManualOrderSymbols,
  getWatchlistSymbols,
  resolveSymbolsForAllocation,
  resolveSymbolsForAdvice,
  resolveSymbolsForScope,
} from '../../src/services/userAnalysisSymbols';
import type { AppState, ManualOrderItem, PortfolioPosition } from '../../src/types';

function baseState(overrides?: Partial<AppState>): AppState {
  return {
    appMode: 'manual',
    settings: {
      totalCapitalMYR: 5000,
      riskPerTradePct: 2,
      selectedMarket: 'bursa',
      accountType: 'cash_upfront',
      priceRefreshMinutes: 15,
    },
    practice: {
      virtualCapitalMYR: 5000,
      cashBalanceMYR: 5000,
      portfolio: [],
      trades: [],
      performanceHistory: [],
    },
    portfolio: [],
    manualOrderList: [],
    trades: [],
    dividends: [],
    notificationSettings: {
      notifyBuyCandidate: true,
      notifySellCandidate: true,
      notifyStopLoss: true,
      notifyTakeProfit: true,
      notifyMarketOpenBefore: true,
      notifyMarketCloseBefore: true,
      notifyAllocationPlan: true,
    },
    notificationCooldowns: {},
    notificationHistory: [],
    ...overrides,
  } as AppState;
}

const holding = (symbol: string): PortfolioPosition => ({
  id: `h-${symbol}`,
  symbol,
  market: 'bursa',
  currency: 'MYR',
  shares: 100,
  averageBuyPrice: 10,
  currentPrice: 10,
  companyName: symbol,
  openedAt: new Date().toISOString(),
});

const pendingOrder = (symbol: string, completed = false): ManualOrderItem => ({
  id: `o-${symbol}`,
  symbol,
  name: symbol,
  market: 'bursa',
  side: 'buy',
  entryPrice: 10,
  estimatedShares: 100,
  allocationMYR: 1000,
  currency: 'MYR',
  orderMethod: 'manual',
  completed,
  source: 'allocation',
  createdAt: new Date().toISOString(),
});

describe('userAnalysisSymbols', () => {
  it('resolves allocation scope as holdings + watchlist + orders union', () => {
    const state = baseState({
      portfolio: [holding('5347'), holding('1023')],
      manualOrderList: [pendingOrder('5398'), pendingOrder('6742', true)],
    });
    const syms = resolveSymbolsForAllocation(state, false).map((s) => s.symbol);
    expect(syms).toContain('5347');
    expect(syms).toContain('1023');
    expect(syms).toContain('5398');
    expect(syms).toContain('6742');
  });

  it('advice scope defaults to holdings + pending watchlist only', () => {
    const state = baseState({
      portfolio: [holding('5347')],
      manualOrderList: [pendingOrder('5398'), pendingOrder('6742', true)],
    });
    const syms = resolveSymbolsForAdvice(state, false).map((s) => s.symbol);
    expect(syms).toContain('5347');
    expect(syms).toContain('5398');
    expect(syms).not.toContain('6742');
  });

  it('holdings_only scope excludes manual orders', () => {
    const state = baseState({
      portfolio: [holding('5347')],
      manualOrderList: [pendingOrder('5398')],
    });
    const syms = resolveSymbolsForScope(state, false, 'holdings_only').map((s) => s.symbol);
    expect(syms).toEqual(['5347']);
  });

  it('watchlist is pending manual orders only', () => {
    const state = baseState({
      manualOrderList: [pendingOrder('5398'), pendingOrder('6742', true)],
    });
    expect(getWatchlistSymbols(state).map((s) => s.symbol)).toEqual(['5398']);
    expect(getManualOrderSymbols(state).map((s) => s.symbol)).toEqual(['5398', '6742']);
    expect(getHoldingsSymbols(state, false)).toHaveLength(0);
  });
});
