import type { PriceBar } from '../../types';
import {
  FORWARD_ADX_MIN,
  FORWARD_MACD_MIN,
  FORWARD_REGIME_DOWN_THRESH,
  FORWARD_REGIME_UP_THRESH,
  FORWARD_SHALLOW_ADX_MIN,
  FORWARD_SHALLOW_MACD_MIN,
  FORWARD_SIDEWAYS_DEEP_DIST,
} from '../../constants/forwardValidation';

export type OhlcvBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type Regime = 'up' | 'sideways' | 'down';
export type FourBucket = 'up' | 'sideways_shallow' | 'sideways_deep' | 'down' | 'unknown';

export function priceBarsToOhlcv(bars: PriceBar[]): OhlcvBar[] {
  return bars.map((b) => ({
    date: b.date,
    open: b.open ?? b.close,
    high: b.high ?? b.close,
    low: b.low ?? b.close,
    close: b.close,
  }));
}

export function mean(vals: number[]): number {
  return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
}

function ema(arr: number[], span: number): number {
  const k = 2 / (span + 1);
  let v = arr[0]!;
  for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
  return v;
}

export function computeAdx14(bars: OhlcvBar[], idx: number): number | null {
  const period = 14;
  if (idx < period * 2) return null;
  const trList: number[] = [];
  const plusDm: number[] = [];
  const minusDm: number[] = [];
  for (let j = idx - period * 2 + 1; j <= idx; j++) {
    const h = bars[j]!.high;
    const l = bars[j]!.low;
    const ph = bars[j - 1]!.high;
    const pl = bars[j - 1]!.low;
    const pc = bars[j - 1]!.close;
    trList.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    plusDm.push(Math.max(h - ph, 0));
    minusDm.push(Math.max(pl - l, 0));
  }
  const smooth = (arr: number[]) => {
    let s = arr.slice(0, period).reduce((a, b) => a + b, 0);
    const acc: number[] = [s];
    for (let k = period; k < arr.length; k++) {
      s = s - s / period + arr[k]!;
      acc.push(s);
    }
    return acc;
  };
  const trS = smooth(trList);
  const pS = smooth(plusDm);
  const mS = smooth(minusDm);
  const dx: number[] = [];
  for (let k = 0; k < trS.length; k++) {
    if (trS[k]! <= 0) return null;
    const diPlus = (100 * pS[k]!) / trS[k]!;
    const diMinus = (100 * mS[k]!) / trS[k]!;
    const sum = diPlus + diMinus;
    dx.push(sum <= 0 ? 0 : (100 * Math.abs(diPlus - diMinus)) / sum);
  }
  return Math.round(mean(dx.slice(-period)) * 1000) / 1000;
}

export function computeMacdHistPct(closes: number[], idx: number): number | null {
  if (idx < 35) return null;
  const slice = closes.slice(0, idx + 1);
  const macdLine = ema(slice, 12) - ema(slice, 26);
  const signalSlice: number[] = [];
  for (let j = Math.max(0, idx - 8); j <= idx; j++) {
    signalSlice.push(ema(closes.slice(0, j + 1), 12) - ema(closes.slice(0, j + 1), 26));
  }
  return Math.round(((macdLine - ema(signalSlice, 9)) / closes[idx]!) * 100 * 1000) / 1000;
}

export function computeDist52wPct(bars: OhlcvBar[], idx: number): number | null {
  const lookback = Math.min(252, idx);
  if (lookback < 60) return null;
  let maxH = -Infinity;
  for (let j = idx - lookback; j <= idx; j++) maxH = Math.max(maxH, bars[j]!.high);
  return Math.round(((bars[idx]!.close / maxH - 1) * 100) * 1000) / 1000;
}

export function buildSpyRegimeMap(spyBars: OhlcvBar[]): Map<string, Regime> {
  const closes = spyBars.map((b) => b.close);
  const lookback = 63;
  const out = new Map<string, Regime>();
  for (let i = lookback; i < spyBars.length; i++) {
    const ret63 = (closes[i]! / closes[i - lookback]! - 1) * 100;
    let regime: Regime = 'sideways';
    if (ret63 > FORWARD_REGIME_UP_THRESH) regime = 'up';
    else if (ret63 < FORWARD_REGIME_DOWN_THRESH) regime = 'down';
    out.set(spyBars[i]!.date, regime);
  }
  return out;
}

