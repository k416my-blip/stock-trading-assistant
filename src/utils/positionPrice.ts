import type { PortfolioPosition } from '../types';
import { resolveHoldingPrice } from '../services/holdingPriceCore';

/** 保有ポジションから UI・売買・評価に使う安全な株価 */
export function positionDisplayPrice(position: PortfolioPosition): number {
  return resolveHoldingPrice(position).price;
}
