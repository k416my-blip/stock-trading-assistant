import { SAMPLE_STOCKS } from '../data/sampleStocks';
import { MARKET_LABEL } from '../constants/rakutenTrade';
import { STOCK_CATEGORY_LABEL } from '../constants/stockCatalog';
import type { RankedStock, StockFundamentals } from '../types';
import type { AiLearningState } from './analysis/aiLearning';
import { buildStockRecommendation } from './recommendationEngine';

export type StockSearchFilterId =
  | 'us'
  | 'bursa'
  | 'hk'
  | 'etf'
  | 'dividend'
  | 'growth'
  | 'beginner';

export const STOCK_SEARCH_FILTER_LABELS: Record<StockSearchFilterId, string> = {
  us: '米国市場',
  bursa: 'マレーシア市場',
  hk: '香港市場',
  etf: 'ETF',
  dividend: '配当',
  growth: '成長',
  beginner: '初心者向け',
};

const MARKET_FILTER_IDS: StockSearchFilterId[] = ['us', 'bursa', 'hk'];
const CATEGORY_FILTER_IDS: StockSearchFilterId[] = ['etf', 'dividend', 'growth', 'beginner'];

export type StockSearchOptions = {
  aiState?: AiLearningState;
};

export function rankAllStocks(options: StockSearchOptions = {}): RankedStock[] {
  return SAMPLE_STOCKS.map((stock) => {
    const recommendation = buildStockRecommendation(stock, {
      aiState: options.aiState,
      recordLearning: false,
    });
    return {
      ...stock,
      score: recommendation.totalScore,
      recommendation,
      rank: 0,
    };
  })
    .sort((a, b) => b.score - a.score)
    .map((stock, index) => ({ ...stock, rank: index + 1 }));
}

function stockSearchBlob(stock: StockFundamentals): string {
  return [
    stock.name,
    stock.symbol,
    MARKET_LABEL[stock.market],
    STOCK_CATEGORY_LABEL[stock.category],
    stock.market,
  ]
    .join(' ')
    .toLowerCase();
}

function matchesCategoryFilter(stock: StockFundamentals, filter: StockSearchFilterId): boolean {
  if (filter === 'etf') return stock.category === 'etf';
  if (filter === 'dividend') return stock.category === 'dividend';
  if (filter === 'growth') return stock.category === 'growth';
  if (filter === 'beginner') return stock.beginnerFriendly === true;
  return false;
}

export function matchesStockFilters(
  stock: StockFundamentals,
  activeFilters: ReadonlySet<StockSearchFilterId>,
): boolean {
  if (activeFilters.size === 0) return true;

  const marketFilters = MARKET_FILTER_IDS.filter((id) => activeFilters.has(id));
  if (marketFilters.length > 0) {
    const marketOk = marketFilters.some((id) => id === stock.market);
    if (!marketOk) return false;
  }

  const categoryFilters = CATEGORY_FILTER_IDS.filter((id) => activeFilters.has(id));
  if (categoryFilters.length > 0) {
    const categoryOk = categoryFilters.some((id) => matchesCategoryFilter(stock, id));
    if (!categoryOk) return false;
  }

  return true;
}

export function filterRankedStocks(
  stocks: RankedStock[],
  query: string,
  activeFilters: ReadonlySet<StockSearchFilterId>,
): RankedStock[] {
  const q = query.trim().toLowerCase();
  return stocks.filter((stock) => {
    if (!matchesStockFilters(stock, activeFilters)) return false;
    if (!q) return true;
    return stockSearchBlob(stock).includes(q);
  });
}

export function formatStockPrice(
  price: number,
  currencySymbol: string,
): { text: string; unavailable: boolean } {
  if (!Number.isFinite(price) || price <= 0) {
    return { text: '価格未取得', unavailable: true };
  }
  return { text: `${currencySymbol}${price}`, unavailable: false };
}

export function beginnerRecommendStars(stock: RankedStock): string {
  if (stock.beginnerFriendly) return '★★★★★';
  if (stock.recommendation.totalScore >= 72 && stock.recommendation.risk.score >= 55) return '★★★★☆';
  if (stock.recommendation.totalScore >= 58) return '★★★☆☆';
  return '★★☆☆☆';
}
