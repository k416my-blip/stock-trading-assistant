/**
 * Final 4-regime rule — TP/SL exit optimization (max hold 25d)
 * npx vitest run tests/unit/case4Hold25FinalExitOptimization.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const UNIVERSE = ['SCHD', 'SPY', 'VYM', 'DGRO', 'SPLG'] as const;
type Etf = (typeof UNIVERSE)[number];

const MAX_CONCURRENT = 3;
const HOLD_DAYS = 25;
const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';

const ADX_MIN = 25;
const MACD_MIN = 0.1;
const SHALLOW_ADX_MIN = 30;
const SHALLOW_MACD_MIN = 0.15;

const REGIME_UP_THRESH = 5;
const REGIME_DOWN_THRESH = -5;
const SIDEWAYS_DEEP_DIST = -5;

const TP_GRID = [3, 5, 7, 10, 15] as const;
const SL_GRID = [3, 5, 7, 10, 15] as const;

const GOAL_SHARPE = 1.1;
const GOAL_MAX_DD = -5;
const GOAL_MIN_TRADES = 100;

const BASELINE = {
  tradeCount: 102,
  sharpe: 1.1,
  maxDrawdownPct: -2.66,
  profitFactor: 25.33,
  winRate: 0.922,
};

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

type SignalCandidate = {
  date: string;
  year: string;
  symbol: Etf;
  signalIdx: number;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
  bucket: FourBucket;
};

type Signal = {
  date: string;
  symbol: Etf;
  returnPct: number;
  year: string;
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

function classifyBucket(regime: Regime | 'unknown', dist52: number): FourBucket {
  if (regime === 'unknown') return 'unknown';
  if (regime === 'up') return 'up';
  if (regime === 'down') return 'down';
  return dist52 <= SIDEWAYS_DEEP_DIST ? 'sideways_deep' : 'sideways_shallow';
}

function passesFinalRule(s: { bucket: FourBucket; dist52wPct: number; adx14: number; macdHistPct: number }): boolean {
  if (s.bucket === 'unknown') return false;
  if (s.bucket === 'down' || s.bucket === 'sideways_deep') return s.dist52wPct <= -8;
  if (s.bucket === 'sideways_shallow') {
    return s.dist52wPct <= -2 && s.dist52wPct > SIDEWAYS_DEEP_DIST && s.adx14 > SHALLOW_ADX_MIN && s.macdHistPct > SHALLOW_MACD_MIN;
  }
  return s.dist52wPct <= -2;
}

function buildCandidates(bars: OhlcvBar[], symbol: Etf, regimeMap: Map<string, Regime>): SignalCandidate[] {
  const closes = bars.map((b) => b.close);
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1);
    let v = arr[0]!;
    for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
    return v;
  };
  const out: SignalCandidate[] = [];
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
    if (adx <= ADX_MIN || macd <= MACD_MIN) continue;
    const regime = regimeMap.get(date) ?? ('unknown' as const);
    const bucket = classifyBucket(regime, dist52);
    const row = {
      date,
      year: date.slice(0, 4),
      symbol,
      signalIdx: i,
      adx14: round3(adx),
      macdHistPct: round3(macd),
      dist52wPct: round3(dist52),
      bucket,
    };
    if (!passesFinalRule(row)) continue;
    out.push(row);
  }
  return out;
}

function simulateExit(
  bars: OhlcvBar[],
  signalIdx: number,
  takeProfitPct: number | null,
  stopLossPct: number | null,
): number | null {
  const entryIdx = signalIdx + 1;
  const lastIdx = Math.min(signalIdx + HOLD_DAYS, bars.length - 1);
  if (entryIdx >= bars.length || lastIdx <= entryIdx) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;

  const stopPrice = stopLossPct != null ? entry * (1 - stopLossPct / 100) : null;
  const targetPrice = takeProfitPct != null ? entry * (1 + takeProfitPct / 100) : null;

  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = bars[i]!;
    if (stopPrice != null && bar.low <= stopPrice) {
      return round3(((stopPrice / entry - 1) * 100));
    }
    if (targetPrice != null && bar.high >= targetPrice) {
      return round3(takeProfitPct!);
    }
  }
  return round3(((bars[lastIdx]!.close / entry - 1) * 100));
}

function runPortfolio(signals: Signal[]) {
  const byDate = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const dailyReturns: number[] = [];
  const executed: Signal[] = [];
  for (const d of [...byDate.keys()].sort()) {
    const taken = [...byDate.get(d)!]
      .sort((a, b) => PRIORITY_SPY_FIRST[b.symbol] - PRIORITY_SPY_FIRST[a.symbol])
      .slice(0, MAX_CONCURRENT);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    executed.push(...taken);
  }
  return { dailyReturns, executed };
}

function evaluate(signals: Signal[]) {
  const run = runPortfolio(signals);
  const dr = run.dailyReturns;
  const trades = run.executed;
  const wins = trades.filter((t) => t.returnPct > 0);
  const losses = trades.filter((t) => t.returnPct < 0);

  if (dr.length === 0) {
    return {
      tradeCount: 0,
      sharpe: null as number | null,
      maxDrawdownPct: null as number | null,
      profitFactor: null as number | null,
      winRate: null as number | null,
      avgWinPct: null as number | null,
      avgLossPct: null as number | null,
      meetsTripleGoal: false,
    };
  }

  const drWins = dr.filter((r) => r > 0);
  const drLosses = dr.filter((r) => r < 0);
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
  const sharpe = sigma > 1e-9 ? round3(mu / sigma) : null;
  const maxDrawdownPct = round2(maxDd * 100);

  return {
    tradeCount: trades.length,
    sharpe,
    maxDrawdownPct,
    profitFactor:
      drLosses.length > 0
        ? round3(drWins.reduce((a, b) => a + b, 0) / Math.abs(drLosses.reduce((a, b) => a + b, 0)))
        : null,
    winRate: trades.length > 0 ? round3(wins.length / trades.length) : null,
    avgWinPct: wins.length > 0 ? round3(mean(wins.map((t) => t.returnPct))) : null,
    avgLossPct: losses.length > 0 ? round3(mean(losses.map((t) => t.returnPct))) : null,
    meetsTripleGoal:
      trades.length >= GOAL_MIN_TRADES && (sharpe ?? -1) > GOAL_SHARPE && maxDrawdownPct >= GOAL_MAX_DD,
  };
}

type ExitConfig = {
  id: string;
  labelJa: string;
  tpPct: number | null;
  slPct: number | null;
  category: 'baseline' | 'tp_only' | 'sl_only' | 'tp_sl_grid';
};

describe('Case4 final rule exit optimization', () => {
  it('explores TP/SL grid vs 25d baseline', async () => {
    const ohlcv = new Map<Etf, OhlcvBar[]>();
    for (const sym of UNIVERSE) {
      ohlcv.set(sym, await fetchYahooOhlcv(sym));
    }
    const regimeMap = buildSpyRegimeMap(ohlcv.get('SPY')!);

    const candidates: SignalCandidate[] = [];
    for (const sym of UNIVERSE) {
      candidates.push(...buildCandidates(ohlcv.get(sym)!, sym, regimeMap));
    }

    const configs: ExitConfig[] = [
      { id: 'baseline', labelJa: '利確損切りなし（25日終値）', tpPct: null, slPct: null, category: 'baseline' },
      ...TP_GRID.map((tp) => ({
        id: `tp${tp}`,
        labelJa: `利確+${tp}%のみ`,
        tpPct: tp,
        slPct: null as number | null,
        category: 'tp_only' as const,
      })),
      ...SL_GRID.map((sl) => ({
        id: `sl${sl}`,
        labelJa: `損切り-${sl}%のみ`,
        tpPct: null as number | null,
        slPct: sl,
        category: 'sl_only' as const,
      })),
      ...TP_GRID.flatMap((tp) =>
        SL_GRID.map((sl) => ({
          id: `tp${tp}_sl${sl}`,
          labelJa: `TP+${tp}% / SL-${sl}%`,
          tpPct: tp,
          slPct: sl,
          category: 'tp_sl_grid' as const,
        })),
      ),
    ];

    const results = configs.map((cfg) => {
      const signals: Signal[] = [];
      for (const c of candidates) {
        const ret = simulateExit(ohlcv.get(c.symbol)!, c.signalIdx, cfg.tpPct, cfg.slPct);
        if (ret == null) continue;
        signals.push({ date: c.date, symbol: c.symbol, returnPct: ret, year: c.year });
      }
      return { ...cfg, ...evaluate(signals) };
    });

    const ranked = [...results].sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));
    ranked.forEach((r, i) => {
      (r as { rank: number }).rank = i + 1;
    });

    const baseline = results.find((r) => r.id === 'baseline')!;
    const sharpeMax = ranked[0]!;
    const tripleGoalPassers = results.filter((r) => r.meetsTripleGoal);
    const top10 = ranked.slice(0, 10);

    const bestGoal = tripleGoalPassers.sort((a, b) => (b.sharpe ?? -1) - (a.sharpe ?? -1))[0];

    const diffBaseline = (r: (typeof results)[number]) => ({
      tradeCountDelta: r.tradeCount - baseline.tradeCount,
      sharpeDelta: r.sharpe != null && baseline.sharpe != null ? round3(r.sharpe - baseline.sharpe) : null,
      maxDdDelta: r.maxDrawdownPct != null && baseline.maxDrawdownPct != null ? round2(r.maxDrawdownPct - baseline.maxDrawdownPct) : null,
      pfDelta: r.profitFactor != null && baseline.profitFactor != null ? round3(r.profitFactor - baseline.profitFactor) : null,
    });

    const report = {
      finalRuleJa: {
        entry: '4レジーム+浅押しADX/MACD',
        exit: '日中: SL優先→TP→最大25営業日終値',
        fixed: '5ETF / SPY優先 / 同時3',
      },
      goalsJa: ['Sharpe>1.1', 'MaxDD>-5%', '件数>=100'],
      referenceBaselineJa: BASELINE,
      section1_takeProfitOnly: results.filter((r) => r.category === 'tp_only'),
      section2_stopLossOnly: results.filter((r) => r.category === 'sl_only'),
      section3_tpSlGrid: results.filter((r) => r.category === 'tp_sl_grid'),
      rankingTop10: top10.map((r) => ({ rank: (r as { rank: number }).rank, ...r, diffVsBaseline: diffBaseline(r) })),
      sharpeMax: { ...sharpeMax, diffVsBaseline: diffBaseline(sharpeMax) },
      tripleGoalPassers,
      computedBaseline: baseline,
      baselineVsBest: {
        currentRule: { label: '25日終値のみ', ...baseline },
        bestTripleGoal: bestGoal ? { ...bestGoal, diffVsBaseline: diffBaseline(bestGoal) } : null,
        bestSharpeOverall: { ...sharpeMax, diffVsBaseline: diffBaseline(sharpeMax) },
        recommendationJa: (() => {
          if (bestGoal) {
            return `3条件達成: ${bestGoal.labelJa} → Sharpe${bestGoal.sharpe} MaxDD${bestGoal.maxDrawdownPct}% (${bestGoal.tradeCount}件)`;
          }
          if ((sharpeMax.sharpe ?? 0) > (baseline.sharpe ?? 0)) {
            return `3条件未達。Sharpe最大: ${sharpeMax.labelJa} (${sharpeMax.sharpe})`;
          }
          return '利確損切り追加はベースラインを上回らず — 25日終値維持推奨';
        })(),
      },
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-final-exit-optimization');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'rank,id,tp,sl,trades,sharpe,maxDD,PF,winRate,avgWin,avgLoss,tripleGoal',
      ...ranked.map((r) =>
        [
          (r as { rank: number }).rank,
          r.id,
          r.tpPct ?? '',
          r.slPct ?? '',
          r.tradeCount,
          r.sharpe ?? '',
          r.maxDrawdownPct ?? '',
          r.profitFactor ?? '',
          r.winRate ?? '',
          r.avgWinPct ?? '',
          r.avgLossPct ?? '',
          r.meetsTripleGoal,
        ].join(','),
      ),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'ranking.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== EXIT OPTIMIZATION ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
