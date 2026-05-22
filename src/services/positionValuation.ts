import type { PortfolioPosition, PositionPnL } from '../types';
import { resolveHoldingPrice } from './holdingPriceCore';
import { safePrice, safeShares } from '../utils/safeNumeric';

export function computePositionPnL(position: PortfolioPosition): PositionPnL {
  const shares = safeShares(position.shares, 0);
  const averageBuyPrice = safePrice(position.averageBuyPrice, 0, 0);
  const { price: currentPrice } = resolveHoldingPrice(position);

  const safeCurrent = Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : 0;
  const purchaseAmount = averageBuyPrice * shares;
  const currentValue = safeCurrent * shares;
  const unrealizedProfitLoss = currentValue - purchaseAmount;
  const unrealizedProfitLossPercent =
    purchaseAmount > 0 && Number.isFinite(unrealizedProfitLoss)
      ? (unrealizedProfitLoss / purchaseAmount) * 100
      : 0;

  return {
    symbol: position.symbol,
    market: position.market,
    shares,
    averageBuyPrice,
    currentPrice: safeCurrent,
    purchaseAmount,
    currentValue,
    unrealizedProfitLoss,
    unrealizedProfitLossPercent,
  };
}

export function holdingsValueFromPositions(portfolio: PortfolioPosition[]): number {
  return portfolio.reduce((sum, p) => {
    const shares = safeShares(p.shares, 0);
    const { price } = resolveHoldingPrice(p);
    return sum + price * shares;
  }, 0);
}
