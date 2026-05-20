import { STOCK_CATEGORY_LABEL } from '../constants/stockCatalog';
import type { StockFundamentals } from '../types';

export function categoryLabel(stock: StockFundamentals): string {
  return STOCK_CATEGORY_LABEL[stock.category];
}
