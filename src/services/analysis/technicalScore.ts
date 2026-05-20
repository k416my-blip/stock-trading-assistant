import { getSamplePriceHistory } from '../../data/sampleStocks';
import { analyzeTechnicals } from '../technicalAnalysis';
import type { StockFundamentals } from '../../types';
import type { FactorScore } from '../../types/recommendation';

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function analyzeTechnicalScore(stock: StockFundamentals): FactorScore {
  try {
    const bars = getSamplePriceHistory(stock.symbol);
    const t = analyzeTechnicals(bars);
    let score = 50;
    if (t.buySignal === 'buy') score += 22;
    else if (t.buySignal === 'wait') score -= 12;
    if (t.sellSignal === 'sell') score -= 18;
    if (t.volumeTrend === 'rising') score += 10;
    if (t.rsi14 >= 40 && t.rsi14 <= 65) score += 8;
    if (t.rsi14 > 75) score -= 10;
    return { score: clampScore(score), label: 'テクニカル分析' };
  } catch {
    return { score: 50, label: 'テクニカル分析', unavailable: true };
  }
}
