/**
 * Regional split optimization:
 * - US-only / MY-only completely separated backtests
 * - ADX threshold grid: 20,25,30,35
 * - MACD histogram threshold grid: >0, >0.05, >0.1
 * - Objective: MaxDD <= 15% then max Sharpe
 * - Monte Carlo 1000 for best strategy per region
 *
 * npx vitest run tests/unit/bestStrategyRegionalGridOptimization.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const FORWARD_DAYS = 20;
const ANALYSIS_START = '2024-06-01';
const TRAIN_MONTHS = 6;
const TEST_MONTHS = 1;
const MIN_TRAIN_SAMPLES = 80;
const SCORE_QUANTILES = [0.6, 0.7, 0.8, 0.9];
const INITIAL_CAPITAL = 1_000_000;
const MONTE_CARLO_RUNS = 1000;

const SYMBOL_DEFS = [
  { symbol: '1023', yahooSymbol: '1023.KL', region: 'MY' as const },
  { symbol: '1295', yahooSymbol: '1295.KL', region: 'MY' as const },
  { symbol: '1155', yahooSymbol: '1155.KL', region: 'MY' as const },
  { symbol: 'SPY', yahooSymbol: 'SPY', region: 'US' as const },
  { symbol: 'QQQ', yahooSymbol: 'QQQ', region: 'US' as const },
  { symbol: 'SCHD', yahooSymbol: 'SCHD', region: 'US' as const },
  { symbol: 'JEPI', yahooSymbol: 'JEPI', region: 'US' as const },
  { symbol: 'VYM', yahooSymbol: 'VYM', region: 'US' as const },
] as const;

const ADX_GRID = [20, 25, 30, 35] as const;
const MACD_GRID = [0, 0.05, 0.1] as const;

type Region = 'US' | 'MY';
type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };
type SampleRow = {
  date: string;
  month: string;
  symbol: string;
  region: Region;
  expectancyPct: number;
  distFrom52wHighPct: number;
  macdHistPct: number;
  adx14: number;
  aboveSma50: boolean;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function mean(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function std(vals: number[]): number {
  const m = mean(vals);
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}
function monthStr(date: string): string {
  return date.slice(0, 7);
}
function monthAdd(yyyymm: string, delta: number): string {
  const [y, m] = yyyymm.split('-').map((x) => Number(x));
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function inMonthRange(m: string, start: string, endExclusive: string): boolean {
  return m >= start && m < endExclusive;
}
function quantile(vals: number[], q: number): number {
  const s = [...vals].sort((a, b) => a - b);
  if (s.length === 0) return 0;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo]!;
  const w = pos - lo;
  return s[lo]! * (1 - w) + s[hi]! * w;
}
function percentile(vals: number[], p: number): number | null {
  if (vals.length === 0) return null;
  return quantile(vals, p);
}
function pearson(xs: number[], ys: number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]! - mx;
    const y = ys[i]! - my;
    num += x * y;
    dx += x * x;
    dy += y * y;
  }
  if (dx <= 0 || dy <= 0) return 0;
  return num / Math.sqrt(dx * dy);
}
function zNorm(values: number[]): { mean: number; std: number } {
  const m = mean(values);
  const s = std(values);
  return { mean: m, std: s > 1e-9 ? s : 1 };
}
function mulberry32(seed: number) {
  let t = seed;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
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
  const dx: number[] = [];
  for (let i = 0; i < trS.length; i++) {
    if (trS[i]! <= 0) return null;
    const diPlus = (100 * pS[i]!) / trS[i]!;
    const diMinus = (100 * mS[i]!) / trS[i]!;
    const sum = diPlus + diMinus;
    dx.push(sum <= 0 ? 0 : (100 * Math.abs(diPlus - diMinus)) / sum);
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
  const macd = ema(slice, 12) - ema(slice, 26);
  const signalSlice: number[] = [];
  for (let i = Math.max(0, idx - 8); i <= idx; i++) {
    const s = closes.slice(0, i + 1);
    signalSlice.push(ema(s, 12) - ema(s, 26));
  }
  const signal = ema(signalSlice, 9);
  const hist = macd - signal;
  const c = closes[idx]!;
  if (c <= 0) return null;
  return round4((hist / c) * 100);
}
function computeDistFrom52wHigh(bars: OhlcvBar[], idx: number): number | null {
  const lookback = Math.min(252, idx);
  if (lookback < 60) return null;
  let maxH = -Infinity;
  for (let i = idx - lookback; i <= idx; i++) maxH = Math.max(maxH, bars[i]!.high);
  if (maxH <= 0) return null;
  return round4((bars[idx]!.close / maxH - 1) * 100);
}
function smaAt(closes: number[], idx: number, period: number): number | null {
  if (idx < period - 1) return null;
  return mean(closes.slice(idx - period + 1, idx + 1));
}
function forwardExpectancy(bars: OhlcvBar[], idx: number): number | null {
  const entryIdx = idx + 1;
  const exitIdx = entryIdx + FORWARD_DAYS;
  if (exitIdx >= bars.length) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;
  return round4((bars[exitIdx]!.close / entry - 1) * 100);
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
        indicators?: { quote?: Array<{ high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }> };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const ts = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const out: OhlcvBar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const h = q?.high?.[i];
    const l = q?.low?.[i];
    const c = q?.close?.[i];
    const v = q?.volume?.[i];
    if (h == null || l == null || c == null || v == null || !Number.isFinite(c)) continue;
    out.push({ date: new Date(ts[i]! * 1000).toISOString().slice(0, 10), high: h, low: l, close: c, volume: v });
  }
  return out;
}

function buildSamplesForSymbol(symbol: string, region: Region, bars: OhlcvBar[]): SampleRow[] {
  const rows: SampleRow[] = [];
  const closes = bars.map((b) => b.close);
  for (let idx = 0; idx < bars.length; idx++) {
    const date = bars[idx]!.date;
    if (date < ANALYSIS_START) continue;
    const expectancy = forwardExpectancy(bars, idx);
    const dist52 = computeDistFrom52wHigh(bars, idx);
    const macd = computeMacdHistPct(closes, idx);
    const adx = computeAdx14(bars, idx);
    const sma50 = smaAt(closes, idx, 50);
    if (expectancy == null || dist52 == null || macd == null || adx == null || sma50 == null) continue;
    rows.push({
      date,
      month: monthStr(date),
      symbol,
      region,
      expectancyPct: expectancy,
      distFrom52wHighPct: dist52,
      macdHistPct: macd,
      adx14: adx,
      aboveSma50: bars[idx]!.close > sma50,
    });
  }
  return rows;
}

function metricFromDailyReturns(dailyReturnsPct: number[]) {
  if (dailyReturnsPct.length === 0) {
    return {
      cagrPct: null,
      sharpe: null,
      sortino: null,
      maxDrawdownPct: null,
      winRate: null,
      profitFactor: null,
      tradeCount: 0,
      endingEquity: INITIAL_CAPITAL,
    };
  }
  const wins = dailyReturnsPct.filter((r) => r > 0);
  const losses = dailyReturnsPct.filter((r) => r < 0);
  const mu = mean(dailyReturnsPct);
  const sigma = std(dailyReturnsPct);
  const sharpe = sigma > 1e-9 ? mu / sigma : null;
  const downside = dailyReturnsPct.filter((r) => r < 0).map((r) => r * r);
  const downsideDev = downside.length > 0 ? Math.sqrt(downside.reduce((a, b) => a + b, 0) / downside.length) : 0;
  const sortino = downsideDev > 1e-9 ? mu / downsideDev : null;
  const pf =
    losses.length > 0
      ? wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0))
      : null;
  const winRate = wins.length / dailyReturnsPct.length;

  let equity = INITIAL_CAPITAL;
  let peak = INITIAL_CAPITAL;
  let maxDd = 0;
  for (const r of dailyReturnsPct) {
    equity += (INITIAL_CAPITAL * r) / 100;
    if (equity > peak) peak = equity;
    maxDd = Math.min(maxDd, equity / peak - 1);
  }
  const years = dailyReturnsPct.length / 252;
  const cagr = years > 0 && equity > 0 ? Math.pow(equity / INITIAL_CAPITAL, 1 / years) - 1 : null;
  return {
    cagrPct: cagr == null ? null : round3(cagr * 100),
    sharpe: sharpe == null ? null : round3(sharpe),
    sortino: sortino == null ? null : round3(sortino),
    maxDrawdownPct: round2(maxDd * 100),
    winRate: round3(winRate),
    profitFactor: pf == null ? null : round3(pf),
    endingEquity: round2(equity),
  };
}

describe('Best strategy regional grid optimization', () => {
  it('runs US/MY separated grid with MC1000 and MaxDD<=15 objective', async () => {
    const samples: SampleRow[] = [];
    for (const def of SYMBOL_DEFS) {
      const bars = await fetchYahooOhlcv(def.yahooSymbol);
      samples.push(...buildSamplesForSymbol(def.symbol, def.region, bars));
    }
    samples.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

    const months = [...new Set(samples.map((s) => s.month))].sort();

    function runRegion(region: Region) {
      const regionRows = samples.filter((s) => s.region === region);
      const strategyRows: Array<{
        region: Region;
        adxThreshold: number;
        macdThreshold: number;
        cagrPct: number | null;
        sharpe: number | null;
        sortino: number | null;
        maxDrawdownPct: number | null;
        winRate: number | null;
        profitFactor: number | null;
        tradeCount: number;
        signalDays: number;
        avgHoldingDays: number;
        objectiveFeasible: boolean;
        endingEquity: number;
        dailyReturns: number[];
      }> = [];

      for (const adxThr of ADX_GRID) {
        for (const macdThr of MACD_GRID) {
          const picks: Array<{ date: string; expectancyPct: number }> = [];
          for (const testMonth of months) {
            const trainStart = monthAdd(testMonth, -TRAIN_MONTHS);
            const trainEnd = testMonth;
            const testEnd = monthAdd(testMonth, TEST_MONTHS);
            let trainRows = regionRows.filter((s) => inMonthRange(s.month, trainStart, trainEnd));
            let testRows = regionRows.filter((s) => inMonthRange(s.month, testMonth, testEnd));

            const pass = (r: SampleRow) => r.adx14 > adxThr && r.macdHistPct > macdThr && r.aboveSma50;
            trainRows = trainRows.filter(pass);
            testRows = testRows.filter(pass);
            if (trainRows.length < MIN_TRAIN_SAMPLES || testRows.length === 0) continue;

            // base pair:dist+adx scorer
            const distNorm = zNorm(trainRows.map((r) => r.distFrom52wHighPct));
            const adxNorm = zNorm(trainRows.map((r) => r.adx14));
            const wDist = pearson(trainRows.map((r) => r.distFrom52wHighPct), trainRows.map((r) => r.expectancyPct));
            const wAdx = pearson(trainRows.map((r) => r.adx14), trainRows.map((r) => r.expectancyPct));
            const scoreRow = (row: SampleRow) =>
              ((row.distFrom52wHighPct - distNorm.mean) / distNorm.std) * wDist +
              ((row.adx14 - adxNorm.mean) / adxNorm.std) * wAdx;

            const trainScores = trainRows.map(scoreRow);
            const best = SCORE_QUANTILES.map((q) => {
              const thr = quantile(trainScores, q);
              const selected = trainRows.filter((r) => scoreRow(r) >= thr);
              const exp = selected.length > 0 ? mean(selected.map((r) => r.expectancyPct)) : -Infinity;
              return { q, thr, exp };
            }).sort((a, b) => b.exp - a.exp)[0]!;

            for (const row of testRows) {
              if (scoreRow(row) >= best.thr) picks.push({ date: row.date, expectancyPct: row.expectancyPct });
            }
          }

          const byDate = new Map<string, number[]>();
          for (const p of picks) {
            const arr = byDate.get(p.date) ?? [];
            arr.push(p.expectancyPct);
            byDate.set(p.date, arr);
          }
          const dates = [...byDate.keys()].sort();
          const dailyReturns = dates.map((d) => mean(byDate.get(d)!)); // equal-weight, 100% cap
          const m = metricFromDailyReturns(dailyReturns);
          strategyRows.push({
            region,
            adxThreshold: adxThr,
            macdThreshold: macdThr,
            ...m,
            tradeCount: picks.length,
            signalDays: dates.length,
            avgHoldingDays: FORWARD_DAYS,
            objectiveFeasible: (m.maxDrawdownPct ?? -999) >= -15,
            dailyReturns,
          });
        }
      }

      const ranked = [...strategyRows]
        .sort((a, b) => {
          const fa = a.objectiveFeasible ? 1 : 0;
          const fb = b.objectiveFeasible ? 1 : 0;
          if (fb !== fa) return fb - fa;
          const sa = a.sharpe ?? -999;
          const sb = b.sharpe ?? -999;
          if (sb !== sa) return sb - sa;
          return (b.cagrPct ?? -999) - (a.cagrPct ?? -999);
        })
        .map((r, i) => ({ rank: i + 1, ...r }));

      const best = ranked[0]!;
      const feasibleCount = ranked.filter((r) => r.objectiveFeasible).length;

      // Monte Carlo 1000 on best strategy
      const rng = mulberry32(region === 'US' ? 202606021 : 202606022);
      const mc = [];
      for (let i = 0; i < MONTE_CARLO_RUNS; i++) {
        const sample: number[] = [];
        for (let j = 0; j < best.dailyReturns.length; j++) {
          const k = Math.floor(rng() * best.dailyReturns.length);
          sample.push(best.dailyReturns[k]!);
        }
        mc.push(metricFromDailyReturns(sample));
      }
      const mcSharpe = mc.map((x) => x.sharpe).filter((x): x is number => x != null);
      const mcMaxDd = mc.map((x) => x.maxDrawdownPct).filter((x): x is number => x != null);
      const mcCagr = mc.map((x) => x.cagrPct).filter((x): x is number => x != null);

      return {
        region,
        objective: 'MaxDD <= 15% (i.e., >= -15%) and then maximize Sharpe',
        feasibleCount,
        ranking: ranked.map((r) => ({
          rank: r.rank,
          adxThreshold: r.adxThreshold,
          macdThreshold: r.macdThreshold,
          cagrPct: r.cagrPct,
          sharpe: r.sharpe,
          sortino: r.sortino,
          maxDrawdownPct: r.maxDrawdownPct,
          winRate: r.winRate,
          profitFactor: r.profitFactor,
          tradeCount: r.tradeCount,
          signalDays: r.signalDays,
          avgHoldingDays: r.avgHoldingDays,
          objectiveFeasible: r.objectiveFeasible,
        })),
        selectedBest: {
          adxThreshold: best.adxThreshold,
          macdThreshold: best.macdThreshold,
          cagrPct: best.cagrPct,
          sharpe: best.sharpe,
          sortino: best.sortino,
          maxDrawdownPct: best.maxDrawdownPct,
          winRate: best.winRate,
          profitFactor: best.profitFactor,
          tradeCount: best.tradeCount,
          signalDays: best.signalDays,
        },
        monteCarlo1000: {
          runs: MONTE_CARLO_RUNS,
          cagrPct: {
            p5: percentile(mcCagr, 0.05),
            p50: percentile(mcCagr, 0.5),
            p95: percentile(mcCagr, 0.95),
          },
          sharpe: {
            p5: percentile(mcSharpe, 0.05),
            p50: percentile(mcSharpe, 0.5),
            p95: percentile(mcSharpe, 0.95),
          },
          maxDrawdownPct: {
            p5: percentile(mcMaxDd, 0.05),
            p50: percentile(mcMaxDd, 0.5),
            p95: percentile(mcMaxDd, 0.95),
          },
          sharpeAbove08Ratio: round3(mcSharpe.filter((s) => s >= 0.8).length / mcSharpe.length),
          maxDdAboveMinus15Ratio: round3(mcMaxDd.filter((d) => d >= -15).length / mcMaxDd.length),
        },
      };
    }

    const us = runRegion('US');
    const my = runRegion('MY');

    const report = {
      methodologyJa: {
        split: 'US株のみ / マレーシア株のみ を完全分離',
        grid: {
          adxThresholds: ADX_GRID,
          macdHistogramThresholds: MACD_GRID,
        },
        capitalModel: '固定資金100万円・資金100%上限・同日均等配分・複利なし',
        walkforward: '6ヶ月学習 -> 1ヶ月検証ローリング',
        objectiveJa: 'Sharpe最大ではなく「MaxDD 15%以下を満たす中でSharpe最大」',
      },
      regions: {
        US: us,
        MY: my,
      },
      summaryJa: {
        usBest: us.selectedBest,
        myBest: my.selectedBest,
        usFeasibleCount: us.feasibleCount,
        myFeasibleCount: my.feasibleCount,
      },
    };

    const out = path.join(process.cwd(), 'scripts', 'best-strategy-regional-grid-optimization.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n=== REGIONAL GRID OPT ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
