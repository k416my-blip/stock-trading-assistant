import type {
  AppState,
  Currency,
  DividendRecord,
  HoldingDetail,
  Market,
  PerformancePoint,
  PortfolioPosition,
  PositionPnL,
  TradeRecord,
} from '../types';
import { findStock, getSamplePriceHistory } from '../data/sampleStocks';
import { PRICE_ALERT_PROXIMITY_PCT } from '../constants/notifications';
import { toMYR } from './fx';
import { computePositionPnL, holdingsValueFromPositions } from './positionValuation';
import {
  formatHoldingPriceMeta,
  preserveHoldingCurrentPrice,
  resolveHoldingPrice,
} from './holdingPriceCore';
import { safeNumber, safePrice, safeShares } from '../utils/safeNumeric';
import { analyzeTechnicals } from './technicalAnalysis';
import { buildTradeSuggestion } from './tradeSuggestions';
import { computeQuoteStaleMetadata } from './staleDataMetadata';

type LegacyPosition = PortfolioPosition & { avgCost?: number };

/** 保存データを最新の保有ポジション形式に揃える */
export function normalizePortfolioPosition(raw: LegacyPosition): PortfolioPosition {
  const averageBuyPrice = safePrice(
    typeof raw.averageBuyPrice === 'number'
      ? raw.averageBuyPrice
      : typeof raw.avgCost === 'number'
        ? raw.avgCost
        : 0,
    0,
    0,
  );
  const samplePrice = raw.symbol ? findStock(raw.symbol)?.price : undefined;
  const currentPrice = preserveHoldingCurrentPrice({
    ...raw,
    shares: safeShares(raw.shares, 0),
    averageBuyPrice,
    currentPrice:
      typeof raw.currentPrice === 'number'
        ? raw.currentPrice
        : typeof samplePrice === 'number'
          ? samplePrice
          : averageBuyPrice,
  });

  const market = raw.market ?? 'bursa';
  const symbol = raw.symbol ?? '';
  const openedAt = raw.openedAt ?? new Date().toISOString();
  const lastSuccessfulFetchAt =
    raw.lastSuccessfulFetchAt ?? raw.lastApiPriceAt ?? raw.currentPriceUpdatedAt;
  const stale = computeQuoteStaleMetadata(
    raw.currentPriceUpdatedAt ?? raw.lastApiPriceAt,
    lastSuccessfulFetchAt,
  );

  return {
    id: raw.id ?? `${market}-${symbol}-${openedAt}`,
    symbol,
    market,
    currency: raw.currency,
    shares: safeShares(raw.shares, 0),
    averageBuyPrice,
    currentPrice,
    currentPriceUpdatedAt: raw.currentPriceUpdatedAt,
    priceSource: raw.priceSource === 'api' ? 'api' : raw.priceSource === 'manual' ? 'manual' : undefined,
    priceFetchStatus:
      raw.priceFetchStatus === 'failed' || raw.priceFetchStatus === 'pending' || raw.priceFetchStatus === 'ok'
        ? raw.priceFetchStatus
        : undefined,
    lastApiPriceAt: raw.lastApiPriceAt,
    lastSuccessfulFetchAt: stale.lastSuccessfulFetchAt,
    quoteAgeMs: raw.quoteAgeMs ?? stale.quoteAgeMs,
    quoteAgeSeconds: raw.quoteAgeSeconds ?? stale.quoteAgeSeconds,
    isStale: raw.isStale ?? stale.isStale,
    priceFromCache: raw.priceFromCache,
    companyName: typeof raw.companyName === 'string' ? raw.companyName.trim() || undefined : undefined,
    lastValidPrice: raw.lastValidPrice,
    lastQuoteProvider: raw.lastQuoteProvider,
    openedAt,
  };
}

export function portfolioMarketValueMYR(state: AppState): number {
  return state.portfolio.reduce((sum, p) => {
    const shares = safeShares(p.shares, 0);
    const { price } = resolveHoldingPrice(p);
    return sum + toMYR(price * shares, p.currency);
  }, 0);
}

export function calculatePositionsPnLFromList(portfolio: PortfolioPosition[]): PositionPnL[] {
  return portfolio.map((p) => computePositionPnL(p));
}

export function calculatePositionsPnL(state: AppState): PositionPnL[] {
  return calculatePositionsPnLFromList(state.portfolio);
}

export function totalUnrealizedPnLMYR(positions: PositionPnL[]): number {
  return positions.reduce(
    (s, p) => s + toMYR(p.unrealizedProfitLoss, findStock(p.symbol)?.currency ?? 'MYR'),
    0,
  );
}

function positionIdForTrade(trade: Pick<TradeRecord, 'symbol' | 'market' | 'executedAt'>): string {
  return `${trade.market}-${trade.symbol}-${trade.executedAt}`;
}

function dropZeroSharePositions(portfolio: PortfolioPosition[]): PortfolioPosition[] {
  return portfolio.filter((p) => safeShares(p.shares, 0) > 0);
}

