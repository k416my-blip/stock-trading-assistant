/**
 * Sideways regime deep analysis — why regime Sharpe < year-based A
 * npx vitest run tests/unit/case4Hold25SidewaysRegimeAnalysis.test.ts
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
const SIDEWAYS_DEEP_DIST = -5;

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

function metricsSubset(
  run: ReturnType<typeof runPortfolio>,
  yearFilter: ((y: string) => boolean) | null = null,
) {
  const idxs =
    yearFilter == null
      ? run.dates.map((_, i) => i)
      : run.dates.map((d, i) => (yearFilter(d.slice(0, 4)) ? i : -1)).filter((i) => i >= 0);
  const dr = idxs.map((i) => run.dailyReturns[i]!);
  const trades =
    yearFilter == null ? run.executed : run.executed.filter((t) => yearFilter(t.year));

  if (dr.length === 0) {
    return {
      tradeCount: trades.length,
      sharpe: null as number | null,
      maxDrawdownPct: null as number | null,
      profitFactor: null as number | null,
      winRate: trades.length > 0 ? round3(trades.filter((t) => t.returnPct > 0).length / trades.length) : null,
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
  return {
    tradeCount: trades.length,
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      losses.length > 0
        ? round3(wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)))
        : null,
    winRate: trades.length > 0 ? round3(trades.filter((t) => t.returnPct > 0).length / trades.length) : null,
  };
}

function classifyFourRegime(s: Signal): 'up' | 'sideways_shallow' | 'sideways_deep' | 'down' | 'unknown' {
  if (s.regime === 'unknown') return 'unknown';
  if (s.regime === 'up') return 'up';
  if (s.regime === 'down') return 'down';
  return s.dist52wPct <= SIDEWAYS_DEEP_DIST ? 'sideways_deep' : 'sideways_shallow';
}

function filterByDistPolicy(
  all: Signal[],
  policy: 'sideways_only' | 'regime3' | 'regime4' | 'yearA',
  distMax?: number,
): Signal[] {
  if (policy === 'sideways_only' && distMax != null) {
    return all.filter((s) => s.regime === 'sideways' && s.dist52wPct <= distMax);
  }
  if (policy === 'yearA') {
    return all.filter((s) => s.dist52wPct <= (YEAR_DIST_A[s.year as keyof typeof YEAR_DIST_A] ?? -999));
  }
  if (policy === 'regime3') {
    return all.filter((s) => {
      if (s.regime === 'unknown') return false;
      if (s.regime === 'down') return s.dist52wPct <= -8;
      return s.dist52wPct <= -2;
    });
  }
  if (policy === 'regime4') {
    return all.filter((s) => {
      const r4 = classifyFourRegime(s);
      if (r4 === 'unknown') return false;
      if (r4 === 'down' || r4 === 'sideways_deep') return s.dist52wPct <= -8;
      return s.dist52wPct <= -2;
    });
  }
  return all;
}

describe('Case4 sideways regime deep analysis', () => {
  it('compares dist grid in sideways regime and evaluates 4-regime split', async () => {
    const raw: RawBar[] = [];
    for (const sym of UNIVERSE) {
      raw.push(...buildRaw(await fetchYahooOhlcv(sym), sym));
    }
    const regimeMap = buildSpyRegimeMap(await fetchYahooOhlcv('SPY'));

    const all: Signal[] = raw
      .filter((r) => r.adx14 > ADX_MIN && r.macdHistPct > MACD_MIN)
      .map((r) => ({
        date: r.date,
        symbol: r.symbol,
        returnPct: r.returnPct,
        year: r.year,
        dist52wPct: r.dist52wPct,
        regime: regimeMap.get(r.date) ?? ('unknown' as const),
      }));

    const sidewaysOnly = all.filter((s) => s.regime === 'sideways');
    const sidewaysRawCount = sidewaysOnly.length;

    const item2_distGridSidewaysOnly = DIST_GRID.map((distMax) => {
      const run = runPortfolio(sidewaysOnly.filter((s) => s.dist52wPct <= distMax));
      const full = metricsSubset(run);
      const y2025 = metricsSubset(run, (y) => y === '2025');
      return {
        distMax,
        ...full,
        tradesByYear: {
          '2024': run.executed.filter((t) => t.year === '2024').length,
          '2025': run.executed.filter((t) => t.year === '2025').length,
          '2026': run.executed.filter((t) => t.year === '2026').length,
        },
        y2025Only: y2025,
      };
    });

    const item4_y2025SidewaysDistGrid = item2_distGridSidewaysOnly.map((r) => ({
      distMax: r.distMax,
      tradeCount: r.y2025Only.tradeCount,
      sharpe: r.y2025Only.sharpe,
      maxDrawdownPct: r.y2025Only.maxDrawdownPct,
      profitFactor: r.y2025Only.profitFactor,
      winRate: r.y2025Only.winRate,
    }));

    const best2025SidewaysSharpe = [...item4_y2025SidewaysDistGrid].sort(
      (a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999),
    )[0]!;

    const yearARun = runPortfolio(filterByDistPolicy(all, 'yearA'));
    const regime3Run = runPortfolio(filterByDistPolicy(all, 'regime3'));
    const regime4Run = runPortfolio(filterByDistPolicy(all, 'regime4'));

    const yearA = metricsSubset(yearARun);
    const regime3 = metricsSubset(regime3Run);
    const regime4 = metricsSubset(regime4Run);

    const sidewaysExecutedRegime3 = regime3Run.executed.filter((t) => t.regime === 'sideways');
    const sidewaysExecutedYearA = yearARun.executed.filter((t) => t.regime === 'sideways');

    const item5_explanation = {
      yearA_full: yearA,
      regime3_full: regime3,
      sharpeGap: round3((yearA.sharpe ?? 0) - (regime3.sharpe ?? 0)),
      sidewaysTradesRegime3_dist2: sidewaysExecutedRegime3.length,
      sidewaysTradesYearA: sidewaysExecutedYearA.length,
      sideways2025_regime3: sidewaysExecutedRegime3.filter((t) => t.year === '2025').length,
      sideways2025_yearA: sidewaysExecutedYearA.filter((t) => t.year === '2025').length,
      meanReturnSideways2025_regime3_dist2: round3(
        mean(sidewaysExecutedRegime3.filter((t) => t.year === '2025').map((t) => t.returnPct)),
      ),
      meanReturnSideways2025_yearA: round3(
        mean(sidewaysExecutedYearA.filter((t) => t.year === '2025').map((t) => t.returnPct)),
      ),
      shallowLosers2025: sidewaysExecutedRegime3
        .filter((t) => t.year === '2025' && t.returnPct <= 0 && t.dist52wPct > -5)
        .length,
      explanationJa: [
        `レジーム版は2025横ばいでdist<=-2%を許可→${sidewaysExecutedRegime3.filter((t) => t.year === '2025').length}件`,
        `年別Aは2025全年<=-8%→横ばいでも${sidewaysExecutedYearA.filter((t) => t.year === '2025').length}件のみ`,
        `2025横ばいでSharpe最大distは<=${best2025SidewaysSharpe.distMax}%（Sharpe${best2025SidewaysSharpe.sharpe}）`,
        `浅押し(dist>-5%)の2025横ばい負けトレード: ${sidewaysExecutedRegime3.filter((t) => t.year === '2025' && t.returnPct <= 0 && t.dist52wPct > -5).length}件がレジーム版のドレッグ`,
      ].join(' '),
    };

    const fourRegimeBreakdown = (['up', 'sideways_shallow', 'sideways_deep', 'down'] as const).map((bucket) => {
      const sigs = all.filter((s) => classifyFourRegime(s) === bucket);
      const run = runPortfolio(
        sigs.filter((s) => {
          if (bucket === 'down' || bucket === 'sideways_deep') return s.dist52wPct <= -8;
          return s.dist52wPct <= -2;
        }),
      );
      return { bucket, rawSignals: sigs.length, ...metricsSubset(run) };
    });

    const report = {
      fixedStrategyJa: {
        universe: [...UNIVERSE],
        priority: 'SPY優先',
        maxConcurrent: MAX_CONCURRENT,
        holdDays: HOLD_DAYS,
        sidewaysDefinition: `SPY63d ${REGIME_DOWN_THRESH}%〜+${REGIME_UP_THRESH}%`,
        fourRegimeSplit: `横ばいを dist52<=${SIDEWAYS_DEEP_DIST}%=深押し / それより浅い=浅押し`,
      },
      item1_sidewaysRawSignalCount: sidewaysRawCount,
      item2_sidewaysDistGrid: item2_distGridSidewaysOnly,
      item4_y2025SidewaysOnly: item4_y2025SidewaysDistGrid,
      item5_yearA_vs_regime3_gap: item5_explanation,
      item6_fourRegimeEvaluation: {
        ruleJa: {
          up: 'dist<=-2%',
          sideways_shallow: '横ばいかつdist52>-5% → dist<=-2%',
          sideways_deep: '横ばいかつdist52<=-5% → dist<=-8%',
          down: 'dist<=-8%',
        },
        bucketBreakdown: fourRegimeBreakdown,
        comparison: {
          yearA,
          regime3: { rule: 'up/side=-2%, down=-8%', ...regime3 },
          regime4: {
            rule: 'up/shallow=-2%, deep/down=-8%',
            distSplitAt: SIDEWAYS_DEEP_DIST,
            ...regime4,
          },
        },
        fourRegimeEffective: (regime4.sharpe ?? 0) >= (regime3.sharpe ?? 0) && (regime4.sharpe ?? 0) >= (yearA.sharpe ?? 0) * 0.95,
      },
      recommendedRuleJa: {
        rule: '4レジーム: 上昇<=-2% / 横ばい浅<=-2% / 横ばい深<=-8% / 下落<=-8%',
        sharpe: regime4.sharpe,
        maxDD: regime4.maxDrawdownPct,
        PF: regime4.profitFactor,
        vsYearA: { sharpeDelta: round3((regime4.sharpe ?? 0) - (yearA.sharpe ?? 0)) },
        vsRegime3: { sharpeDelta: round3((regime4.sharpe ?? 0) - (regime3.sharpe ?? 0)) },
      },
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-hold25-sideways-analysis');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'scope,dist,trades,sharpe,maxDD,PF,winRate,t24,t25,t26',
      ...item2_distGridSidewaysOnly.map((r) =>
        ['sideways_all', r.distMax, r.tradeCount, r.sharpe ?? '', r.maxDrawdownPct ?? '', r.profitFactor ?? '', r.winRate ?? '', r.tradesByYear['2024'], r.tradesByYear['2025'], r.tradesByYear['2026']].join(','),
      ),
      ...item4_y2025SidewaysDistGrid.map((r) =>
        ['sideways_2025', r.distMax, r.tradeCount, r.sharpe ?? '', r.maxDrawdownPct ?? '', r.profitFactor ?? '', r.winRate ?? '', '', '', ''].join(','),
      ),
      ['model', 'rule', regime4.tradeCount, regime4.sharpe ?? '', regime4.maxDrawdownPct ?? '', regime4.profitFactor ?? '', regime4.winRate ?? '', '', '', ''].join(','),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'comparison.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== SIDEWAYS ANALYSIS ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
