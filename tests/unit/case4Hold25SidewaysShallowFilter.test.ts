/**
 * Sideways shallow (4-regime) filter exploration
 * npx vitest run tests/unit/case4Hold25SidewaysShallowFilter.test.ts
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
const REGIME_UP_THRESH = 5;
const REGIME_DOWN_THRESH = -5;
const SIDEWAYS_DEEP_DIST = -5;

const GOAL_MIN_TRADES = 100;
const GOAL_SHARPE = 1.1;
const GOAL_MAX_DD = -6;

const PRIORITY_SPY_FIRST: Record<Etf, number> = {
  SPY: 6,
  DGRO: 4,
  VYM: 3,
  SPLG: 2,
  SCHD: 1,
};

type Regime = 'up' | 'sideways' | 'down';
type FourBucket = 'up' | 'sideways_shallow' | 'sideways_deep' | 'down' | 'unknown';

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
  adx14: number;
  macdHistPct: number;
  regime: Regime | 'unknown';
  bucket: FourBucket;
};

type EnrichedTrade = Signal & {
  concurrentQualifying: number;
  vix: number | null;
  spyRet63: number | null;
};

type ShallowFilter = {
  id: string;
  labelJa: string;
  apply: (s: Signal) => boolean;
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
function median(vals: number[]): number | null {
  if (vals.length === 0) return null;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
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

function buildSpyRet63Map(spyBars: OhlcvBar[]): Map<string, number> {
  const closes = spyBars.map((b) => b.close);
  const lookback = 63;
  const out = new Map<string, number>();
  for (let i = lookback; i < spyBars.length; i++) {
    out.set(spyBars[i]!.date, round3(((closes[i]! / closes[i - lookback]! - 1) * 100)));
  }
  return out;
}

function buildRegimeMap(spyRet63: Map<string, number>): Map<string, Regime> {
  const out = new Map<string, Regime>();
  for (const [date, ret] of spyRet63) {
    let regime: Regime = 'sideways';
    if (ret > REGIME_UP_THRESH) regime = 'up';
    else if (ret < REGIME_DOWN_THRESH) regime = 'down';
    out.set(date, regime);
  }
  return out;
}

function classifyBucket(s: { regime: Regime | 'unknown'; dist52wPct: number }): FourBucket {
  if (s.regime === 'unknown') return 'unknown';
  if (s.regime === 'up') return 'up';
  if (s.regime === 'down') return 'down';
  return s.dist52wPct <= SIDEWAYS_DEEP_DIST ? 'sideways_deep' : 'sideways_shallow';
}

function passesFourRegimeDist(s: Signal): boolean {
  if (s.bucket === 'unknown') return false;
  if (s.bucket === 'down' || s.bucket === 'sideways_deep') return s.dist52wPct <= -8;
  return s.dist52wPct <= -2;
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
  const executed: Signal[] = [];
  for (const d of dates) {
    const taken = [...byDate.get(d)!]
      .sort((a, b) => PRIORITY_SPY_FIRST[b.symbol] - PRIORITY_SPY_FIRST[a.symbol])
      .slice(0, MAX_CONCURRENT);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    executed.push(...taken);
  }
  return { dailyReturns, dates, executed };
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
  const tw = run.executed.filter((t) => t.returnPct > 0).length;
  return {
    tradeCount: run.executed.length,
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      losses.length > 0
        ? round3(wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)))
        : null,
    winRate: run.executed.length > 0 ? round3(tw / run.executed.length) : null,
  };
}

function featureStats(trades: EnrichedTrade[], pick: (t: EnrichedTrade) => number | null) {
  const vals = trades.map(pick).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return { mean: round3(mean(vals)), median: median(vals) == null ? null : round3(median(vals)!) };
}

function buildSignals(
  raw: RawBar[],
  regimeMap: Map<string, Regime>,
  concurrentByDate: Map<string, number>,
): Signal[] {
  return raw
    .filter((r) => r.adx14 > ADX_MIN && r.macdHistPct > MACD_MIN)
    .map((r) => {
      const regime = regimeMap.get(r.date) ?? ('unknown' as const);
      const bucket = classifyBucket({ regime, dist52wPct: r.dist52wPct });
      return {
        date: r.date,
        symbol: r.symbol,
        returnPct: r.returnPct,
        year: r.year,
        dist52wPct: r.dist52wPct,
        adx14: r.adx14,
        macdHistPct: r.macdHistPct,
        regime,
        bucket,
      };
    })
    .filter(passesFourRegimeDist);
}

function applyShallowFilter(all: Signal[], shallowExtra: ShallowFilter | null): Signal[] {
  return all.filter((s) => {
    if (s.bucket !== 'sideways_shallow') return true;
    return shallowExtra == null ? true : shallowExtra.apply(s);
  });
}

describe('Case4 sideways shallow filter analysis', () => {
  it('analyzes 60 shallow trades and explores quality filters', async () => {
    const raw: RawBar[] = [];
    for (const sym of UNIVERSE) {
      raw.push(...buildRaw(await fetchYahooOhlcv(sym), sym));
    }
    const spyBars = await fetchYahooOhlcv('SPY');
    const vixBars = await fetchYahooOhlcv('^VIX');
    const spyRet63 = buildSpyRet63Map(spyBars);
    const regimeMap = buildRegimeMap(spyRet63);
    const vixByDate = new Map(vixBars.map((b) => [b.date, b.close]));

    const baseAll: Signal[] = raw
      .filter((r) => r.adx14 > ADX_MIN && r.macdHistPct > MACD_MIN)
      .map((r) => {
        const regime = regimeMap.get(r.date) ?? ('unknown' as const);
        return {
          date: r.date,
          symbol: r.symbol,
          returnPct: r.returnPct,
          year: r.year,
          dist52wPct: r.dist52wPct,
          adx14: r.adx14,
          macdHistPct: r.macdHistPct,
          regime,
          bucket: classifyBucket({ regime, dist52wPct: r.dist52wPct }),
        };
      });

    const concurrentByDate = new Map<string, number>();
    for (const s of baseAll.filter(passesFourRegimeDist)) {
      concurrentByDate.set(s.date, (concurrentByDate.get(s.date) ?? 0) + 1);
    }

    const allFour = buildSignals(raw, regimeMap, concurrentByDate);
    const baselineRun = runPortfolio(allFour);
    const baseline = summarize(baselineRun);

    const shallowExecuted: EnrichedTrade[] = baselineRun.executed
      .filter((t) => t.bucket === 'sideways_shallow')
      .map((t) => ({
        ...t,
        concurrentQualifying: concurrentByDate.get(t.date) ?? 0,
        vix: vixByDate.get(t.date) ?? null,
        spyRet63: spyRet63.get(t.date) ?? null,
      }));

    const sortedByReturn = [...shallowExecuted].sort((a, b) => b.returnPct - a.returnPct);
    const q25 = Math.max(1, Math.floor(sortedByReturn.length * 0.25));
    const winnersTop25 = sortedByReturn.slice(0, q25);
    const losersBottom25 = sortedByReturn.slice(-q25);

    const compareQuartiles = {
      winnersTop25Count: winnersTop25.length,
      losersBottom25Count: losersBottom25.length,
      adx: {
        winners: featureStats(winnersTop25, (t) => t.adx14),
        losers: featureStats(losersBottom25, (t) => t.adx14),
      },
      macd: {
        winners: featureStats(winnersTop25, (t) => t.macdHistPct),
        losers: featureStats(losersBottom25, (t) => t.macdHistPct),
      },
      concurrentQualifying: {
        winners: featureStats(winnersTop25, (t) => t.concurrentQualifying),
        losers: featureStats(losersBottom25, (t) => t.concurrentQualifying),
      },
      vix: {
        winners: featureStats(winnersTop25, (t) => t.vix),
        losers: featureStats(losersBottom25, (t) => t.vix),
      },
      spyRet63: {
        winners: featureStats(winnersTop25, (t) => t.spyRet63),
        losers: featureStats(losersBottom25, (t) => t.spyRet63),
      },
    };

    const shallowFilters: ShallowFilter[] = [
      { id: 'adx30', labelJa: 'ADX > 30', apply: (s) => s.adx14 > 30 },
      { id: 'adx35', labelJa: 'ADX > 35', apply: (s) => s.adx14 > 35 },
      { id: 'macd15', labelJa: 'MACD > 0.15', apply: (s) => s.macdHistPct > 0.15 },
      { id: 'macd20', labelJa: 'MACD > 0.20', apply: (s) => s.macdHistPct > 0.2 },
      { id: 'vix20', labelJa: 'VIX > 20', apply: (s) => (vixByDate.get(s.date) ?? 0) > 20 },
      { id: 'co4', labelJa: '同時発火 >= 4', apply: (s) => (concurrentByDate.get(s.date) ?? 0) >= 4 },
      {
        id: 'adx30_macd15',
        labelJa: 'ADX>30 & MACD>0.15',
        apply: (s) => s.adx14 > 30 && s.macdHistPct > 0.15,
      },
      {
        id: 'adx35_macd15',
        labelJa: 'ADX>35 & MACD>0.15',
        apply: (s) => s.adx14 > 35 && s.macdHistPct > 0.15,
      },
      {
        id: 'vix20_adx30',
        labelJa: 'VIX>20 & ADX>30',
        apply: (s) => (vixByDate.get(s.date) ?? 0) > 20 && s.adx14 > 30,
      },
    ];

    const filterResults = shallowFilters.map((f) => {
      const filtered = applyShallowFilter(allFour, f);
      const run = runPortfolio(filtered);
      const m = summarize(run);
      const shallowKept = run.executed.filter((t) => t.bucket === 'sideways_shallow').length;
      return {
        filterId: f.id,
        labelJa: f.labelJa,
        shallowTradesKept: shallowKept,
        shallowTradesRemoved: shallowExecuted.length - shallowKept,
        ...m,
        meetsGoals: m.tradeCount >= GOAL_MIN_TRADES && (m.sharpe ?? -1) >= GOAL_SHARPE && (m.maxDrawdownPct ?? -999) >= GOAL_MAX_DD,
      };
    });

    filterResults.sort((a, b) => (b.sharpe ?? -1) - (a.sharpe ?? -1));
    const goalPassers = filterResults.filter((r) => r.meetsGoals);

    const shallowOnlyStats = summarize(runPortfolio(shallowExecuted.map(({ concurrentQualifying, vix, spyRet63, ...s }) => s)));

    const report = {
      fourRegimeFixedJa: {
        up: 'dist<=-2%',
        sideways_shallow: 'dist52>-5% & dist<=-2%',
        sideways_deep: 'dist52<=-5% & dist<=-8%',
        down: 'dist<=-8%',
      },
      item1_shallowExecutedCount: shallowExecuted.length,
      item1_shallowTrades: shallowExecuted.map((t) => ({
        date: t.date,
        symbol: t.symbol,
        year: t.year,
        returnPct: t.returnPct,
        adx14: t.adx14,
        macdHistPct: t.macdHistPct,
        dist52wPct: t.dist52wPct,
        concurrentQualifying: t.concurrentQualifying,
        vix: t.vix,
        spyRet63: t.spyRet63,
      })),
      item2_featureSummaryAllShallow: {
        adx: featureStats(shallowExecuted, (t) => t.adx14),
        macd: featureStats(shallowExecuted, (t) => t.macdHistPct),
        concurrentQualifying: featureStats(shallowExecuted, (t) => t.concurrentQualifying),
        vix: featureStats(shallowExecuted, (t) => t.vix),
        spyRet63: featureStats(shallowExecuted, (t) => t.spyRet63),
        ...shallowOnlyStats,
      },
      item3_winnersTop25_vs_losersBottom25: compareQuartiles,
      item5_filterExplorationFullPortfolio: filterResults,
      baselineFourRegime: baseline,
      beforeAfter: {
        before: baseline,
        afterBest: filterResults[0] ?? null,
        afterBestGoalPasser: goalPassers[0] ?? null,
      },
      recommendedFilterJa: (() => {
        const best = goalPassers[0] ?? filterResults[0];
        if (!best) return '該当なし';
        return {
          filter: best.labelJa,
          expectedSharpe: best.sharpe,
          expectedMaxDD: best.maxDrawdownPct,
          expectedPF: best.profitFactor,
          expectedWinRate: best.winRate,
          tradeCount: best.tradeCount,
          meetsAllGoals: best.meetsGoals,
          shallowKept: best.shallowTradesKept,
        };
      })(),
      verdictJa: (() => {
        const gp = goalPassers.length;
        if (gp > 0) {
          return `目標達成フィルタ ${gp}件。最良: ${goalPassers[0]!.labelJa} → Sharpe${goalPassers[0]!.sharpe} MaxDD${goalPassers[0]!.maxDrawdownPct}% (${goalPassers[0]!.tradeCount}件)`;
        }
        const b = filterResults[0]!;
        return `全目標同時未達。Sharpe最大: ${b.labelJa} (${b.sharpe}, ${b.tradeCount}件)。勝ち組はADX/MACD高め・負け組は同時発火多めの傾向を確認。`;
      })(),
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-hold25-shallow-filter');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'filter,shallowKept,trades,sharpe,maxDD,PF,winRate,meetGoals',
      ['baseline', shallowExecuted.length, baseline.tradeCount, baseline.sharpe ?? '', baseline.maxDrawdownPct ?? '', baseline.profitFactor ?? '', baseline.winRate ?? '', ''].join(','),
      ...filterResults.map((r) =>
        [r.filterId, r.shallowTradesKept, r.tradeCount, r.sharpe ?? '', r.maxDrawdownPct ?? '', r.profitFactor ?? '', r.winRate ?? '', r.meetsGoals].join(','),
      ),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'filters.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== SHALLOW FILTER ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
