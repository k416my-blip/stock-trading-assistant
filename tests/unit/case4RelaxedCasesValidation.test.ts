/**
 * Relaxed Case A–D — min 100 trades 2024–2026, yearly + full metrics
 * npx vitest run tests/unit/case4RelaxedCasesValidation.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const SYMBOLS = ['SCHD', 'SPY'] as const;
type Sym = (typeof SYMBOLS)[number];

const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';
const HOLD_DAYS = 20;
const MAX_CONCURRENT = 2;
const ADX_MIN = 25;
const MIN_TRADES_TARGET = 100;
const MAX_DD_GOAL_PCT = -20;

const CASES = [
  { id: 'A', labelJa: 'Case A: MACD>0.15, 52w<=-5%', macdMin: 0.15, dist52Max: -5 },
  { id: 'B', labelJa: 'Case B: MACD>0.15, 52w<=-7%', macdMin: 0.15, dist52Max: -7 },
  { id: 'C', labelJa: 'Case C: MACD>0.10, 52w<=-5%', macdMin: 0.1, dist52Max: -5 },
  { id: 'D', labelJa: 'Case D: MACD>0.10, 52w<=-7%', macdMin: 0.1, dist52Max: -7 },
] as const;

const YEARS = ['2024', '2025', '2026'] as const;

type OhlcvBar = { date: string; high: number; low: number; close: number };
type Signal = { date: string; symbol: Sym; returnPct: number; year: string };

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

function buildAllSignals(bars: OhlcvBar[], symbol: Sym): Array<Omit<Signal, 'returnPct'> & { returnPctGross: number; adx: number; macd: number; dist52: number }> {
  const closes = bars.map((b) => b.close);
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1);
    let v = arr[0]!;
    for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
    return v;
  };
  const out: Array<Omit<Signal, 'returnPct'> & { returnPctGross: number; adx: number; macd: number; dist52: number }> = [];
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
    const entryIdx = i + 1;
    const exitIdx = entryIdx + HOLD_DAYS;
    if (exitIdx >= bars.length) continue;
    const entry = bars[entryIdx]!.close;
    if (entry <= 0) continue;
    const ret = round3(((bars[exitIdx]!.close / entry - 1) * 100));
    out.push({
      date,
      symbol,
      year: date.slice(0, 4),
      returnPctGross: ret,
      adx,
      macd,
      dist52,
    });
  }
  return out;
}

function symPriority(s: Sym): number {
  return s === 'SCHD' ? 2 : 1;
}

function filterSignals(
  raw: Array<{ date: string; symbol: Sym; year: string; returnPctGross: number; adx: number; macd: number; dist52: number }>,
  macdMin: number,
  dist52Max: number,
  yearFilter: string | null,
): Signal[] {
  return raw
    .filter(
      (s) =>
        s.adx > ADX_MIN &&
        s.macd > macdMin &&
        s.dist52 <= dist52Max &&
        (yearFilter == null || s.year === yearFilter),
    )
    .map((s) => ({ date: s.date, symbol: s.symbol, returnPct: s.returnPctGross, year: s.year }));
}

function runPortfolio(signals: Signal[]): { dailyReturns: number[]; dates: string[]; tradeCount: number } {
  const byDate = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const dates = [...byDate.keys()].sort();
  const dailyReturns: number[] = [];
  const outDates: string[] = [];
  let tradeCount = 0;
  for (const d of dates) {
    const day = [...byDate.get(d)!].sort((a, b) => symPriority(b.symbol) - symPriority(a.symbol));
    const taken = day.slice(0, MAX_CONCURRENT);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    outDates.push(d);
    tradeCount += taken.length;
  }
  return { dailyReturns, dates: outDates, tradeCount };
}

function metricsFromDaily(dailyReturns: number[], dates: string[]) {
  if (dailyReturns.length === 0) {
    return {
      sharpe: null as number | null,
      maxDrawdownPct: null as number | null,
      profitFactor: null as number | null,
      cagrPct: null as number | null,
      activeDays: 0,
    };
  }
  const wins = dailyReturns.filter((r) => r > 0);
  const losses = dailyReturns.filter((r) => r < 0);
  const mu = mean(dailyReturns);
  const sigma = std(dailyReturns);
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
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      losses.length > 0
        ? round3(wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)))
        : null,
    cagrPct: cagr == null ? null : round3(cagr * 100),
    activeDays: dailyReturns.length,
  };
}

function scoreCase(r: {
  firesAllYears: boolean;
  totalTrades: number;
  fullMaxDrawdownPct: number | null;
}): number {
  let s = 0;
  if (r.firesAllYears) s += 1000;
  if (r.totalTrades >= MIN_TRADES_TARGET) s += 500;
  if (r.fullMaxDrawdownPct != null && r.fullMaxDrawdownPct >= MAX_DD_GOAL_PCT) s += 200;
  s += Math.min(r.totalTrades, 200);
  if (r.fullMaxDrawdownPct != null) s += r.fullMaxDrawdownPct;
  return s;
}

describe('Case4 relaxed A–D validation 2024–2026', () => {
  it('writes yearly and full-period comparison with priority ranking', async () => {
    const raw: Array<{ date: string; symbol: Sym; year: string; returnPctGross: number; adx: number; macd: number; dist52: number }> = [];
    for (const sym of SYMBOLS) {
      raw.push(...buildAllSignals(await fetchYahooOhlcv(sym), sym));
    }

    const caseResults = CASES.map((c) => {
      const fullSignals = filterSignals(raw, c.macdMin, c.dist52Max, null);
      const full = runPortfolio(fullSignals);
      const fullM = metricsFromDaily(full.dailyReturns, full.dates);

      const byYear = Object.fromEntries(
        YEARS.map((y) => {
          const ys = filterSignals(raw, c.macdMin, c.dist52Max, y);
          const run = runPortfolio(ys);
          const m = metricsFromDaily(run.dailyReturns, run.dates);
          return [
            y,
            {
              tradeCount: run.tradeCount,
              fires: run.tradeCount > 0,
              sharpe: m.sharpe,
              maxDrawdownPct: m.maxDrawdownPct,
              cagrPct: m.cagrPct,
              activeDays: m.activeDays,
            },
          ];
        }),
      ) as Record<(typeof YEARS)[number], { tradeCount: number; fires: boolean; sharpe: number | null; maxDrawdownPct: number | null; cagrPct: number | null; activeDays: number }>;

      const firesAllYears = YEARS.every((y) => byYear[y]!.fires);
      const meetsMinTrades = full.tradeCount >= MIN_TRADES_TARGET;
      const meetsMaxDd = fullM.maxDrawdownPct != null && fullM.maxDrawdownPct >= MAX_DD_GOAL_PCT;

      return {
        caseId: c.id,
        labelJa: c.labelJa,
        params: { adxMin: ADX_MIN, macdMin: c.macdMin, dist52MaxPct: c.dist52Max, maxConcurrent: MAX_CONCURRENT, holdDays: HOLD_DAYS },
        byYear,
        fullPeriod: {
          tradeCount: full.tradeCount,
          sharpe: fullM.sharpe,
          maxDrawdownPct: fullM.maxDrawdownPct,
          profitFactor: fullM.profitFactor,
          cagrPct: fullM.cagrPct,
          activeDays: fullM.activeDays,
        },
        checks: {
          firesAllYears,
          meetsMinTrades,
          meetsMaxDd,
          meetsAllPriorityGoals: firesAllYears && meetsMinTrades && meetsMaxDd,
        },
        priorityScore: scoreCase({
          firesAllYears,
          totalTrades: full.tradeCount,
          fullMaxDrawdownPct: fullM.maxDrawdownPct,
        }),
      };
    });

    caseResults.sort((a, b) => b.priorityScore - a.priorityScore);
    caseResults.forEach((r, i) => {
      (r as { rank: number }).rank = i + 1;
    });

    const report = {
      fixedJa: {
        universe: 'SCHD + SPY',
        adx: `> ${ADX_MIN}`,
        maxConcurrent: MAX_CONCURRENT,
        holdDays: HOLD_DAYS,
        period: `${SIGNAL_START} 〜 現在`,
        capitalJa: '固定$10,000・複利なし・等ウェイト',
      },
      evaluationPriorityJa: [
        '1. 2024/2025/2026 全年度で発火',
        `2. 全期間トレード >= ${MIN_TRADES_TARGET}`,
        `3. 全期間 MaxDD < 20% (>${MAX_DD_GOAL_PCT}%)`,
        '4. Sharpe（参考）',
      ],
      minTradesTarget: MIN_TRADES_TARGET,
      cases: caseResults,
      comparisonTable: caseResults.map((r) => ({
        rank: (r as { rank: number }).rank,
        caseId: r.caseId,
        fires2024: r.byYear['2024']!.fires,
        fires2025: r.byYear['2025']!.fires,
        fires2026: r.byYear['2026']!.fires,
        trades2024: r.byYear['2024']!.tradeCount,
        trades2025: r.byYear['2025']!.tradeCount,
        trades2026: r.byYear['2026']!.tradeCount,
        totalTrades: r.fullPeriod.tradeCount,
        fullSharpe: r.fullPeriod.sharpe,
        fullMaxDD: r.fullPeriod.maxDrawdownPct,
        fullPF: r.fullPeriod.profitFactor,
        meetsAllGoals: r.checks.meetsAllPriorityGoals,
      })),
      recommendationJa: (() => {
        const best = caseResults[0];
        if (!best) return '結果なし';
        if (best.checks.meetsAllPriorityGoals) {
          return `${best.caseId} が全優先条件を満たす。全期間トレード ${best.fullPeriod.tradeCount}、MaxDD ${best.fullPeriod.maxDrawdownPct}%。`;
        }
        const partial = caseResults.filter((r) => r.checks.firesAllYears);
        if (partial.length === 0) {
          return '全ケースで3年とも発火は未達。最もトレード数が多いケースを参考にさらに緩和が必要。';
        }
        const byTrades = [...partial].sort((a, b) => b.fullPeriod.tradeCount - a.fullPeriod.tradeCount)[0]!;
        return `全年度発火は ${partial.map((p) => p.caseId).join(', ')}。トレード数最大は ${byTrades.caseId}（${byTrades.fullPeriod.tradeCount}件）。100件目標${byTrades.checks.meetsMinTrades ? '達成' : '未達'}。`;
      })(),
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-relaxed-cases');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'validation-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csvLines = [
      'rank,case,fires24,fires25,fires26,t24,t25,t26,total,full_sharpe,full_maxDD,full_PF,all_goals',
      ...report.comparisonTable.map((r) =>
        [
          r.rank,
          r.caseId,
          r.fires2024,
          r.fires2025,
          r.fires2026,
          r.trades2024,
          r.trades2025,
          r.trades2026,
          r.totalTrades,
          r.fullSharpe ?? '',
          r.fullMaxDD ?? '',
          r.fullPF ?? '',
          r.meetsAllGoals,
        ].join(','),
      ),
    ];
    fs.writeFileSync(path.join(outDir, 'comparison.csv'), `${csvLines.join('\n')}\n`, 'utf8');

    console.log('\n=== CASE4 RELAXED VALIDATION ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
