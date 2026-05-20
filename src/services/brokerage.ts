import { estimateBrokerageFee } from '../constants/rakutenTrade';
import type { BrokerageEstimate, Market, Currency } from '../types';

export function getBrokerageEstimate(
  market: Market,
  shares: number,
  price: number,
  currency: Currency,
): BrokerageEstimate {
  const tradeValue = shares * price;
  return estimateBrokerageFee(market, tradeValue, currency);
}
