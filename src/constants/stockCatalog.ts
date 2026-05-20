import type { InvestmentStyle, StockCategory } from '../types';

export const MEGA_CAP_THRESHOLD = 1_000_000_000_000;

export const STOCK_CATEGORY_LABEL: Record<StockCategory, string> = {
  etf: 'ETF（分散投資）',
  stable: '安定・大型',
  dividend: '配当重視',
  growth: '成長',
};

const STYLE_CATEGORY_MIX: Record<InvestmentStyle, StockCategory[]> = {
  dividend: ['etf', 'dividend', 'dividend', 'stable', 'dividend', 'stable', 'etf', 'dividend'],
  growth: ['etf', 'growth', 'growth', 'stable', 'growth', 'etf', 'growth', 'stable'],
  balanced: ['etf', 'stable', 'dividend', 'growth', 'stable', 'dividend', 'growth', 'etf'],
  short_term: ['growth', 'stable', 'growth', 'etf', 'stable', 'growth', 'stable', 'growth'],
};

/** 投資スタイルごとのカテゴリ配分（候補数に応じて繰り返し） */
export function categoryMixForStyle(style: InvestmentStyle, slotCount: number): StockCategory[] {
  const list = STYLE_CATEGORY_MIX[style];
  const out: StockCategory[] = [];
  for (let i = 0; i < slotCount; i++) {
    out.push(list[i % list.length]);
  }
  return out;
}
