import { SAMPLE_STOCKS } from '../../src/data/sampleStocks';
import type { AppState, Market, PortfolioPosition, UserSettings } from '../../src/types';

const DEFAULT_SETTINGS: UserSettings = {
  totalCapitalMYR: 500_000,
  riskPerTradePct: 2,
  selectedMarket: 'bursa',
  accountType: 'cash_upfront',
  priceRefreshMinutes: 15,
};

function emptyPractice() {
  return {
    virtualCapitalMYR: 100_000,
    cashBalanceMYR: 100_000,
    portfolio: [] as PortfolioPosition[],
    trades: [],
    performanceHistory: [],
  };
}

function positionFromStock(
  stock: (typeof SAMPLE_STOCKS)[number],
  index: number,
  shares: number,
): PortfolioPosition {
  const now = new Date().toISOString();
  return {
    id: `probe-${stock.symbol}-${index}`,
    symbol: stock.symbol,
    market: stock.market,
    currency: stock.currency,
    shares,
    averageBuyPrice: stock.price * 0.92,
    currentPrice: stock.price,
    currentPriceUpdatedAt: now,
    priceSource: 'api',
    priceFetchStatus: 'ok',
    lastApiPriceAt: now,
    lastSuccessfulFetchAt: now,
    quoteAgeSeconds: 30,
    isStale: false,
    companyName: stock.name,
    openedAt: now,
    lastQuoteProvider: 'yahoo_finance',
  };
}

/** 検証用 — Bursa 優先で N 銘柄の保有状態を合成 */
export function buildProbeAppState(holdingCount: number, marketMix: 'bursa-first' | 'mixed' = 'mixed'): AppState {
  const bursa = SAMPLE_STOCKS.filter((s) => s.market === 'bursa');
  const us = SAMPLE_STOCKS.filter((s) => s.market === 'us');
  const ordered =
    marketMix === 'bursa-first'
      ? [...bursa, ...us]
      : [...bursa, ...us, ...SAMPLE_STOCKS.filter((s) => s.market === 'hk')];
  const picks = ordered.slice(0, Math.max(1, holdingCount));

  const portfolio = picks.map((s, i) => positionFromStock(s, i, 100 + i * 10));

  return {
    appMode: 'manual',
    settings: DEFAULT_SETTINGS,
    practice: emptyPractice(),
    deposits: [],
    portfolio,
    trades: [],
    dividends: [],
    performanceHistory: [],
    manualOrderList: [],
    notificationSettings: {
      notifyBuyCandidate: false,
      notifySellCandidate: false,
      notifyStopLoss: false,
      notifyTakeProfit: false,
      notifyMarketOpenBefore: false,
      notifyMarketCloseBefore: false,
      sound: 'default',
      vibrationEnabled: false,
    },
    notificationHistory: [],
    notificationCooldowns: {},
  };
}

/** 特定銘柄のウェイトを上げた保有（スコア変動確認用） */
export function buildSkewedProbeState(symbols: string[], heavySymbol: string, heavyShares: number): AppState {
  const base = buildProbeAppState(symbols.length);
  return {
    ...base,
    portfolio: base.portfolio.map((p) =>
      p.symbol.toUpperCase() === heavySymbol.toUpperCase()
        ? { ...p, shares: heavyShares, currentPrice: p.currentPrice * 1.05 }
        : { ...p, shares: 50 },
    ),
  };
}

export function listProbeSymbols(state: AppState): string[] {
  return state.portfolio.map((p) => p.symbol);
}
