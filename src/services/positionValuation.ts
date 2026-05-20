import type { PortfolioPosition, PositionPnL } from '../types';
import { resolveDisplayPrice, safePrice, safeShares } from '../utils/safeNumeric';

export function computePositionPnL(
  position: Pick<
    PortfolioPosition,
    'symbol' | 'market' | 'shares' | 'averageBuyPrice' | 'currentPrice' | 'priceSource'
  >,
): PositionPnL {
  const shares = safeShares(position.shares, 0);
  const averageBuyPrice = safePrice(position.averageBuyPrice, 0, 0);
  const currentPrice = resolveDisplayPrice({
    currentPrice: position.currentPrice,
    averageBuyPrice: position.averageBuyPrice,
    priceSource: position.priceSource,
    previousPrice: position.currentPrice,
  });

  const purchaseAmount = averageBuyPrice * shares;
  const currentValue = currentPrice * shares;
  const unrealizedProfitLoss = currentValue - purchaseAmount;
  const unrealizedProfitLossPercent =
    purchaseAmount > 0 ? (unrealizedProfitLoss / purchaseAmount) * 100 : 0;

  return {
    symbol: position.symbol,
    market: position.market,
    shares,
    averageBuyPrice,
    currentPrice,
    purchaseAmount,
    currentValue,
    unrealizedProfitLoss,
    unrealizedProfitLossPercent,
  };
}

export function holdingsValueFromPositions(portfolio: PortfolioPosition[]): number {
  return portfolio.reduce((sum, p) => {
    const shares = safeShares(p.shares, 0);
    const price = resolveDisplayPrice({
      currentPrice: p.currentPrice,
      averageBuyPrice: p.averageBuyPrice,
      priceSource: p.priceSource,
      previousPrice: p.currentPrice,
    });
    return sum + price * shares;
  }, 0);
}
