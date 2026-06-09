/**
 * 全営業日・8銘柄: 翌20営業日期望値の特徴量探索（OpenAI buy 前提なし）
 * npx vitest run tests/unit/forward20FeatureExploration.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { computeRsi14At } from '../helpers/buyAction30dAudit';

const FORWARD_DAYS = 20;
const ANALYSIS_START = '2024-06-01';
const MIN_SAMPLES = 10;
const IG_BINS = 8;

const SYMBOL_DEFS = [
  { symbol: '1023', yahooSymbol: '1023.KL' },
  { symbol: '1295', yahooSymbol: '1295.KL' },
  { symbol: '1155', yahooSymbol: '1155.KL' },
  { symbol: 'SPY', yahooSymbol: 'SPY' },
  { symbol: 'QQQ', yahooSymbol: 'QQQ' },
  { symbol: 'SCHD', yahooSymbol: 'SCHD' },
  { symbol: 'JEPI', yahooSymbol: 'JEPI' },
  { symbol: 'VYM', yahooSymbol: 'VYM' },
] as const;

const FEATURE_DEFS = [
  { key: 'high20UpdateRate', labelJa: '20日高値更新率' },
  { key: 'distFrom52wHighPct', labelJa: '52週高値からの距離' },
  { key: 'ma20DeviationPct', labelJa: '移動平均乖離率' },
  { key: 'rsi14', labelJa: 'RSI' },
  { key: 'adx14', labelJa: 'ADX' },
  { key: 'volumeSurge5d', labelJa: '出来高急増率' },
  { key: 'bollingerPercentB', labelJa: 'ボリンジャーバンド位置' },
  { key: 'macdHistPct', labelJa: 'MACD' },
  { key: 'vwMomentum10d', labelJa: '出来高加重モメンタム' },
  { key: 'vwRsi14', labelJa: '出来高加重RSI' },
] as const;

type FeatureKey = (typeof FEATURE_DEFS)[number]['key'];

type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };

type SampleRow = {
  date: string;
  symbol: string;
  expectancyPct: number;
  win: boolean;
} & Record<FeatureKey, number>;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function std(vals: number[]): number {
  const m = mean(vals);
  const v = vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length;
  return Math.sqrt(v) || 1e-9;
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < MIN_SAMPLES) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i]! - mx;
    const y = ys[i]! - my;
    num += x * y;
    dx += x * x;
    dy += y * y;
  }
  if (dx <= 0 || dy <= 0) return null;
  return round4(num / Math.sqrt(dx * dy));
}

function spearman(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < MIN_SAMPLES) return null;
  const rank = (arr: number[]) => {
    const indexed = arr.map((v, i) => ({ v, i }));
    indexed.sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(n);
    for (let r = 0; r < indexed.length; r++) ranks[indexed[r]!.i] = r + 1;
    return ranks;
  };
  return pearson(rank(xs), rank(ys));
}

function entropyBinary(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

function computeInformationGain(feature: number[], targetWin: boolean[]): number | null {
  const n = feature.length;
  if (n < MIN_SAMPLES) return null;
  const pRoot = targetWin.filter(Boolean).length / n;
  const hRoot = entropyBinary(pRoot);
  const sorted = feature
    .map((v, i) => ({ v, w: targetWin[i]! ? 1 : 0 }))
    .sort((a, b) => a.v - b.v);
  const edges: number[] = [];
  const perBin = Math.max(1, Math.floor(n / IG_BINS));
  for (let i = perBin; i < n; i += perBin) {
    edges.push((sorted[i - 1]!.v + sorted[i]!.v) / 2);
  }
  let hCond = 0;
  let lo = -Infinity;
  for (const edge of [...edges, Infinity]) {
    const slice = sorted.filter((r) => r.v > lo && r.v <= edge);
    lo = edge;
    if (slice.length === 0) continue;
    const pw = slice.reduce((a, r) => a + r.w, 0) / slice.length;
    hCond += (slice.length / n) * entropyBinary(pw);
  }
  return round4(Math.max(0, hRoot - hCond));
}

function computeAdx14(bars: OhlcvBar[], idx: number, period = 14): number | null {
  if (idx < period * 2) return null;
  const trList: number[] = [];
  const plusDm: number[] = [];
  const minusDm: number[] = [];
  for (let i = idx - period * 2 + 1; i <= idx; i++) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const ph = bars[i - 1]!.high;
    const pl = bars[i - 1]!.low;
    const pc = bars[i - 1]!.close;
    trList.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    plusDm.push(Math.max(h - ph, 0));
    minusDm.push(Math.max(pl - l, 0));
  }
  const smooth = (arr: number[]) => {
    let s = arr.slice(0, period).reduce((a, b) => a + b, 0);
    const out: number[] = [s];
    for (let i = period; i < arr.length; i++) {
      s = s - s / period + arr[i]!;
      out.push(s);
    }
    return out;
  };
  const trS = smooth(trList);
  const pS = smooth(plusDm);
  const mS = smooth(minusDm);
  const diPlus: number[] = [];
  const diMinus: number[] = [];
  for (let i = 0; i < trS.length; i++) {
    if (trS[i]! <= 0) return null;
    diPlus.push((100 * pS[i]!) / trS[i]!);
    diMinus.push((100 * mS[i]!) / trS[i]!);
  }
  const dx: number[] = [];
  for (let i = 0; i < diPlus.length; i++) {
    const sum = diPlus[i]! + diMinus[i]!;
    dx.push(sum <= 0 ? 0 : (100 * Math.abs(diPlus[i]! - diMinus[i]!)) / sum);
  }
  if (dx.length < period) return null;
  return round3(dx.slice(-period).reduce((a, b) => a + b, 0) / period);
}

function computeMacdHistPct(closes: number[], idx: number): number | null {
  if (idx < 35) return null;
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1);
    let v = arr[0]!;
    for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
    return v;
  };
  const slice = closes.slice(0, idx + 1);
  const ema12 = ema(slice, 12);
  const ema26 = ema(slice, 26);
  const macd = ema12 - ema26;
  const signalSlice: number[] = [];
  for (let i = Math.max(0, idx - 8); i <= idx; i++) {
    const s = closes.slice(0, i + 1);
    signalSlice.push(ema(s, 12) - ema(s, 26));
  }
  const signal = ema(signalSlice, 9);
  const hist = macd - signal;
  const close = closes[idx]!;
  if (close <= 0) return null;
  return round4((hist / close) * 100);
}

function computeBollingerPercentB(closes: number[], idx: number, period = 20): number | null {
  if (idx < period - 1) return null;
  const slice = closes.slice(idx - period + 1, idx + 1);
  const m = mean(slice);
  const sd = std(slice);
  const upper = m + 2 * sd;
  const lower = m - 2 * sd;
  if (upper <= lower) return null;
  return round4((closes[idx]! - lower) / (upper - lower));
}

function computeHigh20UpdateRate(bars: OhlcvBar[], idx: number): number | null {
  if (idx < 20) return null;
  let updates = 0;
  for (let i = idx - 19; i <= idx; i++) {
    let priorMax = -Infinity;
    for (let j = Math.max(0, i - 19); j < i; j++) priorMax = Math.max(priorMax, bars[j]!.high);
    if (priorMax === -Infinity) continue;
    if (bars[i]!.high >= priorMax) updates += 1;
  }
  return round4((updates / 20) * 100);
}

function computeDistFrom52wHigh(bars: OhlcvBar[], idx: number): number | null {
  const lookback = Math.min(252, idx);
  if (lookback < 60) return null;
  let maxH = -Infinity;
  for (let i = idx - lookback; i <= idx; i++) maxH = Math.max(maxH, bars[i]!.high);
  if (maxH <= 0) return null;
  return round4(((bars[idx]!.close / maxH - 1) * 100));
}

function computeMa20Deviation(closes: number[], idx: number): number | null {
  if (idx < 19) return null;
  const sma = mean(closes.slice(idx - 19, idx + 1));
  if (sma <= 0) return null;
  return round4(((closes[idx]! / sma - 1) * 100));
}

function computeVolumeSurge5d(bars: OhlcvBar[], idx: number): number | null {
  if (idx < 9) return null;
  const vols = bars.slice(0, idx + 1).map((b) => b.volume);
  const recent = mean(vols.slice(-5));
  const prior = mean(vols.slice(-10, -5));
  if (prior <= 0) return null;
  return round4(recent / prior);
}

function computeVwMomentum10d(bars: OhlcvBar[], idx: number): number | null {
  if (idx < 10) return null;
  let num = 0;
  let den = 0;
  for (let i = idx - 9; i <= idx; i++) {
    const ret = (bars[i]!.close / bars[i - 1]!.close - 1) * 100;
    const v = bars[i]!.volume;
    num += ret * v;
    den += v;
  }
  if (den <= 0) return null;
  return round4(num / den);
}

function computeVwRsi14(bars: OhlcvBar[], idx: number): number | null {
  if (idx < 14) return null;
  let gain = 0;
  let loss = 0;
  for (let i = idx - 13; i <= idx; i++) {
    const d = bars[i]!.close - bars[i - 1]!.close;
    const v = bars[i]!.volume;
    if (d >= 0) gain += d * v;
    else loss -= d * v;
  }
  if (loss <= 0) return 100;
  const rs = gain / loss;
  return round3(100 - 100 / (1 + rs));
}

function forwardExpectancy(bars: OhlcvBar[], idx: number): number | null {
  const entryIdx = idx + 1;
  const exitIdx = entryIdx + FORWARD_DAYS;
  if (exitIdx >= bars.length) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;
  return round4(((bars[exitIdx]!.close / entry - 1) * 100));
}

function buildFeatures(bars: OhlcvBar[], idx: number, closes: number[]): Partial<Record<FeatureKey, number>> | null {
  const high20 = computeHigh20UpdateRate(bars, idx);
  const dist52 = computeDistFrom52wHigh(bars, idx);
  const maDev = computeMa20Deviation(closes, idx);
  const rsi = computeRsi14At(closes, idx);
  const adx = computeAdx14(bars, idx);
  const volSurge = computeVolumeSurge5d(bars, idx);
  const bb = computeBollingerPercentB(closes, idx);
  const macd = computeMacdHistPct(closes, idx);
  const vwm = computeVwMomentum10d(bars, idx);
  const vwr = computeVwRsi14(bars, idx);
  if (
    high20 == null ||
    dist52 == null ||
    maDev == null ||
    rsi == null ||
    adx == null ||
    volSurge == null ||
    bb == null ||
    macd == null ||
    vwm == null ||
    vwr == null
  ) {
    return null;
  }
  return {
    high20UpdateRate: high20,
    distFrom52wHighPct: dist52,
    ma20DeviationPct: maDev,
    rsi14: rsi,
    adx14: adx,
    volumeSurge5d: volSurge,
    bollingerPercentB: bb,
    macdHistPct: macd,
    vwMomentum10d: vwm,
    vwRsi14: vwr,
  };
}

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcvBar[]> {
  const period1 = Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&period1=${period1}&period2=${period2}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'stock-trading-assistant-audit/1.0' } });
  if (!res.ok) throw new Error(`Yahoo ${yahooSymbol} HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
            volume?: (number | null)[];
          }>;
        };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const bars: OhlcvBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const h = q?.high?.[i];
    const l = q?.low?.[i];
    const c = q?.close?.[i];
    const v = q?.volume?.[i];
    if (h == null || l == null || c == null || v == null || !Number.isFinite(c)) continue;
    bars.push({
      date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
      high: h,
      low: l,
      close: c,
      volume: v,
    });
  }
  return bars;
}

type RidgeModel = {
  keys: FeatureKey[];
  means: number[];
  stds: number[];
  coef: number[];
  intercept: number;
  r2: number;
};

function fitRidge(samples: SampleRow[], keys: FeatureKey[], lambda = 1e-4): RidgeModel {
  const y = samples.map((s) => s.expectancyPct);
  const n = samples.length;
  const p = keys.length;
  const means = keys.map((k) => mean(samples.map((s) => s[k])));
  const stds = keys.map((k) => std(samples.map((s) => s[k])));
  const X: number[][] = samples.map((s) =>
    keys.map((k, j) => (s[k] - means[j]!) / stds[j]!),
  );
  const yMean = mean(y);
  const yStd = std(y);
  const ys = y.map((v) => (v - yMean) / yStd);

  const xtx: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  const xty: number[] = Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < p; a++) {
      xty[a]! += X[i]![a]! * ys[i]!;
      for (let b = 0; b < p; b++) xtx[a]![b]! += X[i]![a]! * X[i]![b]!;
    }
  }
  for (let d = 0; d < p; d++) xtx[d]![d]! += lambda;

  const coef = solveSymmetric(xtx, xty);
  const yHat = X.map((row) => row.reduce((s, v, j) => s + v * coef[j]!, 0));
  const ssRes = ys.reduce((a, v, i) => a + (v - yHat[i]!) ** 2, 0);
  const ssTot = ys.reduce((a, v) => a + v ** 2, 0);
  const r2 = ssTot > 0 ? round4(1 - ssRes / ssTot) : 0;

  return {
    keys,
    means,
    stds,
    coef,
    intercept: yMean,
    r2,
  };
}

function solveSymmetric(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r]![col]!) > Math.abs(m[pivot]![col]!)) pivot = r;
    }
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    const div = m[col]![col]! || 1e-12;
    for (let c = col; c <= n; c++) m[col]![c]! /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r]![col]!;
      for (let c = col; c <= n; c++) m[r]![c]! -= f * m[col]![c]!;
    }
  }
  return m.map((row) => row[n]!);
}

function linearShapImportance(samples: SampleRow[], model: RidgeModel): Record<FeatureKey, number> {
  const out = Object.fromEntries(FEATURE_DEFS.map((f) => [f.key, 0])) as Record<FeatureKey, number>;
  const yStd = std(samples.map((r) => r.expectancyPct));
  for (const row of samples) {
    for (let j = 0; j < model.keys.length; j++) {
      const k = model.keys[j]!;
      const xStd = (row[k] - model.means[j]!) / model.stds[j]!;
      out[k] += Math.abs(xStd * model.coef[j]! * yStd);
    }
  }
  const n = samples.length;
  for (const k of model.keys) out[k] = round4(out[k]! / n);
  return out;
}

function partialR2(samples: SampleRow[], keys: FeatureKey[], fullR2: number, key: FeatureKey): number {
  const reduced = keys.filter((k) => k !== key);
  if (reduced.length === 0) return fullR2;
  const m = fitRidge(samples, reduced);
  return round4(Math.max(0, fullR2 - m.r2));
}

describe('Forward-20 feature exploration', () => {
  it('writes feature ranking JSON (correlation, IG, SHAP)', async () => {
    const samples: SampleRow[] = [];
    for (const def of SYMBOL_DEFS) {
      const bars = await fetchYahooOhlcv(def.yahooSymbol);
      const closes = bars.map((b) => b.close);
      for (let idx = 0; idx < bars.length; idx++) {
        if (bars[idx]!.date < ANALYSIS_START) continue;
        const exp = forwardExpectancy(bars, idx);
        const feats = buildFeatures(bars, idx, closes);
        if (exp == null || !feats) continue;
        samples.push({
          date: bars[idx]!.date,
          symbol: def.symbol,
          expectancyPct: exp,
          win: exp > 0,
          ...(feats as Record<FeatureKey, number>),
        });
      }
    }

    const keys = FEATURE_DEFS.map((f) => f.key);
    const y = samples.map((s) => s.expectancyPct);
    const wins = samples.map((s) => s.win);

    const singleCorrelation = FEATURE_DEFS.map((f) => {
      const xs = samples.map((s) => s[f.key]);
      const p = pearson(xs, y);
      const sp = spearman(xs, y);
      return {
        key: f.key,
        labelJa: f.labelJa,
        pearson: p,
        spearman: sp,
        absPearson: p == null ? null : round4(Math.abs(p)),
      };
    });

    const informationGain = FEATURE_DEFS.map((f) => {
      const xs = samples.map((s) => s[f.key]);
      return {
        key: f.key,
        labelJa: f.labelJa,
        informationGainWin: computeInformationGain(xs, wins),
      };
    });

    const ridgeModel = fitRidge(samples, keys);
    const combinedCorrelation = {
      multivariateR2: ridgeModel.r2,
      multivariateRMae: round3(
        Math.sqrt(
          samples.reduce((a, s, i) => {
            const pred =
              ridgeModel.intercept +
              keys.reduce((sum, k, j) => {
                const xStd = (s[k] - ridgeModel.means[j]!) / ridgeModel.stds[j]!;
                return sum + xStd * ridgeModel.coef[j]! * std(y);
              }, 0);
            return a + (s.expectancyPct - pred) ** 2;
          }, 0) / samples.length,
        ),
      ),
      noteJa: 'リッジ回帰（全特徴量同時）の R² を組み合わせ指標とする',
    };

    const partialR2ByFeature = FEATURE_DEFS.map((f) => ({
      key: f.key,
      labelJa: f.labelJa,
      partialR2: partialR2(samples, keys, ridgeModel.r2, f.key),
    }));

    const shapMeanAbs = linearShapImportance(samples, ridgeModel);
    const shapRanking = FEATURE_DEFS.map((f) => ({
      key: f.key,
      labelJa: f.labelJa,
      meanAbsShap: shapMeanAbs[f.key],
    }));

    const rankScore = (vals: Array<{ key: FeatureKey; score: number | null }>) => {
      const valid = vals.filter((v) => v.score != null).sort((a, b) => b.score! - a.score!);
      const ranks = new Map<FeatureKey, number>();
      valid.forEach((v, i) => ranks.set(v.key, i + 1));
      return ranks;
    };

    const rSingle = rankScore(
      singleCorrelation.map((x) => ({ key: x.key, score: x.absPearson })),
    );
    const rPartial = rankScore(partialR2ByFeature.map((x) => ({ key: x.key, score: x.partialR2 })));
    const rIg = rankScore(informationGain.map((x) => ({ key: x.key, score: x.informationGainWin })));
    const rShap = rankScore(shapRanking.map((x) => ({ key: x.key, score: x.meanAbsShap })));

    const compositeRanking = FEATURE_DEFS.map((f) => {
      const ranks = [rSingle.get(f.key), rPartial.get(f.key), rIg.get(f.key), rShap.get(f.key)].filter(
        (r): r is number => r != null,
      );
      const avgRank = ranks.length > 0 ? mean(ranks) : null;
      return {
        key: f.key,
        labelJa: f.labelJa,
        ranks: {
          singleCorrelation: rSingle.get(f.key) ?? null,
          combinedPartialR2: rPartial.get(f.key) ?? null,
          informationGain: rIg.get(f.key) ?? null,
          shap: rShap.get(f.key) ?? null,
        },
        averageRank: avgRank == null ? null : round3(avgRank),
        compositeScore: avgRank == null ? null : round3(11 - avgRank),
      };
    }).sort((a, b) => (a.averageRank ?? 99) - (b.averageRank ?? 99));

    const report = {
      methodologyJa: {
        scope: '8銘柄・2024-06-01以降の全営業日（OpenAI buy 前提なし）',
        sampleDays: samples.length,
        target: '翌日終値エントリーから20営業日後の保有期間リターン（%）',
        excludedLegacyFeatures: 'ATR_ratio / 旧来高倍率は対象外',
        metrics: {
          singleCorrelation: 'Pearson / Spearman（特徴量 vs 期待値）',
          combinedCorrelation: '全特徴量リッジ回帰 R² + 各特徴の partial R²',
          informationGain: '8分位ビン → 20日勝ち(期待値>0) のエントロピー減少',
          shap: '標準化リッジ回帰の線形SHAP（平均|φ|）',
        },
      },
      pooledSampleCount: samples.length,
      singleCorrelation,
      informationGain,
      combined: {
        ...combinedCorrelation,
        partialR2ByFeature,
        ridgeCoefficients: Object.fromEntries(
          keys.map((k, j) => [k, round4(ridgeModel.coef[j]!)]),
        ),
      },
      shapImportance: shapRanking.sort((a, b) => b.meanAbsShap - a.meanAbsShap),
      predictivePowerRanking: compositeRanking,
      topInsightsJa: [
        `最高複合順位: ${compositeRanking[0]?.labelJa}（平均順位 ${compositeRanking[0]?.averageRank}）`,
        `単独|相関|最大: ${singleCorrelation.sort((a, b) => (b.absPearson ?? 0) - (a.absPearson ?? 0))[0]?.labelJa}`,
        `全モデル R²=${ridgeModel.r2}（組み合わせ説明力は低〜中程度）`,
      ],
      summaryJa: compositeRanking.map(
        (r, i) =>
          `#${i + 1} ${r.labelJa}: 複合${r.compositeScore} |Pearson|=${singleCorrelation.find((c) => c.key === r.key)?.absPearson} partialR²=${partialR2ByFeature.find((p) => p.key === r.key)?.partialR2} IG=${informationGain.find((g) => g.key === r.key)?.informationGainWin} SHAP=${shapRanking.find((s) => s.key === r.key)?.meanAbsShap}`,
      ),
    };

    const out = path.join(process.cwd(), 'scripts', 'forward20-feature-exploration-ranking.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n=== FWD20 FEATURE RANK ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