export function classifyBucket(regime: Regime | 'unknown', dist52: number): FourBucket {
  if (regime === 'unknown') return 'unknown';
  if (regime === 'up') return 'up';
  if (regime === 'down') return 'down';
  return dist52 <= FORWARD_SIDEWAYS_DEEP_DIST ? 'sideways_deep' : 'sideways_shallow';
}

export function passesFinalRule(input: {
  bucket: FourBucket;
  dist52wPct: number;
  adx14: number;
  macdHistPct: number;
}): boolean {
  const { bucket, dist52wPct, adx14, macdHistPct } = input;
  if (bucket === 'unknown') return false;
  if (bucket === 'down' || bucket === 'sideways_deep') return dist52wPct <= -8;
  if (bucket === 'sideways_shallow') {
    return (
      dist52wPct <= -2 &&
      dist52wPct > FORWARD_SIDEWAYS_DEEP_DIST &&
      adx14 > FORWARD_SHALLOW_ADX_MIN &&
      macdHistPct > FORWARD_SHALLOW_MACD_MIN
    );
  }
  return dist52wPct <= -2;
}

/** 監査その16/17 — ルール除外 · ADX閾値感度 */
export type SignalAblationOptions = {
  skipAdx?: boolean;
  /** null=ADXなし · 数値=グローバル最低ADX（浅いレジームは max(値, SHALLOW_MIN)） */
  adxMinOverride?: number | null;
  skipMacd?: boolean;
  skipDist52?: boolean;
  skipSpyRegime?: boolean;
};

function resolveAdxThresholds(ablation: SignalAblationOptions): {
  skip: boolean;
  globalMin: number;
  shallowMin: number;
} {
  if (ablation.skipAdx || ablation.adxMinOverride === null) {
    return { skip: true, globalMin: 0, shallowMin: 0 };
  }
  const globalMin = ablation.adxMinOverride ?? FORWARD_ADX_MIN;
  const shallowMin = Math.max(globalMin, FORWARD_SHALLOW_ADX_MIN);
  return { skip: false, globalMin, shallowMin };
}

function passesUnifiedWithoutSpy63(input: {
  dist52wPct: number;
  adx14: number;
  macdHistPct: number;
  ablation: SignalAblationOptions;
}): boolean {
  const { dist52wPct, adx14, macdHistPct, ablation } = input;
  const adx = resolveAdxThresholds(ablation);
  if (!adx.skip && adx14 <= adx.globalMin) return false;
  if (!ablation.skipMacd && macdHistPct <= FORWARD_MACD_MIN) return false;
  if (!ablation.skipDist52 && dist52wPct > -2) return false;
  return true;
}

export function passesFinalRuleAblation(
  input: {
    bucket: FourBucket;
    dist52wPct: number;
    adx14: number;
    macdHistPct: number;
  },
  ablation: SignalAblationOptions = {},
): boolean {
  const { bucket, dist52wPct, adx14, macdHistPct } = input;
  const adx = resolveAdxThresholds(ablation);
  if (bucket === 'unknown') return false;

  if (ablation.skipDist52) {
    if (bucket === 'sideways_shallow') {
      if (!adx.skip && adx14 <= adx.shallowMin) return false;
      if (!ablation.skipMacd && macdHistPct <= FORWARD_SHALLOW_MACD_MIN) return false;
      return true;
    }
    return true;
  }

  if (bucket === 'down' || bucket === 'sideways_deep') return dist52wPct <= -8;
  if (bucket === 'sideways_shallow') {
    if (dist52wPct > -2 || dist52wPct <= FORWARD_SIDEWAYS_DEEP_DIST) return false;
    if (!adx.skip && adx14 <= adx.shallowMin) return false;
    if (!ablation.skipMacd && macdHistPct <= FORWARD_SHALLOW_MACD_MIN) return false;
    return true;
  }
  return dist52wPct <= -2;
}

