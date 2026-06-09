/**
 * Regime-based dist — SPY 63d return replaces year-based dist
 * npx vitest run tests/unit/case4Hold25RegimeDistOptimization.test.ts
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

const ADX_MIN = 25;
const MACD_MIN = 0.1;
const DIST_GRID = [-2, -3, -4, -5, -6, -7, -8] as const;

const REGIME_UP_THRESH = 5;
const REGIME_DOWN_THRESH = -5;

const YEAR_DIST_A = { '2024': -2, '2025': -8, '2026': -2 };

const PRIORITY_SPY_FIRST: Record<Etf, number> = {
  SPY: 6,
  DGRO: 4,
  VYM: 3,
  SPLG: 2,
  SCHD: 1,
};

type Regime = 'up' | 'sideways' | 'down';

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
  dist52wPct: number;
  regime: Regime | 'unknown';
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

function buildSpyRegimeMap(spyBars: OhlcvBar[]): Map<string, Regime> {
  const closes = spyBars.map((b) => b.close);
  const lookback = 63;
  const out = new Map<string, Regime>();
  for (let i = lookback; i < spyBars.length; i++) {
    const ret63 = (closes[i]! / closes[i - lookback]! - 1) * 100;
    let regime: Regime = 'sideways';
    if (ret63 > REGIME_UP_THRESH) regime = 'up';
    else if (ret63 < REGIME_DOWN_THRESH) regime = 'down';
    out.set(spyBars[i]!.date, regime);
  }
  return out;
}

function attachRegime(signals: Signal[], regimeMap: Map<string, Regime>): Signal[] {
  return signals.map((s) => ({
    ...s,
    regime: regimeMap.get(s.date) ?? 'unknown',
  }));
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

function summarize(run: ReturnType<typeof runPortfolio>) {
  const dr = run.dailyReturns;
  if (dr.length === 0) {
    return {
      tradeCount: 0,
      sharpe: null as number | null,
      maxDrawdownPct: null as number | null,
      profitFactor: null as number | null,
      winRate: null as number | null,
      activeDays: 0,
    };
  }
  const wins = dr.filter((r) => r > 0);
  const losses = dr.filter((r) => r < 0);
  const mu = mean(dr);
  const sigma = std(dr);
  let equity = INITIAL_CAPITAL_USD;
  let peak = INITIAL_CAPITAL_USD;
  let maxDd = 0;
  for (const r of dr) {
    equity += (INITIAL_CAPITAL_USD * r) / 100;
    if (equity > peak) peak = equity;
    maxDd = Math.min(maxDd, equity / peak - 1);
  }
  const tradeWins = run.executed.filter((t) => t.returnPct > 0).length;
  return {
    tradeCount: run.executed.length,
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      losses.length > 0
        ? round3(wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)))
        : null,
    winRate: run.executed.length > 0 ? round3(tradeWins / run.executed.length) : null,
    activeDays: dr.length,
  };
}

function filterYearDist(signals: Signal[], distByYear: Record<string, number>): Signal[] {
  return signals.filter((s) => s.dist52wPct <= (distByYear[s.year] ?? -999));
}

function filterRegimeDist(signals: Signal[], distByRegime: Record<Regime, number>): Signal[] {
  return signals.filter((s) => s.regime !== 'unknown' && s.dist52wPct <= distByRegime[s.regime as Regime]);
}

function regimeGridSearch(signals: Signal[], regime: Regime) {
  const rows = DIST_GRID.map((distMax) => {
    const subset = signals.filter((s) => s.regime === regime && s.dist52wPct <= distMax);
    const run = runPortfolio(subset);
    return { distMax, regime, ...summarize(run) };
  });
  rows.sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));
  return { regime, grid: rows, bestBySharpe: rows[0]! };
}

describe('Case4 regime-based dist optimization', () => {
  it('explores per-regime dist and compares to year-based A', async () => {
    const raw: RawBar[] = [];
    for (const sym of UNIVERSE) {
      raw.push(...buildRaw(await fetchYahooOhlcv(sym), sym));
    }
    const regimeMap = buildSpyRegimeMap(await fetchYahooOhlcv('SPY'));

    const base: Signal[] = raw
      .filter((r) => r.adx14 > ADX_MIN && r.macdHistPct > MACD_MIN)
      .map((r) => ({
        date: r.date,
        symbol: r.symbol,
        returnPct: r.returnPct,
        year: r.year,
        dist52wPct: r.dist52wPct,
        regime: 'unknown' as const,
      }));

    const all = attachRegime(base, regimeMap);

    const perRegimeSearch = (['up', 'sideways', 'down'] as Regime[]).map((r) => regimeGridSearch(all, r));

    const adoptedDistByRegime = Object.fromEntries(
      perRegimeSearch.map((r) => [r.regime, r.bestBySharpe.distMax]),
    ) as Record<Regime, number>;

    const regimeOptimalRun = runPortfolio(filterRegimeDist(all, adoptedDistByRegime));
    const regimeOptimal = {
      distByRegime: adoptedDistByRegime,
      ...summarize(regimeOptimalRun),
      tradesByRegime: Object.fromEntries(
        (['up', 'sideways', 'down'] as Regime[]).map((r) => [
          r,
          regimeOptimalRun.executed.filter((t) => t.regime === r).length,
        ]),
      ),
      tradesByYear: Object.fromEntries(
        ['2024', '2025', '2026'].map((y) => [y, regimeOptimalRun.executed.filter((t) => t.year === y).length]),
      ),
    };

    const yearBasedRun = runPortfolio(filterYearDist(all, YEAR_DIST_A));
    const yearBasedA = {
      distByYear: YEAR_DIST_A,
      ...summarize(yearBasedRun),
      tradesByYear: Object.fromEntries(
        ['2024', '2025', '2026'].map((y) => [y, yearBasedRun.executed.filter((t) => t.year === y).length]),
      ),
    };

    const heuristicRegimeDist: Record<Regime, number> = { up: -2, sideways: -2, down: -8 };
    const heuristicRun = runPortfolio(filterRegimeDist(all, heuristicRegimeDist));
    const heuristic = {
      distByRegime: heuristicRegimeDist,
      labelJa: 'ヒューリスティック up/side=-2% down=-8%（年別Aの意図をレジームへ写像）',
      ...summarize(heuristicRun),
      tradesByYear: Object.fromEntries(
        ['2024', '2025', '2026'].map((y) => [y, heuristicRun.executed.filter((t) => t.year === y).length]),
      ),
    };

    const regimeMixByYear = Object.fromEntries(
      ['2024', '2025', '2026'].map((y) => {
        const ys = all.filter((s) => s.year === y && s.regime !== 'unknown');
        const total = ys.length;
        const mix = Object.fromEntries(
          (['up', 'sideways', 'down'] as Regime[]).map((r) => [
            r,
            total > 0 ? round3((ys.filter((s) => s.regime === r).length / total) * 100) : 0,
          ]),
        );
        return [y, { rawSignalCount: total, regimePct: mix }];
      }),
    );

    const effectiveDistOnExecuted = (executed: Signal[]) => {
      const byRegime = Object.fromEntries(
        (['up', 'sideways', 'down'] as Regime[]).map((r) => {
          const t = executed.filter((s) => s.regime === r);
          return [
            r,
            t.length > 0
              ? { count: t.length, meanDist52: round3(mean(t.map((x) => x.dist52wPct))) }
              : { count: 0, meanDist52: null },
          ];
        }),
      );
      return byRegime;
    };

    const report = {
      fixedStrategyJa: {
        universe: [...UNIVERSE],
        priority: 'SPY優先',
        maxConcurrent: MAX_CONCURRENT,
        holdDays: HOLD_DAYS,
        adx: `> ${ADX_MIN}`,
        macd: `> ${MACD_MIN}`,
      },
      regimeDefinitionJa: {
        spy63dReturn: `>+${REGIME_UP_THRESH}%=上昇 / ${REGIME_DOWN_THRESH}%〜+${REGIME_UP_THRESH}%=横ばい / <${REGIME_DOWN_THRESH}%=下落`,
      },
      perRegimeDistGrid: perRegimeSearch,
      adoptedDistByRegimeSharpeOptimal: adoptedDistByRegime,
      result_regimeSharpeOptimal: regimeOptimal,
      result_heuristicRegimeMapping: heuristic,
      baseline_yearBasedA: yearBasedA,
      regimeMixByYearRawSignals: regimeMixByYear,
      effectiveDistExecuted: {
        yearBasedA: effectiveDistOnExecuted(yearBasedRun.executed),
        regimeSharpeOptimal: effectiveDistOnExecuted(regimeOptimalRun.executed),
        heuristicRegime: effectiveDistOnExecuted(heuristicRun.executed),
      },
      conversionVerdictJa: (() => {
        const h = heuristic;
        const y = yearBasedA;
        const r = regimeOptimal;
        const parts = [
          `年別A: ${y.tradeCount}件 Sharpe${y.sharpe} MaxDD${y.maxDrawdownPct}%`,
          `レジーム最適(Sharpe): up${adoptedDistByRegime.up}% side${adoptedDistByRegime.sideways}% down${adoptedDistByRegime.down}% → ${r.tradeCount}件 Sharpe${r.sharpe}`,
          `ヒューリスティック up/side=-2 down=-8 → ${h.tradeCount}件 Sharpe${h.sharpe} MaxDD${h.maxDrawdownPct}%`,
        ];
        if (Math.abs((h.tradeCount ?? 0) - y.tradeCount) <= 15 && (h.sharpe ?? 0) >= (y.sharpe ?? 0) * 0.9) {
          parts.push('結論: 年別Aを up/side=-2・down=-8 のレジームルールへ変換可能（近似再現）');
        } else if ((r.sharpe ?? 0) >= (y.sharpe ?? 0)) {
          parts.push('結論: レジーム別Sharpe最適distが年別A以上 — 市場状態依存への移行は有望');
        } else {
          parts.push('結論: 完全な写像には追加調整が必要');
        }
        return parts.join('。');
      })(),
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-hold25-regime-dist');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'model,distRule,trades,sharpe,maxDD,PF,winRate,t24,t25,t26,upDist,sideDist,downDist',
      [
        'yearBasedA',
        '24:-2/25:-8/26:-2',
        yearBasedA.tradeCount,
        yearBasedA.sharpe ?? '',
        yearBasedA.maxDrawdownPct ?? '',
        yearBasedA.profitFactor ?? '',
        yearBasedA.winRate ?? '',
        yearBasedA.tradesByYear['2024'],
        yearBasedA.tradesByYear['2025'],
        yearBasedA.tradesByYear['2026'],
        '',
        '',
        '',
      ].join(','),
      [
        'regimeSharpeOpt',
        `up:${adoptedDistByRegime.up}/side:${adoptedDistByRegime.sideways}/down:${adoptedDistByRegime.down}`,
        regimeOptimal.tradeCount,
        regimeOptimal.sharpe ?? '',
        regimeOptimal.maxDrawdownPct ?? '',
        regimeOptimal.profitFactor ?? '',
        regimeOptimal.winRate ?? '',
        regimeOptimal.tradesByYear['2024'],
        regimeOptimal.tradesByYear['2025'],
        regimeOptimal.tradesByYear['2026'],
        adoptedDistByRegime.up,
        adoptedDistByRegime.sideways,
        adoptedDistByRegime.down,
      ].join(','),
      [
        'heuristic',
        'up:-2/side:-2/down:-8',
        heuristic.tradeCount,
        heuristic.sharpe ?? '',
        heuristic.maxDrawdownPct ?? '',
        heuristic.profitFactor ?? '',
        heuristic.winRate ?? '',
        heuristic.tradesByYear['2024'],
        heuristic.tradesByYear['2025'],
        heuristic.tradesByYear['2026'],
        -2,
        -2,
        -8,
      ].join(','),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'comparison.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== REGIME DIST ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
