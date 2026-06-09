/**
 * Hold 20 vs 25 vs 30 deep validation — WF, MC, costs, streaks, DD recovery
 * npx vitest run tests/unit/case4Hold20vs25vs30DeepValidation.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const SYMBOLS = ['SCHD', 'SPY'] as const;
type Sym = (typeof SYMBOLS)[number];
const HOLD_GRID = [20, 25, 30] as const;

const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';
const MAX_CONCURRENT = 2;
const ADX_MIN = 25;
const MACD_MIN = 0.15;
const DIST52_MAX = -7;
const MONTE_CARLO_RUNS = 10_000;

type OhlcvBar = { date: string; high: number; low: number; close: number };
type SignalBase = {
  date: string;
  symbol: Sym;
  retByHold: Record<number, number>;
};

type Trade = { date: string; symbol: Sym; returnPct: number };

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

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
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

function buildBases(bars: OhlcvBar[], symbol: Sym): SignalBase[] {
  const closes = bars.map((b) => b.close);
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1);
    let v = arr[0]!;
    for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
    return v;
  };
  const maxHold = Math.max(...HOLD_GRID);
  const out: SignalBase[] = [];
  for (let i = 0; i < bars.length; i++) {
    const date = bars[i]!.date;
    if (date < SIGNAL_START) continue;
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
    if (!(adx > ADX_MIN && macd > MACD_MIN && dist52 <= DIST52_MAX)) continue;
    const entryIdx = i + 1;
    if (entryIdx + maxHold >= bars.length) continue;
    const entry = bars[entryIdx]!.close;
    if (entry <= 0) continue;
    const retByHold: Record<number, number> = {};
    for (const h of HOLD_GRID) {
      const exitIdx = entryIdx + h;
      if (exitIdx >= bars.length) continue;
      retByHold[h] = round3(((bars[exitIdx]!.close / entry - 1) * 100));
    }
    if (Object.keys(retByHold).length !== HOLD_GRID.length) continue;
    out.push({ date, symbol, retByHold });
  }
  return out;
}

function runBacktest(
  bases: SignalBase[],
  holdDays: number,
  dateFrom: string | null,
  dateTo: string | null,
  costPerSide = 0,
): { dailyReturns: number[]; dates: string[]; trades: Trade[] } {
  const filtered = bases.filter((b) => {
    if (dateFrom && b.date < dateFrom) return false;
    if (dateTo && b.date > dateTo) return false;
    return true;
  });
  const byDate = new Map<string, SignalBase[]>();
  for (const b of filtered) {
    const arr = byDate.get(b.date) ?? [];
    arr.push(b);
    byDate.set(b.date, arr);
  }
  const dates = [...byDate.keys()].sort();
  const dailyReturns: number[] = [];
  const outDates: string[] = [];
  const trades: Trade[] = [];
  const friction = 2 * costPerSide;
  for (const d of dates) {
    const day = [...byDate.get(d)!].sort((a, b) => (b.symbol === 'SCHD' ? 1 : 0) - (a.symbol === 'SCHD' ? 1 : 0));
    const taken = day.slice(0, MAX_CONCURRENT);
    for (const t of taken) {
      trades.push({ date: d, symbol: t.symbol, returnPct: round3(t.retByHold[holdDays]! - friction) });
    }
    dailyReturns.push(round3(mean(taken.map((t) => t.retByHold[holdDays]! - friction))));
    outDates.push(d);
  }
  return { dailyReturns, dates: outDates, trades };
}

function equityCurve(dailyReturns: number[], dates: string[]) {
  let equity = INITIAL_CAPITAL_USD;
  let peak = INITIAL_CAPITAL_USD;
  const curve: Array<{ date: string; equityUsd: number; drawdownPct: number }> = [];
  for (let i = 0; i < dailyReturns.length; i++) {
    equity += (INITIAL_CAPITAL_USD * dailyReturns[i]!) / 100;
    if (equity > peak) peak = equity;
    curve.push({ date: dates[i]!, equityUsd: round2(equity), drawdownPct: round2(peak > 0 ? (equity / peak - 1) * 100 : 0) });
  }
  return curve;
}

function maxConsecutiveLosses(trades: Trade[]): number {
  let max = 0;
  let cur = 0;
  for (const t of trades) {
    if (t.returnPct < 0) {
      cur++;
      max = Math.max(max, cur);
    } else cur = 0;
  }
  return max;
}

function ddRecoveryDays(curve: Array<{ date: string; equityUsd: number; drawdownPct: number }>) {
  if (curve.length === 0) return { maxDdPct: null as number | null, troughDate: null as string | null, recoveryDays: null as number | null, ddPeriodDays: null as number | null };
  let peak = INITIAL_CAPITAL_USD;
  let peakDate = curve[0]!.date;
  let maxDd = 0;
  let troughDate = curve[0]!.date;
  let ddStartDate = curve[0]!.date;
  for (const p of curve) {
    if (p.equityUsd > peak) {
      peak = p.equityUsd;
      peakDate = p.date;
    }
    const dd = peak > 0 ? p.equityUsd / peak - 1 : 0;
    if (dd < maxDd) {
      maxDd = dd;
      troughDate = p.date;
      ddStartDate = peakDate;
    }
  }
  const troughIdx = curve.findIndex((c) => c.date === troughDate);
  let recoveryDays: number | null = null;
  if (troughIdx >= 0) {
    const peakAtTrough = peak;
    for (let i = troughIdx + 1; i < curve.length; i++) {
      if (curve[i]!.equityUsd >= peakAtTrough) {
        recoveryDays = daysBetween(troughDate, curve[i]!.date);
        break;
      }
    }
  }
  const ddPeriodDays = daysBetween(ddStartDate, troughDate);
  return {
    maxDdPct: round2(maxDd * 100),
    troughDate,
    ddStartDate,
    recoveryDays,
    ddPeriodDays,
  };
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(ms / (24 * 3600 * 1000)));
}

function analyzeRun(run: ReturnType<typeof runBacktest>) {
  const { dailyReturns, dates, trades } = run;
  if (dailyReturns.length === 0) {
    return {
      tradeCount: 0,
      sharpe: null as number | null,
      maxDrawdownPct: null as number | null,
      profitFactor: null as number | null,
      cagrPct: null as number | null,
      winRate: null as number | null,
      avgProfitPct: null as number | null,
      maxConsecutiveLosses: 0,
      ddRecoveryDays: null as number | null,
      ddPeriodDays: null as number | null,
      finalBalanceUsd: INITIAL_CAPITAL_USD,
      activeDays: 0,
    };
  }
  const wins = dailyReturns.filter((r) => r > 0);
  const losses = dailyReturns.filter((r) => r < 0);
  const tradeWins = trades.filter((t) => t.returnPct > 0);
  const mu = mean(dailyReturns);
  const sigma = std(dailyReturns);
  const curve = equityCurve(dailyReturns, dates);
  const dd = ddRecoveryDays(curve);
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
    tradeCount: trades.length,
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      losses.length > 0
        ? round3(wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)))
        : null,
    cagrPct: cagr == null ? null : round3(cagr * 100),
    winRate: trades.length > 0 ? round3(tradeWins.length / trades.length) : null,
    avgProfitPct: trades.length > 0 ? round3(mean(trades.map((t) => t.returnPct))) : null,
    maxConsecutiveLosses: maxConsecutiveLosses(trades),
    ddRecoveryDays: dd.recoveryDays,
    ddPeriodDays: dd.ddPeriodDays,
    finalBalanceUsd: round2(equity),
    activeDays: dailyReturns.length,
  };
}

function monteCarlo10000(dailyReturns: number[], dates: string[], seed: number) {
  const rng = mulberry32(seed);
  const mcSharpe: number[] = [];
  const mcMaxDd: number[] = [];
  for (let i = 0; i < MONTE_CARLO_RUNS; i++) {
    const sample: number[] = [];
    const sampleDates: string[] = [];
    for (let j = 0; j < dailyReturns.length; j++) {
      const k = Math.floor(rng() * dailyReturns.length);
      sample.push(dailyReturns[k]!);
      sampleDates.push(dates[k]!);
    }
    const m = analyzeRun({ dailyReturns: sample, dates: sampleDates, trades: [] });
    if (m.sharpe != null) mcSharpe.push(m.sharpe);
    if (m.maxDrawdownPct != null) mcMaxDd.push(m.maxDrawdownPct);
  }
  return {
    runs: MONTE_CARLO_RUNS,
    sharpe: { p5: percentile(mcSharpe, 0.05), p50: percentile(mcSharpe, 0.5), p95: percentile(mcSharpe, 0.95) },
    maxDrawdownPct: {
      p5: percentile(mcMaxDd, 0.05),
      p50: percentile(mcMaxDd, 0.5),
      p95: percentile(mcMaxDd, 0.95),
    },
    probSharpeAbove08: round3(mcSharpe.filter((s) => s >= 0.8).length / mcSharpe.length),
  };
}

describe('hold 20 vs 25 vs 30 deep validation', () => {
  it('WF, MC, costs, streaks — overfitting check', async () => {
    const bases: SignalBase[] = [];
    for (const sym of SYMBOLS) {
      bases.push(...buildBases(await fetchYahooOhlcv(sym), sym));
    }

    const results = HOLD_GRID.map((hold) => {
      const full = analyzeRun(runBacktest(bases, hold, null, null, 0));
      const fullRun = runBacktest(bases, hold, null, null, 0);

      const wf = {
        train2025H1_test2025H2: {
          train: analyzeRun(runBacktest(bases, hold, '2025-01-01', '2025-06-30', 0)),
          test: analyzeRun(runBacktest(bases, hold, '2025-07-01', '2025-12-31', 0)),
        },
        train2025H2_test2026: {
          train: analyzeRun(runBacktest(bases, hold, '2025-07-01', '2025-12-31', 0)),
          test: analyzeRun(runBacktest(bases, hold, '2026-01-01', null, 0)),
        },
      };

      const costs = [0.1, 0.25, 0.5].map((c) => ({
        costPctPerSide: c,
        ...analyzeRun(runBacktest(bases, hold, null, null, c)),
      }));

      const mc = monteCarlo10000(fullRun.dailyReturns, fullRun.dates, 20260607 + hold);

      return { holdDays: hold, fullPeriod: full, walkForward: wf, monteCarlo10000: mc, withCosts: costs };
    });

    const overfitVerdictJa = (() => {
      const h20 = results.find((r) => r.holdDays === 20)!;
      const h25 = results.find((r) => r.holdDays === 25)!;
      const h30 = results.find((r) => r.holdDays === 30)!;
      const lines: string[] = [];

      const testH2 = (hold: typeof h20) => hold.walkForward.train2025H1_test2025H2.test;
      lines.push(
        `2025後半OOS: 20日 Sharpe ${testH2(h20).sharpe} MaxDD ${testH2(h20).maxDrawdownPct}% | 25日 ${testH2(h25).sharpe}/${testH2(h25).maxDrawdownPct}% | 30日 ${testH2(h30).sharpe}/${testH2(h30).maxDrawdownPct}%`,
      );
      const test26 = (hold: typeof h20) => hold.walkForward.train2025H2_test2026.test;
      lines.push(
        `2026 OOS: 20日 件数${test26(h20).tradeCount} Sharpe ${test26(h20).sharpe ?? 'n/a'} | 25日 ${test26(h25).tradeCount}/${test26(h25).sharpe ?? 'n/a'} | 30日 ${test26(h30).tradeCount}/${test26(h30).sharpe ?? 'n/a'}`,
      );

      const longerBetterInSample =
        (h30.fullPeriod.maxDrawdownPct ?? -999) > (h20.fullPeriod.maxDrawdownPct ?? -999) &&
        (h30.fullPeriod.sharpe ?? 0) > (h20.fullPeriod.sharpe ?? 0);
      const longerBetterOos =
        (testH2(h25).sharpe ?? -1) >= (testH2(h20).sharpe ?? -1) &&
        (testH2(h30).maxDrawdownPct ?? -999) >= (testH2(h20).maxDrawdownPct ?? -999);

      let verdict = 'conditional';
      if (!longerBetterInSample) verdict = 'hold extension not supported in-sample';
      else if (longerBetterOos && (test26(h25).tradeCount ?? 0) + (test26(h30).tradeCount ?? 0) > 0)
        verdict = 'partial — 2025H2 OOS supports longer hold; 2026 sample tiny';
      else if (longerBetterOos) verdict = '2025H2 OOS supports 25-30d; 2026 unverified';
      else verdict = 'suspected overfit — in-sample gain not confirmed OOS';

      return { verdict, lines, recommendationJa: longerBetterOos ? '25日を第一候補、30日は2026データ蓄積後に再判定' : '20日維持、長期保有改善は過学習疑い' };
    })();

    const report = {
      strategyJa: {
        universe: 'SCHD + SPY',
        adx: `> ${ADX_MIN}`,
        macd: `> ${MACD_MIN}`,
        dist52w: `<= ${DIST52_MAX}%`,
        maxConcurrent: MAX_CONCURRENT,
      },
      comparisonFullPeriod: results.map((r) => ({ holdDays: r.holdDays, ...r.fullPeriod })),
      walkForward: results.map((r) => ({ holdDays: r.holdDays, ...r.walkForward })),
      monteCarlo: results.map((r) => ({ holdDays: r.holdDays, ...r.monteCarlo10000 })),
      costs: results.map((r) => ({ holdDays: r.holdDays, scenarios: r.withCosts })),
      overfittingAssessment: overfitVerdictJa,
    };

    const outDir = path.join(process.cwd(), 'scripts', 'hold-20-25-30-deep-validation');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csvHeader =
      'hold_days,scope,trades,sharpe,maxDD,PF,cagr,winRate,avgProfitPct,maxLossStreak,ddRecoveryDays,ddPeriodDays,finalUsd';
    const lines = [csvHeader];
    for (const r of results) {
      const fp = r.fullPeriod;
      lines.push(
        [r.holdDays, 'full', fp.tradeCount, fp.sharpe, fp.maxDrawdownPct, fp.profitFactor, fp.cagrPct, fp.winRate, fp.avgProfitPct, fp.maxConsecutiveLosses, fp.ddRecoveryDays, fp.ddPeriodDays, fp.finalBalanceUsd].join(','),
      );
      const t1 = r.walkForward.train2025H1_test2025H2.test;
      lines.push(
        [r.holdDays, 'wf_test_2025H2', t1.tradeCount, t1.sharpe, t1.maxDrawdownPct, t1.profitFactor, t1.cagrPct, t1.winRate, t1.avgProfitPct, t1.maxConsecutiveLosses, t1.ddRecoveryDays, t1.ddPeriodDays, t1.finalBalanceUsd].join(','),
      );
      const t2 = r.walkForward.train2025H2_test2026.test;
      lines.push(
        [r.holdDays, 'wf_test_2026', t2.tradeCount, t2.sharpe, t2.maxDrawdownPct, t2.profitFactor, t2.cagrPct, t2.winRate, t2.avgProfitPct, t2.maxConsecutiveLosses, t2.ddRecoveryDays, t2.ddPeriodDays, t2.finalBalanceUsd].join(','),
      );
    }
    fs.writeFileSync(path.join(outDir, 'comparison.csv'), `${lines.join('\n')}\n`, 'utf8');

    console.log('\n=== HOLD 20/25/30 DEEP ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
