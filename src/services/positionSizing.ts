import type {
  AccountType,
  Currency,
  PortfolioPosition,
  PositionSizingResult,
  StockFundamentals,
} from '../types';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { StockRecommendation } from '../types/recommendation';
import type { TechnicalSnapshot } from '../types';
import { evaluateMarketRegime } from './marketRegimeEngine';
import { calculatePositionSize } from './positionSizingEngine';
import { isAccountSupported } from './buyingPower';
import { toMYR } from './fx';

export type SuggestPositionSizeOptions = {
  regime?: MarketRegimeResult;
  stock?: StockFundamentals;
  technicals?: TechnicalSnapshot;
  recommendation?: StockRecommendation | null;
  stopLossPrice?: number;
  entryPrice?: number;
  existingAllocationPct?: number;
  totalCapitalMYR?: number;
  portfolio?: PortfolioPosition[];
  portfolioDrawdownPct?: number;
};

/** 後方互換 + レジーム連動サイジング */
export function suggestPositionSize(
  buyingPowerMYR: number,
  stockPrice: number,
  currency: Currency,
  accountType: AccountType,
  riskPerTradePct = 1,
  maxPositionPctOfCapital = 5,
  options?: SuggestPositionSizeOptions,
): PositionSizingResult {
  if (options?.stock) {
    const regime = options.regime ?? evaluateMarketRegime();
    return calculatePositionSize({
      stock: options.stock,
      buyingPowerMYR,
      accountType,
      regime,
      technicals: options.technicals,
      recommendation: options.recommendation,
      riskPerTradePct,
      stopLossPrice: options.stopLossPrice,
      entryPrice: options.entryPrice ?? stockPrice,
      existingAllocationPct: options.existingAllocationPct,
      totalCapitalMYR: options.totalCapitalMYR,
      portfolio: options.portfolio,
      portfolioDrawdownPct: options.portfolioDrawdownPct,
    });
  }

  if (!isAccountSupported(accountType)) {
    return {
      maxPositionValue: 0,
      suggestedShares: 0,
      riskPerTradePct,
      notes: 'Cash Upfront口座のみポジションサイズを算出します。',
    };
  }

  const priceMYR = toMYR(stockPrice, currency);
  if (buyingPowerMYR <= 0 || priceMYR <= 0) {
    return {
      maxPositionValue: 0,
      suggestedShares: 0,
      riskPerTradePct,
      notes: '投資金額または買付余力を先に設定してください。',
    };
  }

  const maxPositionMYR = buyingPowerMYR * (maxPositionPctOfCapital / 100);
  const suggestedShares = Math.floor(maxPositionMYR / priceMYR);

  return {
    maxPositionValue: maxPositionMYR,
    suggestedShares,
    riskPerTradePct,
    notes: `1銘柄上限 約${maxPositionPctOfCapital}%（RM${maxPositionMYR.toFixed(0)}）。1トレードのリスク目安 約${riskPerTradePct}%。`,
  };
}

export { calculatePositionSize } from './positionSizingEngine';
