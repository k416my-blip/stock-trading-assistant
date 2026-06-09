/**
 * Per-year dist optimization — SPY優先・同時3・5ETF・hold25
 * npx vitest run tests/unit/case4Hold25PerYearDistOptimization.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const UNIVERSE = ['SCHD', 'SPY', 'VYM', 'DGRO', 'SPLG'] as const;
type Etf = (typeof UNIVERSE)[number];

const HOLD_DAYS = 25;
const MAX_CONCURRENT = 3;
const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';
const YEARS = ['2024', '2025', '2026'] as const;

const ADX_MIN = 25;
const MACD_MIN = 0.1;
const DIST_GRID = [-2, -3, -4, -5, -6, -7, -8] as const;

const GOAL_MIN_TRADES = 100;
const GOAL_SHARPE = 0.8;
const GOAL_MAX_DD = -15;

const PRIORITY_SPY_FIRST: Record<Etf, number> = {
  SPY: 6,
  DGRO: 4,
  VYM: 3,
  SPLG: 2,
  SCHD: 1,
};

type OhlcvBar = { date: string; high: number; low: number; close: number };
type RawBar = {
  date: string;
  year: string;
  symbol: Etf;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
  returnPct: number;
};

type Signal = {
  date: string;
  symbol: Etf;
  returnPct: number;
  year: string;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
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

function buildRaw(bars: OhlcvBar[], symbol: Etf): RawBar[] {
  const closes = bars.map((b) => b.close);
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1);
    let v = arr[0]!;
    for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
    return v;
  };
  const out: RawBar[] = [];
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
      return (bars[i]!.close / maxH - 1) * 100;
    })();
    if (adx == null || macd == null || dist52 == null) continue;
    const entryIdx = i + 1;
    const exitIdx = entryIdx + HOLD_DAYS;
    if (exitIdx >= bars.length) continue;
    const entry = bars[entryIdx]!.close;
    if (entry <= 0) continue;
    out.push({
      date,
      year: date.slice(0, 4),
      symbol,
      adx14: round3(adx),
      macdHistPct: round3(macd),
      dist52wPct: round3(dist52),
      returnPct: round3(((bars[exitIdx]!.close / entry - 1) * 100)),
    });
  }
  return out;
}

function baseSignals(raw: RawBar[]): Signal[] {
  return raw
    .filter((r) => r.adx14 > ADX_MIN && r.macdHistPct > MACD_MIN)
    .map((r) => ({
      date: r.date,
      symbol: r.symbol,
      returnPct: r.returnPct,
      year: r.year,
      adx14: r.adx14,
      macdHistPct: r.macdHistPct,
      dist52wPct: r.dist52wPct,
    }));
}

function filterSignals(signals: Signal[], distMax: number): Signal[] {
  return signals.filter((s) => s.dist52wPct <= distMax);
}

function filterSignalsPerYear(signals: Signal[], distByYear: Record<string, number>): Signal[] {
  return signals.filter((s) => s.dist52wPct <= (distByYear[s.year] ?? -999));
}

function runPortfolio(signals: Signal[]) {
  const byDate = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const dates = [...byDate.keys()].sort();
  const dailyReturns: number[] = [];
  const outDates: string[] = [];
  const executed: Signal[] = [];
  for (const d of dates) {
    const taken = [...byDate.get(d)!]
      .sort((a, b) => PRIORITY_SPY_FIRST[b.symbol] - PRIORITY_SPY_FIRST[a.symbol])
      .slice(0, MAX_CONCURRENT);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    outDates.push(d);
    executed.push(...taken);
  }
  return { dailyReturns, dates: outDates, executed };
}

function evaluate(signals: Signal[]) {
  const run = runPortfolio(signals);
  const m = metricsFromDaily(run.dailyReturns, run.dates);
  const byYear = Object.fromEntries(YEARS.map((y) => [y, run.executed.filter((t) => t.year === y).length])) as Record<
    string,
    number
  >;
  const total = run.executed.length;
  const yearRatio = Object.fromEntries(
    YEARS.map((y) => [y, total > 0 ? round3((byYear[y]! / total) * 100) : 0]),
  ) as Record<string, number>;
  const pct2025 = yearRatio['2025'] ?? 0;
  return {
    tradeCount: total,
    ...m,
    tradesByYear: byYear,
    yearRatioPct: yearRatio,
    pct2025,
    checks: {
      trades100: total >= GOAL_MIN_TRADES,
      sharpeOk: (m.sharpe ?? -1) >= GOAL_SHARPE,
      maxDdOk: m.maxDrawdownPct != null && m.maxDrawdownPct >= GOAL_MAX_DD,
      meetsAllGoals: false,
    },
  };
}

function metricsFromDaily(dailyReturns: number[], dates: string[]) {
  if (dailyReturns.length === 0) {
    return { sharpe: null as number | null, maxDrawdownPct: null as number | null, profitFactor: null as number | null };
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
  return {
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      losses.length > 0
        ? round3(wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)))
        : null,
  };
}

function goalScore(r: ReturnType<typeof evaluate>): number {
  r.checks.meetsAllGoals = r.checks.trades100 && r.checks.sharpeOk && r.checks.maxDdOk;
  let s = 0;
  if (r.checks.meetsAllGoals) s += 100_000;
  if (r.checks.sharpeOk) s += 10_000;
  if (r.checks.maxDdOk) s += 5_000;
  if (r.checks.trades100) s += 2_500;
  s -= r.pct2025 * 100;
  s += (r.sharpe ?? 0) * 200;
  s += Math.min(r.tradeCount, 200);
  if (r.maxDrawdownPct != null) s += r.maxDrawdownPct * 3;
  return s;
}

describe('Case4 per-year dist optimization', () => {
  it('writes fixed-dist grid and per-year dist combinations', async () => {
    const raw: RawBar[] = [];
    for (const sym of UNIVERSE) {
      raw.push(...buildRaw(await fetchYahooOhlcv(sym), sym));
    }
    const allBase = baseSignals(raw);

    const fixedDistGrid = DIST_GRID.map((distMax) => {
      const r = evaluate(filterSignals(allBase, distMax));
      return { distMax, mode: 'fixed' as const, ...r };
    });

    const perYearBestByYear = Object.fromEntries(
      YEARS.map((y) => {
        const candidates = DIST_GRID.map((distMax) => {
          const yearSigs = filterSignals(
            allBase.filter((s) => s.year === y),
            distMax,
          );
          return { distMax, rawSignalCount: yearSigs.length };
        });
        const best = [...candidates].sort((a, b) => b.rawSignalCount - a.rawSignalCount)[0]!;
        return [y, { bestDistForRawSignals: best.distMax, rawSignals: best.rawSignalCount, allCandidates: candidates }];
      }),
    );

    const perYearComboResults: Array<{
      dist2024: number;
      dist2025: number;
      dist2026: number;
      label: string;
    } & ReturnType<typeof evaluate>> = [];

    for (const d24 of DIST_GRID) {
      for (const d25 of DIST_GRID) {
        for (const d26 of DIST_GRID) {
          const distByYear = { '2024': d24, '2025': d25, '2026': d26 };
          const r = evaluate(filterSignalsPerYear(allBase, distByYear));
          perYearComboResults.push({
            dist2024: d24,
            dist2025: d25,
            dist2026: d26,
            label: `2024<=${d24}% / 2025<=${d25}% / 2026<=${d26}%`,
            ...r,
            goalScore: 0,
          });
        }
      }
    }
    perYearComboResults.forEach((r) => {
      r.goalScore = goalScore(r);
    });
    perYearComboResults.sort((a, b) => b.goalScore - a.goalScore);

    const goalPassers = perYearComboResults.filter((r) => r.checks.meetsAllGoals);
    const goalPassersLow2025 = [...goalPassers].sort((a, b) => a.pct2025 - b.pct2025);

    const baselineDist3 = fixedDistGrid.find((r) => r.distMax === -3)!;

    const report = {
      fixedStrategyJa: {
        universe: [...UNIVERSE],
        priority: 'SPY優先',
        maxConcurrent: MAX_CONCURRENT,
        holdDays: HOLD_DAYS,
        adx: `> ${ADX_MIN}`,
        macd: `> ${MACD_MIN}`,
      },
      goalsJa: ['件数>=100', 'Sharpe>0.8', 'MaxDD<15%', '2025依存低減'],
      sectionA_fixedDistFullPeriod: fixedDistGrid,
      sectionB_perYearRawSignalBestDist: perYearBestByYear,
      sectionC_perYearDistCombos: {
        totalCombos: perYearComboResults.length,
        meetsAllGoalsCount: goalPassers.length,
        top15ByGoalScore: perYearComboResults.slice(0, 15),
        bestLow2025AmongGoalPassers: goalPassersLow2025.slice(0, 10),
        recommended: goalPassersLow2025[0] ?? perYearComboResults[0],
      },
      baselineFixedDist3: baselineDist3,
      recommendationJa: (() => {
        const best = goalPassersLow2025[0];
        if (best) {
          return (
            `3条件達成かつ2025比率最小: ${best.label} — ` +
            `${best.tradeCount}件 Sharpe${best.sharpe} MaxDD${best.maxDrawdownPct}% ` +
            `年別${best.tradesByYear['2024']}/${best.tradesByYear['2025']}/${best.tradesByYear['2026']} ` +
            `比率${best.yearRatioPct['2024']}/${best.yearRatioPct['2025']}/${best.yearRatioPct['2026']}%`
          );
        }
        const g = perYearComboResults.find((r) => r.checks.sharpeOk && r.checks.maxDdOk);
        return g
          ? `全目標同時未達。参考: ${g.label} (${g.tradeCount}件 Sharpe${g.sharpe})`
          : '要条件緩和';
      })(),
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-hold25-per-year-dist');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'mode,dist24,dist25,dist26,trades,sharpe,maxDD,PF,t24,t25,t26,pct24,pct25,pct26,meetGoals',
      ...fixedDistGrid.map((r) =>
        [
          'fixed',
          r.distMax,
          r.distMax,
          r.distMax,
          r.tradeCount,
          r.sharpe ?? '',
          r.maxDrawdownPct ?? '',
          r.profitFactor ?? '',
          r.tradesByYear['2024'],
          r.tradesByYear['2025'],
          r.tradesByYear['2026'],
          r.yearRatioPct['2024'],
          r.yearRatioPct['2025'],
          r.yearRatioPct['2026'],
          r.checks.meetsAllGoals,
        ].join(','),
      ),
      ...perYearComboResults
        .filter((r) => r.checks.meetsAllGoals)
        .slice(0, 50)
        .map((r) =>
          [
            'perYear',
            r.dist2024,
            r.dist2025,
            r.dist2026,
            r.tradeCount,
            r.sharpe ?? '',
            r.maxDrawdownPct ?? '',
            r.profitFactor ?? '',
            r.tradesByYear['2024'],
            r.tradesByYear['2025'],
            r.tradesByYear['2026'],
            r.yearRatioPct['2024'],
            r.yearRatioPct['2025'],
            r.yearRatioPct['2026'],
            r.checks.meetsAllGoals,
          ].join(','),
        ),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'comparison.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== PER-YEAR DIST ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
