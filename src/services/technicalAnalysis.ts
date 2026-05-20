import type { PriceBar, TechnicalSnapshot } from '../types';

function sma(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] ?? 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function analyzeTechnicals(bars: PriceBar[]): TechnicalSnapshot {
  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const rsi14 = rsi(closes);
  const recentVol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const priorVol = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  const volumeTrend =
    recentVol > priorVol * 1.05 ? 'rising' : recentVol < priorVol * 0.95 ? 'falling' : 'flat';

  const lastClose = closes[closes.length - 1] ?? 0;

  let buySignal: TechnicalSnapshot['buySignal'] = 'hold';
  if (lastClose > ma20 && ma20 > ma50 && rsi14 < 70) buySignal = 'buy';
  else if (lastClose < ma20 || rsi14 > 75) buySignal = 'wait';

  let sellSignal: TechnicalSnapshot['sellSignal'] = 'hold';
  if (rsi14 > 70 && lastClose < ma20) sellSignal = 'sell';
  else if (rsi14 < 40 && lastClose > ma50) sellSignal = 'wait';

  return { ma20, ma50, rsi14, volumeTrend, buySignal, sellSignal };
}
