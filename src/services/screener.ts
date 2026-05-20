import { getStocksByMarket } from '../data/sampleStocks';
import type { Market, RankedStock, ScreenerFilters } from '../types';
import type { AiLearningState } from './analysis/aiLearning';
import { buildStockRecommendation } from './recommendationEngine';

export type ScreenerOptions = {
  aiState?: AiLearningState;
};

export function screenStocks(
  market: Market,
  filters: ScreenerFilters,
  options: ScreenerOptions = {},
): RankedStock[] {
  const universe = getStocksByMarket(market);
  const filtered = universe.filter((s) => {
    if (filters.minDividendYield != null && s.dividendYield < filters.minDividendYield) return false;
    if (filters.maxPer != null && s.per > filters.maxPer) return false;
    if (filters.minMarketCap != null && s.marketCap < filters.minMarketCap) return false;
    if (filters.minVolume != null && s.volume < filters.minVolume) return false;
    return true;
  });

  return filtered
    .map((stock) => {
      const recommendation = buildStockRecommendation(stock, {
        aiState: options.aiState,
        recordLearning: false,
      });
      return { ...stock, score: recommendation.totalScore, recommendation, rank: 0 };
    })
    .sort((a, b) => b.score - a.score)
    .map((stock, index) => ({ ...stock, rank: index + 1 }));
}

export { categoryLabel } from './stockCatalogDisplay';
