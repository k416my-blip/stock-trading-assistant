import type { PortfolioPosition } from '../types';
import { resolveDisplayPrice } from './safeNumeric';

/** 保有ポジションから UI・売買・評価に使う安全な株価 */
export function positionDisplayPrice(position: PortfolioPosition): number {
  return resolveDisplayPrice({
    currentPrice: position.currentPrice,
    averageBuyPrice: position.averageBuyPrice,
    priceSource: position.priceSource,
    previousPrice: position.currentPrice,
  });
}