/** 保有行を ID で削除（手動整理用） */
export function removePortfolioPosition(
  portfolio: PortfolioPosition[],
  positionId: string,
): { portfolio: PortfolioPosition[]; removed: PortfolioPosition | null } {
  const removed = portfolio.find((p) => p.id === positionId) ?? null;
  return {
    portfolio: portfolio.filter((p) => p.id !== positionId),
    removed,
  };
}

export function applyTradeToPortfolio(
  portfolio: PortfolioPosition[],
  trade: TradeRecord,
): PortfolioPosition[] {
  if (trade.shares <= 0) {
    return dropZeroSharePositions(portfolio);
  }

  const existing = portfolio.find((p) => p.symbol === trade.symbol && p.market === trade.market);

  if (trade.side === 'buy') {
    if (existing) {
      const totalShares = existing.shares + trade.shares;
      const averageBuyPrice =
        (existing.averageBuyPrice * existing.shares + trade.price * trade.shares) / totalShares;
      return dropZeroSharePositions(
        portfolio.map((p) =>
          p.id === existing.id
            ? { ...p, shares: totalShares, averageBuyPrice, currentPrice: trade.price }
            : p,
        ),
      );
    }
    return dropZeroSharePositions([
      ...portfolio,
      {
        id: positionIdForTrade(trade),
        symbol: trade.symbol,
        market: trade.market,
        currency: trade.currency,
        shares: trade.shares,
        averageBuyPrice: trade.price,
        currentPrice: trade.price,
        currentPriceUpdatedAt: trade.executedAt,
        priceSource: 'manual',
        priceFetchStatus: 'ok',
        openedAt: trade.executedAt,
      },
    ]);
  }

  if (!existing) return dropZeroSharePositions(portfolio);
  const remaining = existing.shares - trade.shares;
  if (remaining <= 0) {
    return dropZeroSharePositions(portfolio.filter((p) => p.id !== existing.id));
  }
  return dropZeroSharePositions(
    portfolio.map((p) => (p.id === existing.id ? { ...p, shares: remaining } : p)),
  );
}

export function updatePositionCurrentPrice(
  portfolio: PortfolioPosition[],
  positionId: string,
  currentPrice: number,
): PortfolioPosition[] {
  const updatedAt = new Date().toISOString();
  return portfolio.map((p) =>
    p.id === positionId
      ? {
          ...p,
          currentPrice,
          currentPriceUpdatedAt: updatedAt,
          priceSource: 'manual',
          priceFetchStatus: 'ok',
        }
      : p,
  );
}

const DEFAULT_CURRENCY: Record<Market, Currency> = {
  bursa: 'MYR',
  us: 'USD',
  hk: 'HKD',
};

export function updatePositionSymbol(
  portfolio: PortfolioPosition[],
  positionId: string,
  symbol: string,
): PortfolioPosition[] {
  const normalized = symbol.trim().toUpperCase();
  const stock = findStock(normalized);
  return portfolio.map((p) =>
    p.id === positionId
      ? {
          ...p,
          symbol: normalized,
          currency: stock?.currency ?? p.currency,
          priceFetchStatus: undefined,
        }
      : p,
  );
}

export function updatePositionMarket(
  portfolio: PortfolioPosition[],
  positionId: string,
  market: Market,
): PortfolioPosition[] {
  const stock = findStock(
    portfolio.find((p) => p.id === positionId)?.symbol ?? '',
  );
  return portfolio.map((p) =>
    p.id === positionId
      ? {
          ...p,
          market,
          currency: stock?.market === market ? stock.currency : DEFAULT_CURRENCY[market],
          priceFetchStatus: undefined,
        }
      : p,
  );
}

export function appendPerformanceSnapshot(
  history: PerformancePoint[],
  date: string,
  portfolioValueMYR: number,
): PerformancePoint[] {
  return [...history, { date, portfolioValueMYR }].slice(-90);
}

export function totalDividendsMYR(dividends: DividendRecord[]): number {
  return dividends.reduce((s, d) => s + toMYR(d.amount, d.currency), 0);
}

function isNearStopLossPrice(current: number, stopLoss: number): boolean {
  if (stopLoss <= 0 || current <= 0) return false;
  if (current <= stopLoss) return true;
  return ((current - stopLoss) / current) * 100 <= PRICE_ALERT_PROXIMITY_PCT;
}

function isNearTakeProfitPrice(current: number, takeProfit: number): boolean {
  if (takeProfit <= 0 || current <= 0) return false;
  if (current >= takeProfit) return true;
  return ((takeProfit - current) / current) * 100 <= PRICE_ALERT_PROXIMITY_PCT;
}

