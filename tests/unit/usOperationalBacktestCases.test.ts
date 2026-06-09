/**
 * US operational backtest — QQQ cap / exclusion cases
 * npx vitest run tests/unit/usOperationalBacktestCases.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const FORWARD_DAYS = 20;
const INITIAL_CAPITAL_USD = 10_000;
const ANALYSIS_START = '2024-06-01';
const ADX_MIN = 25;
const MACD_MIN = 0.1;
const DIST52_MAX = -3; // at least 3% below 52w high
const MONTE_CARLO_RUNS = 1000;
const GOAL_SHARPE = 0.8;
const GOAL_MAX_DD_PCT = -20;

const US_SYMBOLS = ['SPY', 'QQQ', 'SCHD', 'JEPI', 'VYM'] as const;
type UsSymbol = (typeof US_SYMBOLS)[number];

type OhlcvBar = { date: string; high: number; low: number; close: number };
type Signal = {
  date: string;
  symbol: UsSymbol;
  returnPct: number;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
};

type CaseDef = {
  id: string;
  labelJa: string;
  allowedSymbols: readonly UsSymbol[];
  qqqWeightCapPct: number | null; // null = no cap; 0 = exclude
};

const CASES: CaseDef[] = [
  {
    id: 'case1',
    labelJa: 'QQQ完全除外 (SCHD, SPY, VYM, JEPI)',
    allowedSymbols: ['SCHD', 'SPY', 'VYM', 'JEPI'],
    qqqWeightCapPct: 0,
  },
  {
    id: 'case2',
    labelJa: 'QQQ保有上限25%',
    allowedSymbols: US_SYMBOLS,
    qqqWeightCapPct: 25,
  },
  {
    id: 'case3',
    labelJa: 'QQQ保有上限10%',
    allowedSymbols: US_SYMBOLS,
    qqqWeightCapPct: 10,
  },
  {
    id: 'case4',
    labelJa: 'SCHDとSPYのみ',
    allowedSymbols: ['SCHD', 'SPY'],
    qqqWeightCapPct: 0,
  },
];

const CONCURRENT_LIMITS = [1, 2, 3] as const;

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
      tradeCount: 0,
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
    tradeCount: 0,
  };
}

function signalPriority(s: Signal): number {
  const symScore: Record<UsSymbol, number> = { SCHD: 5, SPY: 4, VYM: 3, JEPI: 2, QQQ: 1 };
  return symScore[s.symbol] * 1000 + s.adx14;
}

function applyQqqCapWeights(
  picks: Array<{ symbol: UsSymbol; returnPct: number }>,
  qqqCapPct: number | null,
): { dayReturnPct: number; weights: Array<{ symbol: UsSymbol; weightPct: number }> } {
  const n = picks.length;
  if (n === 0) return { dayReturnPct: 0, weights: [] };
  let weights = picks.map((p) => ({ symbol: p.symbol, weightPct: 100 / n }));
  const qqqIdx = picks.findIndex((p) => p.symbol === 'QQQ');
  if (qqqCapPct != null && qqqCapPct > 0 && qqqIdx >= 0) {
    const qqqW = weights[qqqIdx]!.weightPct;
    if (qqqW > qqqCapPct) {
      const excess = qqqW - qqqCapPct;
      weights[qqqIdx]!.weightPct = qqqCapPct;
      const others = weights.filter((_, i) => i !== qqqIdx);
      const otherSum = others.reduce((a, w) => a + w.weightPct, 0);
      for (const w of weights) {
        if (w.symbol !== 'QQQ') w.weightPct += (excess * w.weightPct) / (otherSum || 1);
      }
    }
  } else if (qqqCapPct === 0) {
    weights = weights.filter((w) => w.symbol !== 'QQQ');
    const sum = weights.reduce((a, w) => a + w.weightPct, 0);
    if (sum > 0) for (const w of weights) w.weightPct = (w.weightPct / sum) * 100;
  }
  let dayReturn = 0;
  for (const w of weights) {
    const p = picks.find((x) => x.symbol === w.symbol)!;
    dayReturn += (w.weightPct / 100) * p.returnPct;
  }
  return { dayReturnPct: round3(dayReturn), weights };
}

function runBacktest(
  allSignals: Signal[],
  caseDef: CaseDef,
  maxConcurrent: number,
): {
  dailyReturns: number[];
  dates: string[];
  trades: Array<{ date: string; symbol: UsSymbol; returnPct: number; weightPct: number }>;
} {
  const filtered = allSignals.filter((s) => caseDef.allowedSymbols.includes(s.symbol));
  const byDate = new Map<string, Signal[]>();
  for (const s of filtered) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const dates = [...byDate.keys()].sort();
  const dailyReturns: number[] = [];
  const outDates: string[] = [];
  const trades: Array<{ date: string; symbol: UsSymbol; returnPct: number; weightPct: number }> = [];

  for (const d of dates) {
    let daySignals = [...byDate.get(d)!].sort((a, b) => signalPriority(b) - signalPriority(a));
    if (caseDef.qqqWeightCapPct === 0) daySignals = daySignals.filter((s) => s.symbol !== 'QQQ');
    if (daySignals.length > maxConcurrent) daySignals = daySignals.slice(0, maxConcurrent);
    if (daySignals.length === 0) continue;

    const picks = daySignals.map((s) => ({ symbol: s.symbol, returnPct: s.returnPct }));
    const cap = caseDef.id === 'case1' || caseDef.id === 'case4' ? 0 : caseDef.qqqWeightCapPct;
    const { dayReturnPct, weights } = applyQqqCapWeights(picks, cap);
    dailyReturns.push(dayReturnPct);
    outDates.push(d);
    for (const w of weights) {
      const sig = daySignals.find((s) => s.symbol === w.symbol)!;
      trades.push({ date: d, symbol: w.symbol, returnPct: sig.returnPct, weightPct: round3(w.weightPct) });
    }
  }
  return { dailyReturns, dates: outDates, trades };
}

function monteCarlo1000(dailyReturns: number[], dates: string[], seed: number) {
  const rng = mulberry32(seed);
  const mcSharpe: number[] = [];
  const mcMaxDd: number[] = [];
  const mcCagr: number[] = [];
  const mcFinal: number[] = [];
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
    if (m.cagrPct != null) mcCagr.push(m.cagrPct);
    mcFinal.push(m.finalBalanceUsd);
  }
  return {
    runs: MONTE_CARLO_RUNS,
    sharpe: { p5: percentile(mcSharpe, 0.05), p50: percentile(mcSharpe, 0.5), p95: percentile(mcSharpe, 0.95) },
    maxDrawdownPct: {
      p5: percentile(mcMaxDd, 0.05),
      p50: percentile(mcMaxDd, 0.5),
      p95: percentile(mcMaxDd, 0.95),
    },
    cagrPct: { p5: percentile(mcCagr, 0.05), p50: percentile(mcCagr, 0.5), p95: percentile(mcCagr, 0.95) },
    finalBalanceUsd: {
      p5: percentile(mcFinal, 0.05),
      p50: percentile(mcFinal, 0.5),
      p95: percentile(mcFinal, 0.95),
    },
    probSharpeAbove08: round3(mcSharpe.filter((s) => s >= GOAL_SHARPE).length / mcSharpe.length),
    probMaxDdAboveMinus20: round3(mcMaxDd.filter((d) => d >= GOAL_MAX_DD_PCT).length / mcMaxDd.length),
  };
}

describe('US operational backtest cases', () => {
  it('writes ranked case × concurrent results with Monte Carlo', async () => {
    const barsBySymbol = new Map<UsSymbol, OhlcvBar[]>();
    for (const sym of US_SYMBOLS) barsBySymbol.set(sym, await fetchYahooOhlcv(sym));

    const allSignals: Signal[] = [];
    for (const sym of US_SYMBOLS) {
      const bars = barsBySymbol.get(sym)!;
      const closes = bars.map((b) => b.close);
      const ema = (arr: number[], span: number) => {
        const k = 2 / (span + 1);
        let v = arr[0]!;
        for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
        return v;
      };
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
            const out: number[] = [s];
            for (let k = period; k < arr.length; k++) {
              s = s - s / period + arr[k]!;
              out.push(s);
            }
            return out;
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
        const exitIdx = entryIdx + FORWARD_DAYS;
        if (exitIdx >= bars.length) continue;
        const entry = bars[entryIdx]!.close;
        if (entry <= 0) continue;
        const ret = round3(((bars[exitIdx]!.close / entry - 1) * 100));
        allSignals.push({ date, symbol: sym, returnPct: ret, adx14: round3(adx), macdHistPct: round3(macd), dist52wPct: round3(dist52) });
      }
    }

    const results: Array<{
      rank: number;
      caseId: string;
      caseLabelJa: string;
      maxConcurrent: number;
      sharpe: number | null;
      sortino: number | null;
      maxDrawdownPct: number | null;
      profitFactor: number | null;
      cagrPct: number | null;
      finalBalanceUsd: number;
      tradeCount: number;
      activeDays: number;
      meetsGoal: boolean;
      monteCarlo1000: ReturnType<typeof monteCarlo1000>;
    }> = [];

    for (const caseDef of CASES) {
      for (const maxC of CONCURRENT_LIMITS) {
        const { dailyReturns, dates, trades } = runBacktest(allSignals, caseDef, maxC);
        const m = metricsFromDaily(dailyReturns, dates);
        const mc = monteCarlo1000(dailyReturns, dates, 20260602 + caseDef.id.charCodeAt(4) + maxC);
        const meetsGoal =
          (m.sharpe ?? -1) >= GOAL_SHARPE && (m.maxDrawdownPct ?? -999) >= GOAL_MAX_DD_PCT;
        results.push({
          rank: 0,
          caseId: caseDef.id,
          caseLabelJa: caseDef.labelJa,
          maxConcurrent: maxC,
          sharpe: m.sharpe,
          sortino: m.sortino,
          maxDrawdownPct: m.maxDrawdownPct,
          profitFactor: m.profitFactor,
          cagrPct: m.cagrPct,
          finalBalanceUsd: m.finalBalanceUsd,
          tradeCount: trades.length,
          activeDays: m.activeDays,
          meetsGoal,
          monteCarlo1000: mc,
        });
      }
    }

    results.sort((a, b) => {
      if (a.meetsGoal !== b.meetsGoal) return a.meetsGoal ? -1 : 1;
      const sharpeDiff = (b.sharpe ?? -999) - (a.sharpe ?? -999);
      if (Math.abs(sharpeDiff) > 1e-6) return sharpeDiff;
      return (b.maxDrawdownPct ?? -999) - (a.maxDrawdownPct ?? -999);
    });
    results.forEach((r, i) => {
      r.rank = i + 1;
    });

    const baselineAllQqq = runBacktest(allSignals, {
      id: 'ref',
      labelJa: '参照: 全銘柄・QQQ無制限・同時3',
      allowedSymbols: US_SYMBOLS,
      qqqWeightCapPct: null,
    }, 3);
    const case1Best = results
      .filter((r) => r.caseId === 'case1')
      .sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999))[0];
    const refM = metricsFromDaily(baselineAllQqq.dailyReturns, baselineAllQqq.dates);

    const qqqExclusionEffect = {
      baselineJa: '全US銘柄・QQQ無制限・同時保有3・同一フィルタ',
      baseline: { ...refM, tradeCount: baselineAllQqq.trades.length },
      case1BestConcurrent: case1Best
        ? {
            maxConcurrent: case1Best.maxConcurrent,
            sharpe: case1Best.sharpe,
            maxDrawdownPct: case1Best.maxDrawdownPct,
            finalBalanceUsd: case1Best.finalBalanceUsd,
          }
        : null,
      maxDdImprovementPctPoints:
        case1Best && refM.maxDrawdownPct != null && case1Best.maxDrawdownPct != null
          ? round2(case1Best.maxDrawdownPct - refM.maxDrawdownPct)
          : null,
      sharpeDelta: case1Best && refM.sharpe != null && case1Best.sharpe != null ? round3(case1Best.sharpe - refM.sharpe) : null,
      conclusionJa: (() => {
        if (!case1Best || refM.maxDrawdownPct == null || case1Best.maxDrawdownPct == null) return '比較不可';
        const delta = round2(case1Best.maxDrawdownPct - refM.maxDrawdownPct);
        const dir = delta > 0 ? '改善' : delta < 0 ? '悪化' : '変化なし';
        return `QQQ完全除外でMaxDD ${refM.maxDrawdownPct}% → ${case1Best.maxDrawdownPct}%（${Math.abs(delta)}pt${dir}）。旧条件(MACD0.05・高値圏可)の-47%とは別比較。`;
      })(),
    };

    const report = {
      goal: { sharpeMin: GOAL_SHARPE, maxDrawdownMinPct: GOAL_MAX_DD_PCT },
      filtersJa: {
        adx: `> ${ADX_MIN}`,
        macdHistogram: `> ${MACD_MIN}`,
        distFrom52wHigh: `<= ${DIST52_MAX}%（高値から3%以上下落）`,
        holdDays: FORWARD_DAYS,
        capital: `固定 $${INITIAL_CAPITAL_USD.toLocaleString()}・複利なし・日次ウェイト合計100%`,
      },
      totalSignalsGenerated: allSignals.length,
      ranking: results,
      goalAchievers: results.filter((r) => r.meetsGoal),
      qqqExclusionEffect,
      byCase: Object.fromEntries(
        CASES.map((c) => [
          c.id,
          results.filter((r) => r.caseId === c.id).sort((a, b) => a.maxConcurrent - b.maxConcurrent),
        ]),
      ),
    };

    const outDir = path.join(process.cwd(), 'scripts', 'us-operational-backtest-cases');
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, 'ranking.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csvLines = [
      'rank,caseId,maxConcurrent,sharpe,sortino,maxDD_pct,profitFactor,cagr_pct,finalUsd,trades,activeDays,meetsGoal,mc_sharpe_p50,mc_maxDD_p50,prob_sharpe_gt_08',
      ...results.map((r) =>
        [
          r.rank,
          r.caseId,
          r.maxConcurrent,
          r.sharpe ?? '',
          r.sortino ?? '',
          r.maxDrawdownPct ?? '',
          r.profitFactor ?? '',
          r.cagrPct ?? '',
          r.finalBalanceUsd,
          r.tradeCount,
          r.activeDays,
          r.meetsGoal,
          r.monteCarlo1000.sharpe.p50 ?? '',
          r.monteCarlo1000.maxDrawdownPct.p50 ?? '',
          r.monteCarlo1000.probSharpeAbove08,
        ].join(','),
      ),
    ];
    fs.writeFileSync(path.join(outDir, 'ranking.csv'), `${csvLines.join('\n')}\n`, 'utf8');

    console.log('\n=== US OPERATIONAL BACKTEST CASES ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
