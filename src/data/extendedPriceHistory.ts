import { STRESS_SCENARIOS, TRADING_DAYS_HISTORY } from '../constants/historicalSimulation';
import { findStock } from './sampleStocks';
import type { PriceBar } from '../types';

function hashSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) {
    h = (h * 31 + symbol.charCodeAt(i)) | 0;
  }
  return Math.abs(h) + 1;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stressMultiplier(dayIdx: number): number {
  for (const s of STRESS_SCENARIOS) {
    if (dayIdx >= s.startDayIdx && dayIdx <= s.endDayIdx) {
      const mid = (s.startDayIdx + s.endDayIdx) / 2;
      const dist = Math.abs(dayIdx - mid) / Math.max(1, (s.endDayIdx - s.startDayIdx) / 2);
      return 1 + (s.dailyShockScale - 1) * (1 - dist * 0.3);
    }
  }
  return 1;
}

/** バックテスト用の拡張価格系列（決定論的・ストレス期間込み） */
export function getExtendedPriceHistory(
  symbol: string,
  tradingDays = TRADING_DAYS_HISTORY,
): PriceBar[] {
  const stock = findStock(symbol);
  const base = stock?.price ?? 100;
  const rand = mulberry32(hashSymbol(symbol));
  const categoryDrift =
    stock?.category === 'growth' ? 0.0004 : stock?.category === 'dividend' ? 0.00015 : 0.00025;
  const volBase = stock?.category === 'growth' ? 0.018 : 0.012;

  const bars: PriceBar[] = [];
  let close = base * (0.85 + rand() * 0.2);

  for (let i = 0; i < tradingDays; i++) {
    const dayIdx = i;
    const stress = stressMultiplier(dayIdx);
    const shock = (rand() - 0.48) * volBase * stress;
    close = Math.max(0.5, close * (1 + categoryDrift + shock));
    const date = new Date();
    date.setDate(date.getDate() - (tradingDays - 1 - i));
    const dateStr = date.toISOString().slice(0, 10);
    bars.push({
      date: dateStr,
      open: close * (1 - 0.003),
      high: close * (1 + 0.008 * stress),
      low: close * (1 - 0.01 * stress),
      close,
      volume: Math.floor((stock?.volume ?? 1_000_000) * (0.8 + rand() * 0.4)),
    });
  }
  return bars;
}

export function getExtendedTradingDates(tradingDays = TRADING_DAYS_HISTORY): string[] {
  return getExtendedPriceHistory('1155', tradingDays).map((b) => b.date);
}
