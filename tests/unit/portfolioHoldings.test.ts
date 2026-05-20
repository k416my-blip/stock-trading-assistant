import { describe, expect, it } from 'vitest';
import { HOLDING_ERRORS, LIVE_ANALYSIS_BUY_GUIDANCE_JA } from '../../src/constants/holdingErrors';
import {
  liveAnalysisBuyBlockedMessage,
  shouldBlockLiveAnalysisBuy,
} from '../../src/services/holdingFlow';
import {
  applyManualHoldingToState,
  applyPracticeBuyToState,
  mergePortfolioFromPersistence,
  selectActiveHoldings,
} from '../../src/services/portfolioHoldings';
import { createDefaultPracticeState } from '../../src/services/practice';
import { createDefaultAppState } from '../../src/services/storage';
import type { AppState, PortfolioPosition } from '../../src/types';

function baseAppState(): AppState {
  return createDefaultAppState();
}

function position(symbol: string, shares: number, avg: number): PortfolioPosition {
  return {
    id: `bursa-${symbol}-t`,
    symbol,
    market: 'bursa',
    currency: 'MYR',
    shares,
    averageBuyPrice: avg,
    currentPrice: avg,
    openedAt: new Date().toISOString(),
  };
}

describe('portfolioHoldings', () => {
  it('practice buy adds new holding', () => {
    const state = { ...baseAppState(), appMode: 'practice' as const };
    const result = applyPracticeBuyToState(state, {
      symbol: '1155',
      market: 'bursa',
      currency: 'MYR',
      side: 'buy',
      shares: 100,
      price: 10,
      brokerageFee: 8,
      executedAt: new Date().toISOString(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const holdings = selectActiveHoldings(result.state, true);
    expect(holdings.some((h) => h.symbol === '1155')).toBe(true);
    expect(holdings.find((h) => h.symbol === '1155')?.shares).toBe(100);
  });

  it('practice buy increases existing holding quantity', () => {
    const state = {
      ...baseAppState(),
      appMode: 'practice' as const,
      practice: {
        ...createDefaultPracticeState(),
        portfolio: [position('1155', 50, 9.5)],
      },
    };
    const result = applyPracticeBuyToState(state, {
      symbol: '1155',
      market: 'bursa',
      currency: 'MYR',
      side: 'buy',
      shares: 50,
      price: 10,
      brokerageFee: 8,
      executedAt: new Date().toISOString(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const holding = selectActiveHoldings(result.state, true).find((h) => h.symbol === '1155');
    expect(holding?.shares).toBe(100);
  });

  it('practice buy updates average cost', () => {
    const state = {
      ...baseAppState(),
      appMode: 'practice' as const,
      practice: {
        ...createDefaultPracticeState(),
        portfolio: [position('1155', 100, 9)],
      },
    };
    const result = applyPracticeBuyToState(state, {
      symbol: '1155',
      market: 'bursa',
      currency: 'MYR',
      side: 'buy',
      shares: 100,
      price: 11,
      brokerageFee: 0,
      executedAt: new Date().toISOString(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const holding = selectActiveHoldings(result.state, true).find((h) => h.symbol === '1155');
    expect(holding?.averageBuyPrice).toBe(10);
  });

  it('merge keeps in-memory holding when persistence is stale', () => {
    const memory = [position('1155', 100, 10)];
    const persisted: PortfolioPosition[] = [];
    const merged = mergePortfolioFromPersistence(memory, persisted);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.symbol).toBe('1155');
  });

  it('manual holding add creates holding with journal source', () => {
    const state = baseAppState();
    const result = applyManualHoldingToState(state, {
      symbol: '1023',
      market: 'bursa',
      currency: 'MYR',
      shares: 200,
      averageBuyPrice: 7.2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.journalEntry?.recordSource).toBe('manual_record');
    const holdings = selectActiveHoldings(result.state, false);
    expect(holdings.find((h) => h.symbol === '1023')?.shares).toBe(200);
  });

  it('manual holding add updates existing holding', () => {
    const state = {
      ...baseAppState(),
      portfolio: [position('1023', 100, 7)],
    };
    const result = applyManualHoldingToState(state, {
      symbol: '1023',
      market: 'bursa',
      currency: 'MYR',
      shares: 50,
      averageBuyPrice: 7.5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const holding = selectActiveHoldings(result.state, false).find((h) => h.symbol === '1023');
    expect(holding?.shares).toBe(150);
    expect(holding?.averageBuyPrice).toBeCloseTo(7.166, 2);
  });

  it('live analysis mode blocks automated buy path', () => {
    expect(shouldBlockLiveAnalysisBuy(false, 'buy')).toBe(true);
    expect(shouldBlockLiveAnalysisBuy(false, 'sell')).toBe(false);
    expect(shouldBlockLiveAnalysisBuy(true, 'buy')).toBe(false);
    expect(liveAnalysisBuyBlockedMessage()).toBe(LIVE_ANALYSIS_BUY_GUIDANCE_JA);
  });

  it('rejects invalid manual holding quantity', () => {
    const result = applyManualHoldingToState(baseAppState(), {
      symbol: '1155',
      market: 'bursa',
      currency: 'MYR',
      shares: 0,
      averageBuyPrice: 10,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(HOLDING_ERRORS.invalidQuantity);
  });

  it('selector returns newly added symbol', () => {
    const state = baseAppState();
    const next = applyManualHoldingToState(state, {
      symbol: '5225',
      market: 'bursa',
      currency: 'MYR',
      shares: 10,
      averageBuyPrice: 4,
    });
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    const symbols = selectActiveHoldings(next.state, false).map((h) => h.symbol);
    expect(symbols).toContain('5225');
  });
});
