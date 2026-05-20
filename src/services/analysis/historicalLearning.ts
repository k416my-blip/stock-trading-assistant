import { getSamplePriceHistory } from '../../data/sampleStocks';
import type { PriceBar } from '../../types';
import type { HistoricalLearningResult } from '../../types/recommendation';

const HISTORICAL_DISCLAIMER =
  '過去データは将来を保証するものではありません。値動きは市場環境で大きく変わります。';

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function computeStats(bars: PriceBar[]): {
  returnPct90d: number;
  declinePct90d: number;
  volatilityPct: number;
  maxDrawdownPct: number;
  winRatePct: number;
} {
  if (bars.length < 5) {
    return {
      returnPct90d: 0,
      declinePct90d: 0,
      volatilityPct: 0,
      maxDrawdownPct: 0,
      winRatePct: 50,
    };
  }

  const closes = bars.map((b) => b.close);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const returnPct90d = first > 0 ? ((last - first) / first) * 100 : 0;

  let peak = closes[0];
  let maxDrawdownPct = 0;
  let upDays = 0;
  const dailyReturns: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > peak) peak = closes[i];
    const dd = peak > 0 ? ((peak - closes[i]) / peak) * 100 : 0;
    if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    if (closes[i] > closes[i - 1]) upDays++;
    if (closes[i - 1] > 0) {
      dailyReturns.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
    }
  }

  const winRatePct = closes.length > 1 ? (upDays / (closes.length - 1)) * 100 : 50;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / Math.max(dailyReturns.length, 1);
  const variance =
    dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(dailyReturns.length, 1);
  const volatilityPct = Math.sqrt(variance) * Math.sqrt(252);

  const minClose = Math.min(...closes);
  const declinePct90d = peak > 0 ? ((peak - minClose) / peak) * 100 : 0;

  return { returnPct90d, declinePct90d, volatilityPct, maxDrawdownPct, winRatePct };
}

export function analyzeHistorical(symbol: string): HistoricalLearningResult {
  let bars: PriceBar[] = [];
  try {
    bars = getSamplePriceHistory(symbol);
  } catch {
    return unavailableHistorical();
  }

  if (bars.length < 5) {
    return unavailableHistorical();
  }

  const stats = computeStats(bars);
  const returnScore = clampScore(50 + stats.returnPct90d * 1.2);
  const volPenalty = clampScore(80 - stats.volatilityPct * 1.5);
  const drawdownPenalty = clampScore(85 - stats.maxDrawdownPct * 1.2);
  const winScore = clampScore(stats.winRatePct * 0.9);
  const score = clampScore((returnScore + volPenalty + drawdownPenalty + winScore) / 4);

  return {
    score,
    returnPct90d: Math.round(stats.returnPct90d * 10) / 10,
    declinePct90d: Math.round(stats.declinePct90d * 10) / 10,
    volatilityPct: Math.round(stats.volatilityPct * 10) / 10,
    maxDrawdownPct: Math.round(stats.maxDrawdownPct * 10) / 10,
    winRatePct: Math.round(stats.winRatePct * 10) / 10,
    summary: `90日リターン ${fmt(stats.returnPct90d)}% · ボラ ${stats.volatilityPct.toFixed(1)}%`,
    explanation:
      '過去データ学習：過去の値動きパターンから参考スコアを出しています。将来を保証しません。',
    disclaimer: HISTORICAL_DISCLAIMER,
    source: 'estimated',
  };
}

function fmt(v: number): string {
  return v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

function unavailableHistorical(): HistoricalLearningResult {
  return {
    score: 50,
    returnPct90d: null,
    declinePct90d: null,
    volatilityPct: null,
    maxDrawdownPct: null,
    winRatePct: null,
    summary: '過去データ未取得',
    explanation:
      '過去データ学習：過去の値動きパターンから参考スコアを出しています。',
    disclaimer: HISTORICAL_DISCLAIMER,
    source: 'unavailable',
  };
}
