/**
 * buy + 出来高<1.2 — テクニカル指標 × 成功/失敗比較・期待値ランキング
 * npx vitest run tests/unit/openAiBuyVol12TechnicalAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const VOL_MAX = 1.2;

type OhlcBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type BuyTechRow = {
  date: string;
  symbol: string;
  return10d: number;
  outcome: 'success' | 'failure';
  volumeSurgeRatio: number;
  ma5DeviationPct: number;
  ma25DeviationPct: number;
  macd: number;
  macdHistogram: number;
  bollingerPositionPct: number;
  adx: number;
  atrPct: number;
  pctFrom52wHigh: number;
  pctFrom52wLow: number;
};

const TECH_METRICS = [
  { key: 'ma5DeviationPct' as const, labelJa: '5日移動平均乖離率(%)' },
  { key: 'ma25DeviationPct' as const, labelJa: '25日移動平均乖離率(%)' },
  { key: 'macd' as const, labelJa: 'MACD' },
  { key: 'macdHistogram' as const, labelJa: 'MACDヒストグラム' },
  { key: 'bollingerPositionPct' as const, labelJa: 'ボリンジャーバンド位置(%)' },
  { key: 'adx' as const, labelJa: 'ADX' },
  { key: 'atrPct' as const, labelJa: 'ATR(終値比%)' },
  { key: 'pctFrom52wHigh' as const, labelJa: '52週高値距離(%)' },
  { key: 'pctFrom52wLow' as const, labelJa: '52週安値距離(%)' },
];

function median(vals: number[]): number | null {
  if (vals.length === 0) return null;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round(((s[m - 1]! + s[m]!) / 2) * 100) / 100 : Math.round(s[m]! * 100) / 100;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function std(vals: number[]): number | null {
  if (vals.length < 2) return null;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / (vals.length - 1));
}

function normalCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

function welchTTest(a: number[], b: number[]): { t: number; df: number; pTwoSided: number } | null {
  if (a.length < 2 || b.length < 2) return null;
  const ma = mean(a)!;
  const mb = mean(b)!;
  const va = a.reduce((s, x) => s + (x - ma) ** 2, 0) / (a.length - 1);
  const vb = b.reduce((s, x) => s + (x - mb) ** 2, 0) / (b.length - 1);
  const se = Math.sqrt(va / a.length + vb / b.length);
  if (se === 0) return null;
  const t = (ma - mb) / se;
  const df =
    (va / a.length + vb / b.length) ** 2 /
    ((va / a.length) ** 2 / (a.length - 1) + (vb / b.length) ** 2 / (b.length - 1));
  return {
    t: Math.round(t * 1000) / 1000,
    df: Math.round(df * 10) / 10,
    pTwoSided: Math.round(2 * (1 - normalCdf(Math.abs(t))) * 10000) / 10000,
  };
}

function mannWhitneyU(a: number[], b: number[]): { u: number; z: number; pTwoSided: number } | null {
  if (a.length === 0 || b.length === 0) return null;
  const ranked = [...a.map((v) => ({ v, g: 1 })), ...b.map((v) => ({ v, g: 2 }))].sort((x, y) => x.v - y.v);
  const ranks: number[] = [];
  for (let i = 0; i < ranked.length; ) {
    let j = i;
    while (j + 1 < ranked.length && ranked[j + 1]!.v === ranked[i]!.v) j += 1;
    const avgRank = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) ranks[k] = avgRank;
    i = j + 1;
  }
  let r1 = 0;
  for (let i = 0; i < ranked.length; i++) {
    if (ranked[i]!.g === 1) r1 += ranks[i]!;
  }
  const n1 = a.length;
  const n2 = b.length;
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u = Math.min(u1, n1 * n2 - u1);
  const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  if (sigma === 0) return null;
  const z = (u - n1 * n2 * 0.5) / sigma;
  return {
    u: Math.round(u),
    z: Math.round(z * 1000) / 1000,
    pTwoSided: Math.round(2 * (1 - normalCdf(Math.abs(z))) * 10000) / 10000,
  };
}

function cohensD(a: number[], b: number[]): number | null {
  if (a.length < 2 || b.length < 2) return null;
  const ma = mean(a)!;
  const mb = mean(b)!;
  const sa = std(a)!;
  const sb = std(b)!;
  const pooled = Math.sqrt(((a.length - 1) * sa ** 2 + (b.length - 1) * sb ** 2) / (a.length + b.length - 2));
  if (pooled === 0) return null;
  return Math.round(((ma - mb) / pooled) * 100) / 100;
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    dx += (xs[i]! - mx) ** 2;
    dy += (ys[i]! - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  if (den === 0) return null;
  return Math.round((num / den) * 1000) / 1000;
}

function smaAt(closes: number[], idx: number, period: number): number | null {
  if (idx < period - 1) return null;
  const slice = closes.slice(idx - period + 1, idx + 1);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function emaSeries(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      out.push(values[0]!);
      continue;
    }
    if (i < period) {
      const m = values.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1);
      out.push(m);
    } else {
      out.push(values[i]! * k + out[i - 1]! * (1 - k));
    }
  }
  return out;
}

function computeMacdAt(closes: number[], idx: number): { macd: number; histogram: number } | null {
  if (idx < 26) return null;
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const macdLine: number[] = [];
  for (let i = 0; i <= idx; i++) macdLine.push(ema12[i]! - ema26[i]!);
  const signal = emaSeries(macdLine, 9);
  const macd = macdLine[idx]!;
  const hist = macd - signal[idx]!;
  return {
    macd: Math.round(macd * 1000) / 1000,
    histogram: Math.round(hist * 1000) / 1000,
  };
}

function bollingerPositionAt(closes: number[], idx: number, period = 20): number | null {
  if (idx < period - 1) return null;
  const slice = closes.slice(idx - period + 1, idx + 1);
  const m = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, c) => a + (c - m) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  if (sd === 0) return 50;
  const upper = m + 2 * sd;
  const lower = m - 2 * sd;
  const close = closes[idx]!;
  return Math.round(((close - lower) / (upper - lower)) * 1000) / 10;
}

function computeAdxAt(bars: OhlcBar[], idx: number, period = 14): number | null {
  if (idx < period * 2) return null;
  const trList: number[] = [];
  const plusDm: number[] = [];
  const minusDm: number[] = [];
  for (let i = 1; i <= idx; i++) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const ph = bars[i - 1]!.high;
    const pl = bars[i - 1]!.low;
    const pc = bars[i - 1]!.close;
    trList.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    plusDm.push(h - ph > pl - l && h - ph > 0 ? h - ph : 0);
    minusDm.push(pl - l > h - ph && pl - l > 0 ? pl - l : 0);
  }
  const smooth = (arr: number[], p: number): number[] => {
    const out: number[] = [];
    let sum = arr.slice(0, p).reduce((a, b) => a + b, 0);
    out.push(sum);
    for (let i = p; i < arr.length; i++) {
      sum = sum - sum / p + arr[i]!;
      out.push(sum);
    }
    return out;
  };
  const trS = smooth(trList, period);
  const pDmS = smooth(plusDm, period);
  const mDmS = smooth(minusDm, period);
  const dx: number[] = [];
  for (let i = 0; i < trS.length; i++) {
    if (trS[i]! <= 0) continue;
    const pdi = (100 * pDmS[i]!) / trS[i]!;
    const mdi = (100 * mDmS[i]!) / trS[i]!;
    const sum = pdi + mdi;
    if (sum === 0) continue;
    dx.push((100 * Math.abs(pdi - mdi)) / sum);
  }
  if (dx.length < period) return null;
  const adxSlice = dx.slice(-period);
  return Math.round((adxSlice.reduce((a, b) => a + b, 0) / adxSlice.length) * 100) / 100;
}

function computeAtrPctAt(bars: OhlcBar[], idx: number, period = 14): number | null {
  if (idx < period) return null;
  const trs: number[] = [];
  for (let i = idx - period + 1; i <= idx; i++) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const pc = bars[i - 1]!.close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atr = trs.reduce((a, b) => a + b, 0) / period;
  const close = bars[idx]!.close;
  if (close <= 0) return null;
  return Math.round((atr / close) * 10000) / 100;
}

function pct52wAt(bars: OhlcBar[], idx: number, lookback = 252): { high: number; low: number } | null {
  const start = Math.max(0, idx - lookback + 1);
  const window = bars.slice(start, idx + 1);
  if (window.length < 20) return null;
  const high52 = Math.max(...window.map((b) => b.high));
  const low52 = Math.min(...window.map((b) => b.low));
  const close = bars[idx]!.close;
  return {
    high: Math.round((close / high52 - 1) * 10000) / 100,
    low: Math.round((close / low52 - 1) * 10000) / 100,
  };
}

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2y`;
  const res = await fetch(url, { headers: { 'User-Agent': 'stock-trading-assistant-audit/1.0' } });
  if (!res.ok) throw new Error(`Yahoo ${yahooSymbol} HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: (number | null)[];
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
  const bars: OhlcBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = q?.open?.[i];
    const h = q?.high?.[i];
    const l = q?.low?.[i];
    const c = q?.close?.[i];
    const v = q?.volume?.[i];
    if (o == null || h == null || l == null || c == null || v == null || !Number.isFinite(c)) continue;
    bars.push({
      date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v,
    });
  }
  return bars;
}

function toYahooSymbol(symbol: string): string {
  if (symbol === '1023') return '1023.HK';
  if (/^\d+$/.test(symbol)) return `${symbol}.HK`;
  return symbol;
}

function technicalsAt(bars: OhlcBar[], idx: number) {
  const closes = bars.map((b) => b.close);
  const close = closes[idx]!;
  const ma5 = smaAt(closes, idx, 5);
  const ma25 = smaAt(closes, idx, 25);
  const macdPack = computeMacdAt(closes, idx);
  const bb = bollingerPositionAt(closes, idx);
  const adx = computeAdxAt(bars, idx);
  const atrPct = computeAtrPctAt(bars, idx);
  const w52 = pct52wAt(bars, idx);
  if (ma5 == null || ma25 == null || macdPack == null || bb == null || adx == null || atrPct == null || !w52) {
    return null;
  }
  return {
    ma5DeviationPct: Math.round(((close / ma5 - 1) * 100) * 100) / 100,
    ma25DeviationPct: Math.round(((close / ma25 - 1) * 100) * 100) / 100,
    macd: macdPack.macd,
    macdHistogram: macdPack.histogram,
    bollingerPositionPct: bb,
    adx,
    atrPct,
    pctFrom52wHigh: w52.high,
    pctFrom52wLow: w52.low,
  };
}

describe('buy vol<1.2 technical success vs failure', () => {
  it(
    'writes technical comparison and ranking JSON',
    async () => {
      const obs = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
      ) as Array<{
        date: string;
        symbol: string;
        openAiAction: string;
        return10d: number | null;
      }>;
      const reg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
      ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
      const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

      const barCache = new Map<string, OhlcBar[]>();
      const rows: BuyTechRow[] = [];

      for (const o of obs) {
        if (o.openAiAction !== 'buy' || o.return10d == null) continue;
        const vol = volMap.get(`${o.date}|${o.symbol}`);
        if (vol == null || vol >= VOL_MAX) continue;

        const yahoo = toYahooSymbol(o.symbol);
        if (!barCache.has(yahoo)) barCache.set(yahoo, await fetchYahooOhlcv(yahoo));
        const bars = barCache.get(yahoo)!;
        const idx = bars.findIndex((b) => b.date === o.date);
        if (idx < 0) continue;
        const tech = technicalsAt(bars, idx);
        if (!tech) continue;

        rows.push({
          date: o.date,
          symbol: o.symbol,
          return10d: o.return10d,
          outcome: o.return10d > 0 ? 'success' : 'failure',
          volumeSurgeRatio: vol,
          ...tech,
        });
      }

      const success = rows.filter((r) => r.outcome === 'success');
      const failure = rows.filter((r) => r.outcome === 'failure');

      const metricComparison = Object.fromEntries(
        TECH_METRICS.map((m) => {
          const sVals = success.map((r) => r[m.key]);
          const fVals = failure.map((r) => r[m.key]);
          return [
            m.key,
            {
              labelJa: m.labelJa,
              success: { mean: mean(sVals), median: median(sVals), n: sVals.length },
              failure: { mean: mean(fVals), median: median(fVals), n: fVals.length },
              deltaSuccessMinusFailure: {
                mean:
                  mean(sVals) != null && mean(fVals) != null
                    ? Math.round((mean(sVals)! - mean(fVals)!) * 100) / 100
                    : null,
              },
              tests: {
                welch: welchTTest(sVals, fVals),
                mannWhitney: mannWhitneyU(sVals, fVals),
                cohensD: cohensD(sVals, fVals),
              },
            },
          ];
        }),
      );

      const returns = rows.map((r) => r.return10d);
      const rankingCandidates = TECH_METRICS.map((m) => {
        const xs = rows.map((r) => r[m.key]);
        const corr = pearson(xs, returns);
        const comp = metricComparison[m.key]!;
        const cohen = comp.tests.cohensD;
        const expectancyScore =
          corr != null
            ? Math.round(Math.abs(corr) * 1000) / 1000
            : cohen != null
              ? Math.round(Math.abs(cohen) * 100) / 100
              : 0;
        return {
          metricKey: m.key,
          labelJa: m.labelJa,
          corrWithReturn10d: corr,
          cohensD: cohen,
          successMean: comp.success.mean,
          failureMean: comp.failure.mean,
          welchP: comp.tests.welch?.pTwoSided ?? null,
          expectancyScore,
          directionJa:
            comp.success.mean != null && comp.failure.mean != null
              ? comp.success.mean > comp.failure.mean
                ? '成功群の方が高い'
                : '失敗群の方が高い'
              : null,
        };
      });

      const expectationRanking = [...rankingCandidates]
        .sort((a, b) => b.expectancyScore - a.expectancyScore)
        .map((r, i) => ({ rank: i + 1, ...r }));

      const report = {
        methodologyJa: {
          scope: 'OpenAI buy・出来高倍率<1.2・10dリターン確定のみ',
          successBuy: 'return10d > 0',
          failureBuy: 'return10d <= 0',
          dataSource: 'Yahoo Finance OHLCV 2y',
          indicators: TECH_METRICS.map((m) => m.labelJa),
          maDeviation: '(終値/移動平均-1)×100',
          bollingerPosition: '(終値-下限)/(上限-下限)×100、20日2σ',
          adxAtr: 'ADX14・ATR14（終値比%）',
          week52: '直近252営業日（データ不足時は取得期間内）',
          ranking: 'expectancyScore = |10d相関|（全件）、併記 |Cohen d|',
          sampleCaveat: 'n=10（成功8・失敗2）のため検定は参考値',
        },
        counts: {
          vol12WithReturn10d: rows.length,
          success: success.length,
          failure: failure.length,
        },
        rows,
        metricComparison,
        expectationRanking,
        insightJa: [
          `対象${rows.length}件はすべて銘柄1023`,
          failure.length < 3
            ? '失敗群n=2のためWelch/Mann-Whitneyは検出力不足'
            : null,
          expectationRanking[0]
            ? `期待値1位: ${expectationRanking[0].labelJa}（score=${expectationRanking[0].expectancyScore}）`
            : null,
        ].filter(Boolean),
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-buy-vol12-technical-analysis.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== VOL<1.2 TECHNICAL ===\n', JSON.stringify(report, null, 2));
    },
    120_000,
  );
});