export function scanSignalAtBarAblation(
  bars: OhlcvBar[],
  idx: number,
  regimeMap: Map<string, Regime>,
  ablation: SignalAblationOptions = {},
): SignalScanResult | null {
  const date = bars[idx]!.date;
  const adx14 = computeAdx14(bars, idx);
  const closes = bars.map((b) => b.close);
  const macdHistPct = computeMacdHistPct(closes, idx);
  const dist52wPct = computeDist52wPct(bars, idx);
  if (adx14 == null || macdHistPct == null || dist52wPct == null) return null;

  const fail = (bucket: FourBucket = 'unknown'): SignalScanResult => ({
    date,
    adx14,
    macdHistPct,
    dist52wPct,
    bucket,
    passes: false,
  });

  if (!ablation.skipMacd && macdHistPct <= FORWARD_MACD_MIN) return fail();

  const adx = resolveAdxThresholds(ablation);
  if (!adx.skip && adx14 <= adx.globalMin) return fail();

  let bucket: FourBucket;
  if (ablation.skipSpyRegime) {
    bucket = 'unknown';
  } else {
    const regime = regimeMap.get(date) ?? 'unknown';
    bucket = classifyBucket(regime, dist52wPct);
  }

  const passes = ablation.skipSpyRegime
    ? passesUnifiedWithoutSpy63({ dist52wPct, adx14, macdHistPct, ablation })
    : passesFinalRuleAblation({ bucket, dist52wPct, adx14, macdHistPct }, ablation);

  return { date, adx14, macdHistPct, dist52wPct, bucket, passes };
}

export type SignalScanResult = {
  date: string;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
  bucket: FourBucket;
  passes: boolean;
};

export function scanSignalAtBar(
  bars: OhlcvBar[],
  idx: number,
  regimeMap: Map<string, Regime>,
): SignalScanResult | null {
  const date = bars[idx]!.date;
  const adx14 = computeAdx14(bars, idx);
  const closes = bars.map((b) => b.close);
  const macdHistPct = computeMacdHistPct(closes, idx);
  const dist52wPct = computeDist52wPct(bars, idx);
  if (adx14 == null || macdHistPct == null || dist52wPct == null) return null;
  if (adx14 <= FORWARD_ADX_MIN || macdHistPct <= FORWARD_MACD_MIN) {
    return { date, adx14, macdHistPct, dist52wPct, bucket: 'unknown', passes: false };
  }
  const regime = regimeMap.get(date) ?? 'unknown';
  const bucket = classifyBucket(regime, dist52wPct);
  const passes = passesFinalRule({ bucket, dist52wPct, adx14, macdHistPct });
  return { date, adx14, macdHistPct, dist52wPct, bucket, passes };
}

export function barIndexByDate(bars: OhlcvBar[], date: string): number {
  return bars.findIndex((b) => b.date === date);
}

export function simulateExitFromEntry(
  bars: OhlcvBar[],
  entryIdx: number,
  holdDays: number,
  takeProfitPct: number,
): { returnPct: number; exitDate: string; exitPrice: number; reason: 'take_profit' | 'max_hold' } | null {
  const lastIdx = Math.min(entryIdx + holdDays, bars.length - 1);
  if (entryIdx >= bars.length || lastIdx <= entryIdx) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;
  const target = entry * (1 + takeProfitPct / 100);
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = bars[i]!;
    if (bar.high >= target) {
      return {
        returnPct: Math.round(takeProfitPct * 1000) / 1000,
        exitDate: bar.date,
        exitPrice: target,
        reason: 'take_profit',
      };
    }
  }
  const exitBar = bars[lastIdx]!;
  return {
    returnPct: Math.round(((exitBar.close / entry - 1) * 100) * 1000) / 1000,
    exitDate: exitBar.date,
    exitPrice: exitBar.close,
    reason: 'max_hold',
  };
}

/** ピーク追跡型トレーリングストップ（高値更新後 trailPct% 下落で決済） */
export function simulateTrailingStopFromEntry(
  bars: OhlcvBar[],
  entryIdx: number,
  holdDays: number,
  trailPct: number,
): { returnPct: number; exitDate: string; exitPrice: number; reason: 'trailing_stop' | 'max_hold' } | null {
  const lastIdx = Math.min(entryIdx + holdDays, bars.length - 1);
  if (entryIdx >= bars.length || lastIdx <= entryIdx) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;

  let peak = bars[entryIdx]!.high;
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = bars[i]!;
    peak = Math.max(peak, bar.high);
    const stopPrice = peak * (1 - trailPct / 100);
    if (bar.low <= stopPrice) {
      return {
        returnPct: Math.round(((stopPrice / entry - 1) * 100) * 1000) / 1000,
        exitDate: bar.date,
        exitPrice: Math.round(stopPrice * 1000) / 1000,
        reason: 'trailing_stop',
      };
    }
  }
  const exitBar = bars[lastIdx]!;
  return {
    returnPct: Math.round(((exitBar.close / entry - 1) * 100) * 1000) / 1000,
    exitDate: exitBar.date,
    exitPrice: exitBar.close,
    reason: 'max_hold',
  };
}
