import { describe, expect, it } from 'vitest';
import { createDefaultPracticeState } from '../../src/services/practice';
import type { AppState, TradeRecord } from '../../src/types';
import {
  buildPortfolioIntelligenceBundle,
  mapActionGuideToPredictionKind,
} from '../../src/services/portfolioIntelligenceBuilder';
import { createDefaultPortfolioIntelligenceState } from '../../src/services/portfolioIntelligenceStorage';

function baseState(trades: TradeRecord[]): AppState {
  return {
    appMode: 'practice',
    settings: {
      totalCapitalMYR: 10000,
      riskPerTradePct: 1,
      selectedMarket: 'bursa',
      accountType: 'cash_upfront',
      priceRefreshMinutes: 15,
    },
    practice: { ...createDefaultPracticeState(), trades },
    deposits: [],
    portfolio: [],
    trades: [],
    dividends: [],
    performanceHistory: [],
    manualOrderList: [],
    notificationSettings: {
      notifyBuyCandidate: true,
      notifySellCandidate: true,
      notifyStopLoss: true,
      notifyTakeProfit: true,
      notifyMarketOpenBefore: true,
      notifyMarketCloseBefore: true,
      sound: 'default',
      vibrationEnabled: true,
    },
    notificationHistory: [],
    notificationCooldowns: {},
  };
}

describe('portfolioIntelligenceBuilder', () => {
  it('maps action categories to prediction kinds', () => {
    expect(mapActionGuideToPredictionKind('panic', 'neutral')).toBe('panic_warning');
    expect(mapActionGuideToPredictionKind('caution', 'bearish')).toBe('bearish_watch');
    expect(mapActionGuideToPredictionKind('opportunity', 'bullish')).toBe('bullish');
  });

  it('builds memory and behavior from practice trades', async () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        symbol: 'AAPL',
        market: 'us',
        currency: 'USD',
        side: 'buy',
        shares: 10,
        price: 100,
        brokerageFee: 1,
        executedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: '2',
        symbol: 'AAPL',
        market: 'us',
        currency: 'USD',
        side: 'sell',
        shares: 10,
        price: 110,
        brokerageFee: 1,
        executedAt: new Date().toISOString(),
        realizedPnLMYR: 50,
      },
    ];
    const bundle = await buildPortfolioIntelligenceBundle({ state: baseState(trades) });
    expect(bundle.memory.tradeCount).toBe(2);
    expect(bundle.memory.pastSymbols).toContain('AAPL');
    expect(bundle.behavior.primaryStyle).toBeDefined();
    expect(bundle.purposeNoteJa.length).toBeGreaterThan(10);
  });

  it('default storage state is empty', () => {
    const s = createDefaultPortfolioIntelligenceState();
    expect(s.journal).toEqual([]);
    expect(s.privacyLocalOnly).toBe(true);
  });
});
