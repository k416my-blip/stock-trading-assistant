import type { StockSymbol } from '../types';

export interface ExtendedFundamentals {
  pbr: number;
  roe: number;
  revenueGrowthPct: number;
  profitGrowthPct: number;
  debtRatioPct: number;
  eps: number;
  guidance: string;
}

function hashSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seeded(symbol: string, min: number, max: number): number {
  const h = hashSymbol(symbol);
  const t = (h % 1000) / 1000;
  return min + t * (max - min);
}

/** 銘柄ごとの参考ファンダメンタル（サンプル／API未取得時） */
export function getExtendedFundamentals(symbol: StockSymbol): ExtendedFundamentals {
  return {
    pbr: Math.round(seeded(symbol, 0.8, 4.5) * 10) / 10,
    roe: Math.round(seeded(symbol + 'roe', 5, 28) * 10) / 10,
    revenueGrowthPct: Math.round(seeded(symbol + 'rev', -5, 25) * 10) / 10,
    profitGrowthPct: Math.round(seeded(symbol + 'prof', -10, 30) * 10) / 10,
    debtRatioPct: Math.round(seeded(symbol + 'debt', 15, 65) * 10) / 10,
    eps: Math.round(seeded(symbol + 'eps', 0.2, 5.5) * 100) / 100,
    guidance:
      seeded(symbol + 'g', 0, 1) > 0.55
        ? '業績見通しはおおむね堅調（参考推定）'
        : '業績見通しは慎重（参考推定）',
  };
}
