import { getExtendedFundamentals } from '../../data/sampleExtendedFundamentals';
import type { StockFundamentals } from '../../types';
import type { AnalysisApiKeys } from '../analysisApiKeys';
import type { EarningsAnalysisResult } from '../../types/recommendation';

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function growthScore(pct: number): number {
  if (pct >= 15) return 85;
  if (pct >= 5) return 72;
  if (pct >= 0) return 58;
  if (pct >= -5) return 42;
  return 28;
}

function buildFromExtended(stock: StockFundamentals): EarningsAnalysisResult {
  const ext = getExtendedFundamentals(stock.symbol);
  const parts = [
    growthScore(ext.revenueGrowthPct),
    growthScore(ext.profitGrowthPct),
    ext.eps > 0 ? 65 : 40,
    ext.guidance.includes('堅調') ? 70 : 48,
  ];
  const score = clampScore(parts.reduce((a, b) => a + b, 0) / parts.length);

  return {
    score,
    revenueGrowthPct: ext.revenueGrowthPct,
    profitGrowthPct: ext.profitGrowthPct,
    eps: ext.eps,
    guidance: ext.guidance,
    summary: `売上${fmt(ext.revenueGrowthPct)}% · 利益${fmt(ext.profitGrowthPct)}% · EPS ${ext.eps}`,
    explanation:
      '決算評価：会社の業績が良くなっているかを見る目安です。実際の決算はRakuten Tradeや公式開示で必ず確認してください。',
    source: 'estimated',
  };
}

function fmt(v: number): string {
  return v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

export function analyzeEarningsSync(stock: StockFundamentals): EarningsAnalysisResult {
  if (stock.category === 'etf') {
    return {
      score: 60,
      revenueGrowthPct: null,
      profitGrowthPct: null,
      eps: null,
      guidance: 'ETFは個別決算の代わりに構成銘柄の動きが影響します',
      summary: 'ETF（決算指標は参考外）',
      explanation:
        '決算評価：会社の業績が良くなっているかを見る目安です。ETFは銘柄特性が異なります。',
      source: 'estimated',
    };
  }
  return buildFromExtended(stock);
}

export async function analyzeEarnings(
  stock: StockFundamentals,
  apiKeys: AnalysisApiKeys,
): Promise<EarningsAnalysisResult> {
  if (apiKeys.earningsApiKey.trim()) {
    try {
      // 将来の決算API接続用
      const remote = await fetchEarningsFromApi(stock, apiKeys.earningsApiKey);
      if (remote) return remote;
    } catch {
      /* unavailable */
    }
    return {
      score: 50,
      revenueGrowthPct: null,
      profitGrowthPct: null,
      eps: null,
      guidance: null,
      summary: '決算データ未取得',
      explanation:
        '決算評価：会社の業績が良くなっているかを見る目安です。',
      source: 'unavailable',
    };
  }
  return analyzeEarningsSync(stock);
}

async function fetchEarningsFromApi(
  _stock: StockFundamentals,
  _apiKey: string,
): Promise<EarningsAnalysisResult | null> {
  return null;
}
