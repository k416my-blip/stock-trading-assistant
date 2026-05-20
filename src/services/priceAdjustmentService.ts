import type { TimeSeriesBar } from '../types/marketData';
import type { AdjustedOHLCVBar } from '../types/quantValidation';

const SPLIT_JUMP_THRESHOLD = 0.35;

function isPlausibleDividendYield(y: number): boolean {
  return y > 0.005 && y < 0.12;
}

/** Twelve Data調整済み系列 + ローカル係数追跡 */
export function barsToAdjustedOHLCV(
  bars: TimeSeriesBar[],
  apiAdjusted: boolean,
): AdjustedOHLCVBar[] {
  if (bars.length === 0) return [];

  const out: AdjustedOHLCVBar[] = [];
  let cumSplit = 1;
  let cumDiv = 1;

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const date = b.datetime.slice(0, 10);

    if (!apiAdjusted && i > 0) {
      const prev = bars[i - 1];
      if (prev.close > 0) {
        const ratio = b.close / prev.close;
        if (ratio > 1 + SPLIT_JUMP_THRESHOLD || ratio < 1 - SPLIT_JUMP_THRESHOLD) {
          cumSplit *= ratio;
        }
        if (b.close < prev.close * 0.97 && ratio > 0.9 && ratio < 1.1) {
          const divYield = (prev.close - b.close) / prev.close;
          if (isPlausibleDividendYield(divYield)) cumDiv *= 1 - divYield * 0.5;
        }
      }
    }

    const adjClose = apiAdjusted ? b.close : b.close / cumSplit / cumDiv;

    out.push({
      date,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      adjClose,
      volume: b.volume,
      splitAdjFactor: cumSplit,
      dividendAdjFactor: cumDiv,
    });
  }

  return out;
}
