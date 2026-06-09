/** RN非依存 · SAMPLE_STOCKS検索コア（監査85/CLI用） */
import type { StockFundamentals } from '../types';
import { SAMPLE_STOCKS } from '../data/sampleStocks';
import { MARKET_LABEL } from '../constants/rakutenTrade';
import { STOCK_CATEGORY_LABEL } from '../constants/stockCatalog';

export function stockSearchBlob(stock: StockFundamentals): string {
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

export function filterSampleStocks(
  query: string,
  options?: { market?: StockFundamentals['market'] },
): StockFundamentals[] {
  const q = query.trim().toLowerCase();
  return SAMPLE_STOCKS.filter((stock) => {
    if (options?.market && stock.market !== options.market) return false;
    if (!q) return true;
    return stockSearchBlob(stock).includes(q);
  });
}

export function isSymbolInSearchIndex(symbol: string): boolean {
  return SAMPLE_STOCKS.some((s) => s.symbol === symbol);
}