function positionToHoldingDetail(
  p: PositionPnL,
  totalPortfolioValueMYR: number,
  meta?: PortfolioPosition,
): HoldingDetail {
  const stock = findStock(p.symbol);
  const currency = meta?.currency ?? stock?.currency ?? 'MYR';
  const name =
    meta?.companyName?.trim() || stock?.name || p.symbol;
  const technicals = analyzeTechnicals(getSamplePriceHistory(p.symbol));
  const resolved = meta ? resolveHoldingPrice(meta) : null;
  const priceMeta = meta && resolved ? formatHoldingPriceMeta(meta, resolved) : null;
  const displayPrice =
    resolved?.price != null && Number.isFinite(resolved.price) && resolved.price > 0
      ? resolved.price
      : p.currentPrice > 0 && Number.isFinite(p.currentPrice)
        ? p.currentPrice
        : 0;
  const suggestion = buildTradeSuggestion(displayPrice > 0 ? displayPrice : p.averageBuyPrice, technicals);

  const stopLossUnitPrice = suggestion.stopLoss;
  const takeProfitUnitPrice = suggestion.takeProfit;
  const suggestedStopLossTotal = stopLossUnitPrice * p.shares;
  const suggestedTakeProfitTotal = takeProfitUnitPrice * p.shares;
  const sharesSafe = Number.isFinite(p.shares) ? p.shares : 0;
  const currentValueMYR = toMYR(displayPrice * sharesSafe, currency);
  const purchaseAmountMYR = toMYR(p.purchaseAmount, currency);
  const allocationPct =
    totalPortfolioValueMYR > 0 ? (currentValueMYR / totalPortfolioValueMYR) * 100 : 0;

  const isNearStopLoss = isNearStopLossPrice(displayPrice, stopLossUnitPrice);
  const isNearTakeProfit = isNearTakeProfitPrice(displayPrice, takeProfitUnitPrice);

  const hasPrice = displayPrice > 0;

  return {
    ...p,
    currentPrice: displayPrice,
    currentValue: displayPrice * sharesSafe,
    unrealizedProfitLoss: displayPrice * sharesSafe - p.purchaseAmount,
    unrealizedProfitLossPercent:
      p.purchaseAmount > 0
        ? ((displayPrice * sharesSafe - p.purchaseAmount) / p.purchaseAmount) * 100
        : 0,
    positionId: meta?.id ?? `${p.market}-${p.symbol}`,
    name,
    currency,
    purchaseAmountMYR,
    currentValueMYR: toMYR(displayPrice * p.shares, currency),
    allocationPct,
    stopLossUnitPrice,
    takeProfitUnitPrice,
    suggestedStopLossTotal,
    suggestedTakeProfitTotal,
    suggestedStopLossTotalMYR: toMYR(suggestedStopLossTotal, currency),
    suggestedTakeProfitTotalMYR: toMYR(suggestedTakeProfitTotal, currency),
    isNearStopLoss,
    isNearTakeProfit,
    displayPrice,
    displayPriceSource: resolved?.source,
    lastSavedPrice: resolved?.lastSavedPrice,
    lastValidPrice: resolved?.lastValidPrice ?? priceMeta?.lastValidPrice,
    normalizedYahooSymbol: priceMeta?.normalizedYahooSymbol,
    lastQuoteProviderLabel: priceMeta?.quoteProviderLabel,
    priceAvailable: hasPrice,
    priceSource: meta?.priceSource,
    priceStatusLabel: priceMeta?.priceStatusLabel ?? resolved?.priceStatusLabel,
    priceStaleWarning: resolved?.priceStaleWarning ?? false,
    priceStaleByAge: resolved?.priceStaleByAge ?? false,
    priceFromCache: resolved?.priceFromCache,
    isStale: resolved?.isStale ?? false,
    quoteAgeMs: meta?.quoteAgeMs,
    quoteAgeSeconds: meta?.quoteAgeSeconds,
    lastSuccessfulFetchAt: meta?.lastSuccessfulFetchAt ?? meta?.lastApiPriceAt,
    lastUpdatedDisplay: priceMeta?.lastUpdatedLabel,
  };
}

/** 保有銘柄一覧をカード表示用に拡張（portfolio の順序と 1:1 で対応） */
export function buildHoldingDetails(
  portfolioMeta: PortfolioPosition[],
  totalPortfolioValueMYR: number,
): HoldingDetail[] {
  const safeMeta = portfolioMeta.map((p) => {
    const shares = safeShares(p.shares, 0);
    const averageBuyPrice = safePrice(p.averageBuyPrice, 0, 0);
    const currentPrice = preserveHoldingCurrentPrice({ ...p, shares, averageBuyPrice });
    return { ...p, shares, averageBuyPrice, currentPrice };
  });

  const pnls = calculatePositionsPnLFromList(safeMeta);
  const total =
    Number.isFinite(totalPortfolioValueMYR) && totalPortfolioValueMYR > 0
      ? totalPortfolioValueMYR
      : pnls.reduce(
          (sum: number, p: PositionPnL) =>
            sum + toMYR(safeNumber(p.currentValue, 0), findStock(p.symbol)?.currency ?? 'MYR'),
          0,
        );
  return safeMeta.map((meta, index) => {
    const p = pnls[index];
    return positionToHoldingDetail(p, total, meta);
  });
}

export { holdingsValueFromPositions };
