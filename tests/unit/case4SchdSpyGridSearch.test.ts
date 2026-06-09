/**
 * Case4 (SCHD+SPY) parameter grid — filter goal passers, MC3000, top 20
 * npx vitest run tests/unit/case4SchdSpyGridSearch.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const SYMBOLS = ['SCHD', 'SPY'] as const;
type Sym = (typeof SYMBOLS)[number];

const INITIAL_CAPITAL_USD = 10_000;
const ANALYSIS_START = '2024-06-01';
const GOAL_SHARPE = 0.8;
const GOAL_MAX_DD_PCT = -20;
const MONTE_CARLO_RUNS = 3000;

const ADX_GRID = [25, 30, 35, 40] as const;
const MACD_GRID = [0.1, 0.15, 0.2, 0.25] as const;
const DIST_GRID = [-3, -5, -7, -10] as const;
const CONCURRENT_GRID = [1, 2] as const;
const HOLD_GRID = [10, 15, 20] as const;

type OhlcvBar = { date: string; high: number; low: number; close: number };
type BarFeat = {
  date: string;
  symbol: Sym;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
  retByHold: Record<number, number>;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function mean(vals: number[]): number {
  return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
}
function std(vals: number[]): number {
  const m = mean(vals);
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}
function percentile(vals: number[], p: number): number | null {
  if (vals.length === 0) return null;
  const s = [...vals].sort((a, b) => a - b);
  const pos = (s.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo]!;
  const w = pos - lo;
  return round3(s[lo]! * (1 - w) + s[hi]! * w);
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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
        indicators?: { quote?: Array<{ high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }> };
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
    if (h == null || l == null || c == null || !Number.isFinite(c)) continue;
    out.push({ date: new Date(ts[i]! * 1000).toISOString().slice(0, 10), high: h, low: l, close: c });
  }
  return out;
}

function buildBarFeatures(bars: OhlcvBar[], symbol: Sym, holdDaysList: readonly number[]): BarFeat[] {
  const closes = bars.map((b) => b.close);
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1);
    let v = arr[0]!;
    for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
    return v;
  };
  const out: BarFeat[] = [];
  const maxHold = Math.max(...holdDaysList);
  for (let i = 0; i < bars.length; i++) {
    const date = bars[i]!.date;
    if (date < ANALYSIS_START) continue;
    const adx = (() => {
      const period = 14;
      if (i < period * 2) return null;
      const trList: number[] = [];
      const plusDm: number[] = [];
      const minusDm: number[] = [];
      for (let j = i - period * 2 + 1; j <= i; j++) {
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
      return mean(dx.slice(-period));
    })();
    const macd = (() => {
      if (i < 35) return null;
      const slice = closes.slice(0, i + 1);
      const macdLine = ema(slice, 12) - ema(slice, 26);
      const signalSlice: number[] = [];
      for (let j = Math.max(0, i - 8); j <= i; j++) {
        signalSlice.push(ema(closes.slice(0, j + 1), 12) - ema(closes.slice(0, j + 1), 26));
      }
      return ((macdLine - ema(signalSlice, 9)) / closes[i]!) * 100;
    })();
    const dist52 = (() => {
      const lookback = Math.min(252, i);
      if (lookback < 60) return null;
      let maxH = -Infinity;
      for (let j = i - lookback; j <= i; j++) maxH = Math.max(maxH, bars[j]!.high);
      return ((bars[i]!.close / maxH - 1) * 100);
    })();
    if (adx == null || macd == null || dist52 == null) continue;
    const entryIdx = i + 1;
    if (entryIdx + maxHold >= bars.length) continue;
    const entry = bars[entryIdx]!.close;
    if (entry <= 0) continue;
    const retByHold: Record<number, number> = {};
    for (const h of holdDaysList) {
      const exitIdx = entryIdx + h;
      if (exitIdx >= bars.length) continue;
      retByHold[h] = round3(((bars[exitIdx]!.close / entry - 1) * 100));
    }
    if (Object.keys(retByHold).length !== holdDaysList.length) continue;
    out.push({
      date,
      symbol,
      adx14: round3(adx),
      macdHistPct: round3(macd),
      dist52wPct: round3(dist52),
      retByHold,
    });
  }
  return out;
}

function metricsFromDaily(dailyReturns: number[], dates: string[]) {
  if (dailyReturns.length === 0) {
    return {
      sharpe: null as number | null,
      sortino: null as number | null,
      maxDrawdownPct: null as number | null,
      profitFactor: null as number | null,
      cagrPct: null as number | null,
      finalBalanceUsd: INITIAL_CAPITAL_USD,
      activeDays: 0,
      winRate: null as number | null,
    };
  }
  const wins = dailyReturns.filter((r) => r > 0);
  const losses = dailyReturns.filter((r) => r < 0);
  const mu = mean(dailyReturns);
  const sigma = std(dailyReturns);
  const downside = dailyReturns.filter((r) => r < 0);
  const downsideDev =
    downside.length > 0 ? Math.sqrt(downside.reduce((a, r) => a + r * r, 0) / downside.length) : 0;
  let equity = INITIAL_CAPITAL_USD;
  let peak = INITIAL_CAPITAL_USD;
  let maxDd = 0;
  for (const r of dailyReturns) {
    equity += (INITIAL_CAPITAL_USD * r) / 100;
    if (equity > peak) peak = equity;
    maxDd = Math.min(maxDd, equity / peak - 1);
  }
  const yearsCal =
    dates.length > 1
      ? (new Date(`${dates[dates.length - 1]}T00:00:00Z`).getTime() - new Date(`${dates[0]}T00:00:00Z`).getTime()) /
        (365.25 * 24 * 3600 * 1000)
      : 0;
  const cagr = yearsCal > 0 && equity > 0 ? Math.pow(equity / INITIAL_CAPITAL_USD, 1 / yearsCal) - 1 : null;
  return {
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    sortino: downsideDev > 1e-9 ? round3(mu / downsideDev) : null,
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      losses.length > 0
        ? round3(wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)))
        : null,
    cagrPct: cagr == null ? null : round3(cagr * 100),
    finalBalanceUsd: round2(equity),
    activeDays: dailyReturns.length,
    winRate: round3(wins.length / dailyReturns.length),
  };
}

function symPriority(s: Sym): number {
  return s === 'SCHD' ? 2 : 1;
}

function runCombo(
  allBars: BarFeat[],
  adxMin: number,
  macdMin: number,
  distMax: number,
  maxConcurrent: number,
  holdDays: number,
): { dailyReturns: number[]; dates: string[]; tradeCount: number } {
  const picks = allBars.filter(
    (b) => b.adx14 > adxMin && b.macdHistPct > macdMin && b.dist52wPct <= distMax,
  );
  const byDate = new Map<string, BarFeat[]>();
  for (const p of picks) {
    const arr = byDate.get(p.date) ?? [];
    arr.push(p);
    byDate.set(p.date, arr);
  }
  const dates = [...byDate.keys()].sort();
  const dailyReturns: number[] = [];
  const outDates: string[] = [];
  let tradeCount = 0;
  for (const d of dates) {
    const day = [...byDate.get(d)!].sort((a, b) => symPriority(b.symbol) - symPriority(a.symbol));
    const taken = day.slice(0, maxConcurrent);
    if (taken.length === 0) continue;
    const dayRet = mean(taken.map((t) => t.retByHold[holdDays]!));
    dailyReturns.push(round3(dayRet));
    outDates.push(d);
    tradeCount += taken.length;
  }
  return { dailyReturns, dates: outDates, tradeCount };
}

function compareRank(
  a: { sharpe: number | null; maxDrawdownPct: number | null; profitFactor: number | null },
  b: { sharpe: number | null; maxDrawdownPct: number | null; profitFactor: number | null },
): number {
  const sharpeDiff = (b.sharpe ?? -999) - (a.sharpe ?? -999);
  if (Math.abs(sharpeDiff) > 1e-9) return sharpeDiff;
  const ddDiff = (b.maxDrawdownPct ?? -999) - (a.maxDrawdownPct ?? -999);
  if (Math.abs(ddDiff) > 1e-9) return ddDiff;
  return (b.profitFactor ?? -999) - (a.profitFactor ?? -999);
}

function monteCarlo3000(dailyReturns: number[], dates: string[], seed: number) {
  const rng = mulberry32(seed);
  const mcSharpe: number[] = [];
  const mcMaxDd: number[] = [];
  const mcPf: number[] = [];
  for (let i = 0; i < MONTE_CARLO_RUNS; i++) {
    const sample: number[] = [];
    const sampleDates: string[] = [];
    for (let j = 0; j < dailyReturns.length; j++) {
      const k = Math.floor(rng() * dailyReturns.length);
      sample.push(dailyReturns[k]!);
      sampleDates.push(dates[k]!);
    }
    const m = metricsFromDaily(sample, sampleDates);
    if (m.sharpe != null) mcSharpe.push(m.sharpe);
    if (m.maxDrawdownPct != null) mcMaxDd.push(m.maxDrawdownPct);
    if (m.profitFactor != null) mcPf.push(m.profitFactor);
  }
  return {
    runs: MONTE_CARLO_RUNS,
    sharpe: { p5: percentile(mcSharpe, 0.05), p50: percentile(mcSharpe, 0.5), p95: percentile(mcSharpe, 0.95) },
    maxDrawdownPct: {
      p5: percentile(mcMaxDd, 0.05),
      p50: percentile(mcMaxDd, 0.5),
      p95: percentile(mcMaxDd, 0.95),
    },
    profitFactor: { p5: percentile(mcPf, 0.05), p50: percentile(mcPf, 0.5), p95: percentile(mcPf, 0.95) },
    probSharpeAbove08: round3(mcSharpe.filter((s) => s >= GOAL_SHARPE).length / mcSharpe.length),
    probMaxDdAboveMinus20: round3(mcMaxDd.filter((d) => d >= GOAL_MAX_DD_PCT).length / mcMaxDd.length),
    mcRankScore: round3(
      (percentile(mcSharpe, 0.5) ?? 0) * 2 +
        ((percentile(mcMaxDd, 0.5) ?? -100) + 20) / 20 +
        (percentile(mcPf, 0.5) ?? 0),
    ),
  };
}

describe('Case4 SCHD+SPY grid search', () => {
  it('filters goal passers, MC3000, outputs top 20', async () => {
    const allBars: BarFeat[] = [];
    for (const sym of SYMBOLS) {
      const bars = await fetchYahooOhlcv(sym);
      allBars.push(...buildBarFeatures(bars, sym, HOLD_GRID));
    }

    type ComboResult = {
      adxMin: number;
      macdMin: number;
      dist52MaxPct: number;
      maxConcurrent: number;
      holdDays: number;
      sharpe: number | null;
      sortino: number | null;
      maxDrawdownPct: number | null;
      profitFactor: number | null;
      cagrPct: number | null;
      finalBalanceUsd: number;
      activeDays: number;
      tradeCount: number;
      winRate: number | null;
      meetsGoal: boolean;
      dailyReturns: number[];
      dates: string[];
    };

    const allCombos: ComboResult[] = [];
    for (const adxMin of ADX_GRID) {
      for (const macdMin of MACD_GRID) {
        for (const distMax of DIST_GRID) {
          for (const maxC of CONCURRENT_GRID) {
            for (const hold of HOLD_GRID) {
              const { dailyReturns, dates, tradeCount } = runCombo(allBars, adxMin, macdMin, distMax, maxC, hold);
              const m = metricsFromDaily(dailyReturns, dates);
              const meetsGoal =
                (m.sharpe ?? -1) >= GOAL_SHARPE && (m.maxDrawdownPct ?? -999) >= GOAL_MAX_DD_PCT && tradeCount > 0;
              allCombos.push({
                adxMin,
                macdMin,
                dist52MaxPct: distMax,
                maxConcurrent: maxC,
                holdDays: hold,
                ...m,
                tradeCount,
                meetsGoal,
                dailyReturns,
                dates,
              });
            }
          }
        }
      }
    }

    const baselineFixed = allCombos.find(
      (c) =>
        c.adxMin === 25 &&
        c.macdMin === 0.1 &&
        c.dist52MaxPct === -3 &&
        c.maxConcurrent === 2 &&
        c.holdDays === 20,
    );

    const goalPassers = allCombos.filter((c) => c.meetsGoal);
    const withMc = goalPassers.map((c, idx) => {
      const mc = monteCarlo3000(c.dailyReturns, c.dates, 20260603 + idx * 17);
      const { dailyReturns: _d, dates: _t, ...rest } = c;
      return { ...rest, monteCarlo3000: mc };
    });

    withMc.sort((a, b) => {
      const byPoint = compareRank(a, b);
      if (byPoint !== 0) return byPoint;
      return (b.monteCarlo3000.mcRankScore ?? 0) - (a.monteCarlo3000.mcRankScore ?? 0);
    });

    const top20 = withMc.slice(0, 20).map((r, i) => ({ rank: i + 1, ...r }));

    const practicalPassers = withMc
      .filter((c) => c.tradeCount >= 30)
      .sort(compareRank)
      .slice(0, 10)
      .map((r, i) => ({ rank: i + 1, ...r }));
    const bestAmongMin30Trades = practicalPassers[0] ?? null;

    const allRanked = [...allCombos]
      .sort(compareRank)
      .slice(0, 20)
      .map((c, i) => {
        const { dailyReturns: _d, dates: _t, meetsGoal, ...rest } = c;
        return { rank: i + 1, meetsGoal, ...rest };
      });

    const report = {
      fixedUniverseJa: 'Case4: SCHD + SPY のみ',
      baselineReferenceJa: 'ADX>25, MACD>0.10, dist52<=-3%, 同時2, 保有20日',
      baselineFixed: baselineFixed
        ? (({ dailyReturns: _d, dates: _t, meetsGoal, ...r }) => ({ ...r, meetsGoal }))(baselineFixed)
        : null,
      goal: { sharpeMin: GOAL_SHARPE, maxDrawdownMinPct: GOAL_MAX_DD_PCT },
      gridSize: {
        adx: ADX_GRID.length,
        macd: MACD_GRID.length,
        dist52: DIST_GRID.length,
        concurrent: CONCURRENT_GRID.length,
        holdDays: HOLD_GRID.length,
        totalCombos: allCombos.length,
      },
      goalPasserCount: goalPassers.length,
      rankingCriteriaJa: '1位Sharpe → 2位MaxDD → 3位PF（高い順）',
      top20AfterMc3000: top20,
      practicalTop10Ja: 'トレード数>=30（過学習抑制）の目標達成組み合わせ上位10',
      practicalTop10AfterMc3000: practicalPassers,
      bestAmongMin30Trades,
      top20PointEstimateRegardlessOfGoal: allRanked,
      noteJa:
        goalPassers.length === 0
          ? '目標を満たす組み合わせは0件。top20AfterMc3000は空。参考として全グリッドのポイント推定上位20を併記。'
          : 'top20AfterMc3000は目標達成組み合わせのみMC3000再評価後の上位20',
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-grid-search');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'top20.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csvHeader =
      'rank,meetsGoal,adx,macd,dist52_pct,concurrent,hold_days,sharpe,maxDD_pct,PF,cagr_pct,finalUsd,trades,activeDays,mc_sharpe_p50,mc_maxDD_p50,prob_sharpe_gt_08';
    const csvRows = top20.length
      ? top20.map((r) =>
          [
            r.rank,
            r.meetsGoal,
            r.adxMin,
            r.macdMin,
            r.dist52MaxPct,
            r.maxConcurrent,
            r.holdDays,
            r.sharpe,
            r.maxDrawdownPct,
            r.profitFactor,
            r.cagrPct,
            r.finalBalanceUsd,
            r.tradeCount,
            r.activeDays,
            r.monteCarlo3000.sharpe.p50,
            r.monteCarlo3000.maxDrawdownPct.p50,
            r.monteCarlo3000.probSharpeAbove08,
          ].join(','),
        )
      : allRanked.map((r) =>
          [
            r.rank,
            r.meetsGoal,
            r.adxMin,
            r.macdMin,
            r.dist52MaxPct,
            r.maxConcurrent,
            r.holdDays,
            r.sharpe,
            r.maxDrawdownPct,
            r.profitFactor,
            r.cagrPct,
            r.finalBalanceUsd,
            r.tradeCount,
            r.activeDays,
            '',
            '',
            '',
          ].join(','),
        );
    fs.writeFileSync(path.join(outDir, 'top20.csv'), `${csvHeader}\n${csvRows.join('\n')}\n`, 'utf8');

    console.log('\n=== CASE4 GRID SEARCH ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
