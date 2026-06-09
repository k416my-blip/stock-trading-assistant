/**
 * ユーザー登録銘柄のみを AI 分析・提案・通知の対象にする
 */
import { findStock } from '../data/sampleStocks';
import type {
  AiAnalysisSymbolScope,
} from '../constants/aiAnalysisScope';
import { DEFAULT_AI_ANALYSIS_SYMBOL_SCOPE } from '../constants/aiAnalysisScope';
import type { AppState, ManualOrderItem, Market, PortfolioPosition, StockFundamentals } from '../types';
import { getActivePortfolio } from './portfolioPriceUpdate';

export type UserSymbolRef = {
  symbol: string;
  market: Market;
  name?: string;
};

export function normalizeSymbolKey(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(KL|HK|US)$/i, '');
}

function dedupeRefs(refs: UserSymbolRef[]): UserSymbolRef[] {
  const map = new Map<string, UserSymbolRef>();
  for (const ref of refs) {
    const key = normalizeSymbolKey(ref.symbol);
    if (!key) continue;
    if (!map.has(key)) map.set(key, ref);
  }
  return [...map.values()];
}

export function getHoldingsSymbols(state: AppState, isPractice: boolean): UserSymbolRef[] {
  return getActivePortfolio(state)
    .filter((p) => (p.shares ?? 0) > 0)
    .map((p) => ({
      symbol: p.symbol,
      market: p.market,
      name: p.companyName,
    }));
}

/** 未約定の手動注文 = ウォッチリスト */
export function getWatchlistSymbols(state: AppState): UserSymbolRef[] {
  return state.manualOrderList
    .filter((o) => !o.completed)
    .map((o) => ({
      symbol: o.symbol,
      market: o.market,
      name: o.name,
    }));
}

/** 手動注文リスト全体 */
export function getManualOrderSymbols(state: AppState): UserSymbolRef[] {
  return state.manualOrderList.map((o) => ({
    symbol: o.symbol,
    market: o.market,
    name: o.name,
  }));
}

export function resolveSymbolsForScope(
  state: AppState,
  isPractice: boolean,
  scope: AiAnalysisSymbolScope = DEFAULT_AI_ANALYSIS_SYMBOL_SCOPE,
): UserSymbolRef[] {
  const holdings = getHoldingsSymbols(state, isPractice);
  const watchlist = getWatchlistSymbols(state);
  const orders = getManualOrderSymbols(state);

  switch (scope) {
    case 'holdings_only':
      return dedupeRefs(holdings);
    case 'holdings_watchlist':
      return dedupeRefs([...holdings, ...watchlist]);
    case 'holdings_watchlist_orders':
      return dedupeRefs([...holdings, ...watchlist, ...orders]);
    default:
      return dedupeRefs([...holdings, ...watchlist]);
  }
}

/** おすすめ配分 — 保有 + ウォッチ + 手動注文のみ */
export function resolveSymbolsForAllocation(
  state: AppState,
  isPractice: boolean,
): UserSymbolRef[] {
  return resolveSymbolsForScope(state, isPractice, 'holdings_watchlist_orders');
}

/** AI売買アドバイス — 設定スコープ（デフォルト 保有+ウォッチ） */
export function resolveSymbolsForAdvice(
  state: AppState,
  isPractice: boolean,
  scope: AiAnalysisSymbolScope = DEFAULT_AI_ANALYSIS_SYMBOL_SCOPE,
): UserSymbolRef[] {
  return resolveSymbolsForScope(state, isPractice, scope);
}

/** 通知 — 保有 + ウォッチ + 手動注文 */
export function resolveSymbolsForNotifications(
  state: AppState,
  isPractice: boolean,
): UserSymbolRef[] {
  return resolveSymbolsForAllocation(state, isPractice);
}

export function buildAllowedSymbolKeySet(refs: UserSymbolRef[]): Set<string> {
  return new Set(refs.map((r) => normalizeSymbolKey(r.symbol)));
}

export function isSymbolAllowed(
  symbol: string | undefined,
  allowed: Set<string>,
): boolean {
  if (!symbol?.trim()) return true;
  return allowed.has(normalizeSymbolKey(symbol));
}

function refToFundamentals(ref: UserSymbolRef): StockFundamentals | null {
  const core = normalizeSymbolKey(ref.symbol);
  const sample = findStock(core);
  if (sample) return sample;
  if (ref.name && ref.market) {
    return {
      symbol: ref.symbol,
      name: ref.name,
      market: ref.market,
      currency: ref.market === 'us' ? 'USD' : ref.market === 'hk' ? 'HKD' : 'MYR',
      price: 0,
      dividendYield: 0,
      per: 0,
      marketCap: 0,
      volume: 0,
      category: 'growth',
    };
  }
  return null;
}

/** ユーザー銘柄 → 配分プラン用 StockFundamentals（Malaysia v4 参考モデルより優先） */
export function userSymbolsToAllocationUniverse(
  refs: UserSymbolRef[],
  market: Market,
  holdings: PortfolioPosition[],
  orders: ManualOrderItem[],
): StockFundamentals[] {
  const out: StockFundamentals[] = [];
  const seen = new Set<string>();

  for (const ref of refs) {
    if (ref.market !== market) continue;
    const key = normalizeSymbolKey(ref.symbol);
    if (seen.has(key)) continue;

    const holding = holdings.find((p) => normalizeSymbolKey(p.symbol) === key);
    const order = orders.find((o) => normalizeSymbolKey(o.symbol) === key);
    const sample = findStock(key);
    const price =
      holding?.currentPrice ??
      holding?.averageBuyPrice ??
      order?.entryPrice ??
      sample?.price ??
      0;

    const fundamentals: StockFundamentals = sample
      ? { ...sample, price: price > 0 ? price : sample.price }
      : {
          symbol: ref.symbol,
          name: ref.name ?? holding?.companyName ?? order?.name ?? ref.symbol,
          market: ref.market,
          currency: ref.market === 'us' ? 'USD' : ref.market === 'hk' ? 'HKD' : 'MYR',
          price,
          dividendYield: 0,
          per: 0,
          marketCap: 0,
          volume: 0,
          category: 'growth',
        };

    if (fundamentals.price <= 0 && sample?.price) fundamentals.price = sample.price;
    if (fundamentals.price <= 0) continue;

    seen.add(key);
    out.push(fundamentals);
  }

  return out;
}

export function filterTickersToAllowed(
  tickers: string[],
  allowed: Set<string>,
): string[] {
  return tickers.filter((t) => isSymbolAllowed(t, allowed));
}
