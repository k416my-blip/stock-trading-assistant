/**
 * SPY除外4ETF — walk-forward + Monte Carlo reproducibility vs 5ETF baseline
 * npx vitest run tests/unit/case4Hold25Etf4ReproducibilityValidation.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const UNIVERSE_5 = ['SCHD', 'SPY', 'VYM', 'DGRO', 'SPLG'] as const;
const UNIVERSE_4 = ['SCHD', 'VYM', 'DGRO', 'SPLG'] as const;
type Etf5 = (typeof UNIVERSE_5)[number];
type Etf4 = (typeof UNIVERSE_4)[number];
type Etf = Etf5;

const MAX_CONCURRENT = 3;
const HOLD_DAYS = 25;
const TAKE_PROFIT_PCT = 3;
const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';
const MONTE_CARLO_RUNS = 1000;
const MC_SEED = 20260602;
const MIN_TRADES_4ETF = 90;

const ADX_MIN = 25;
const MACD_MIN = 0.1;
const SHALLOW_ADX_MIN = 30;
const SHALLOW_MACD_MIN = 0.15;

const REGIME_UP_THRESH = 5;
const REGIME_DOWN_THRESH = -5;
const SIDEWAYS_DEEP_DIST = -5;

const PRIORITY: Record<Etf, number> = {
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

type Metrics = {
  tradeCount: number;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  profitFactor: number | null;
  winRate: number | null;
};

type VariantReport = {
  id: string;
  labelJa: string;
  universe: readonly string[];
  fullPeriod: Metrics;
  walkForward: {
    fold1: { train2024: Metrics; validate2025: Metrics };
    fold2: { train2024_2025: Metrics; validate2026: Metrics };
  };
  byYear: { y2024: Metrics; y2025: Metrics; y2026: Metrics };
  monteCarlo: {
    runs: number;
    meanSharpe: number;
    sharpeP5: number | null;
    sharpeP95: number | null;
    meanMaxDD: number;
    maxDD95thWorst: number | null;
  };
  tradesGe90: boolean;
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
  if (lo === hi) return round3(s[lo]!);
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

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
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

function simulateExit(bars: OhlcvBar[], signalIdx: number): number | null {
  const entryIdx = signalIdx + 1;
  const lastIdx = Math.min(signalIdx + HOLD_DAYS, bars.length - 1);
  if (entryIdx >= bars.length || lastIdx <= entryIdx) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;
  const targetPrice = entry * (1 + TAKE_PROFIT_PCT / 100);
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    if (bars[i]!.high >= targetPrice) return round3(TAKE_PROFIT_PCT);
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
      .sort((a, b) => PRIORITY[b.symbol] - PRIORITY[a.symbol])
      .slice(0, MAX_CONCURRENT);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    executed.push(...taken);
  }
  return { dailyReturns, executed };
}

function metricsFromDailyReturns(dailyReturns: number[], trades: Signal[]): Metrics {
  if (dailyReturns.length === 0) {
    return { tradeCount: 0, sharpe: null, maxDrawdownPct: null, profitFactor: null, winRate: null };
  }
  const drWins = dailyReturns.filter((r) => r > 0);
  const drLosses = dailyReturns.filter((r) => r < 0);
  const tradeWins = trades.filter((t) => t.returnPct > 0);
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
    tradeCount: trades.length,
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      drLosses.length > 0
        ? round3(drWins.reduce((a, b) => a + b, 0) / Math.abs(drLosses.reduce((a, b) => a + b, 0)))
        : null,
    winRate: trades.length > 0 ? round3(tradeWins.length / trades.length) : null,
  };
}

function filterUniverse(signals: Signal[], allowed: readonly string[]): Signal[] {
  const set = new Set(allowed);
  return signals.filter((s) => set.has(s.symbol));
}

function filterByYear(signals: Signal[], pred: (year: string) => boolean): Signal[] {
  return signals.filter((s) => pred(s.year));
}

function evaluate(signals: Signal[]): Metrics {
  const run = runPortfolio(signals);
  return metricsFromDailyReturns(run.dailyReturns, run.executed);
}

function monteCarloShuffle1000(dailyReturns: number[]) {
  const rng = mulberry32(MC_SEED);
  const mcSharpe: number[] = [];
  const mcMaxDd: number[] = [];
  for (let i = 0; i < MONTE_CARLO_RUNS; i++) {
    const shuffled = [...dailyReturns];
    shuffleInPlace(shuffled, rng);
    const m = metricsFromDailyReturns(shuffled, []);
    if (m.sharpe != null) mcSharpe.push(m.sharpe);
    if (m.maxDrawdownPct != null) mcMaxDd.push(m.maxDrawdownPct);
  }
  return {
    runs: MONTE_CARLO_RUNS,
    meanSharpe: round3(mean(mcSharpe)),
    sharpeP5: percentile(mcSharpe, 0.05),
    sharpeP95: percentile(mcSharpe, 0.95),
    meanMaxDD: round2(mean(mcMaxDd)),
    maxDD95thWorst: percentile(mcMaxDd, 0.05),
  };
}

function buildVariantReport(
  id: string,
  labelJa: string,
  universe: readonly string[],
  allSignals: Signal[],
): VariantReport {
  const sigs = filterUniverse(allSignals, universe);
  const fullRun = runPortfolio(sigs);
  const fullPeriod = metricsFromDailyReturns(fullRun.dailyReturns, fullRun.executed);

  return {
    id,
    labelJa,
    universe,
    fullPeriod,
    walkForward: {
      fold1: {
        train2024: evaluate(filterByYear(sigs, (y) => y === '2024')),
        validate2025: evaluate(filterByYear(sigs, (y) => y === '2025')),
      },
      fold2: {
        train2024_2025: evaluate(filterByYear(sigs, (y) => y === '2024' || y === '2025')),
        validate2026: evaluate(filterByYear(sigs, (y) => y === '2026')),
      },
    },
    byYear: {
      y2024: evaluate(filterByYear(sigs, (y) => y === '2024')),
      y2025: evaluate(filterByYear(sigs, (y) => y === '2025')),
      y2026: evaluate(filterByYear(sigs, (y) => y === '2026')),
    },
    monteCarlo: monteCarloShuffle1000(fullRun.dailyReturns),
    tradesGe90: fullPeriod.tradeCount >= MIN_TRADES_4ETF,
  };
}

function delta(a: number | null, b: number | null): number | null {
  return a != null && b != null ? round3(a - b) : null;
}

type ComparativeVerdict = '4ETF優位・過剰最適化疑い低' | '4ETF優位だが要注意' | '5ETF維持推奨' | '判定不能';

function comparativeVerdict(v5: VariantReport, v4: VariantReport): { verdict: ComparativeVerdict; reasonsJa: string[] } {
  const reasons: string[] = [];
  let score4 = 0;

  const fullSharpeDelta = delta(v4.fullPeriod.sharpe, v5.fullPeriod.sharpe) ?? 0;
  const oos25SharpeDelta = delta(v4.walkForward.fold1.validate2025.sharpe, v5.walkForward.fold1.validate2025.sharpe) ?? 0;
  const oos26SharpeDelta = delta(v4.walkForward.fold2.validate2026.sharpe, v5.walkForward.fold2.validate2026.sharpe) ?? 0;
  const maxDdImprove = (v4.fullPeriod.maxDrawdownPct ?? -999) - (v5.fullPeriod.maxDrawdownPct ?? -999);

  if (v4.tradesGe90) {
    score4 += 2;
    reasons.push(`4ETF件数 ${v4.fullPeriod.tradeCount} >= ${MIN_TRADES_4ETF}`);
  } else {
    reasons.push(`4ETF件数 ${v4.fullPeriod.tradeCount} < ${MIN_TRADES_4ETF} — 未達`);
  }

  if (fullSharpeDelta > 0.2) {
    score4 += 2;
    reasons.push(`フルSharpe +${fullSharpeDelta} (4ETF ${v4.fullPeriod.sharpe} vs 5ETF ${v5.fullPeriod.sharpe})`);
  } else if (fullSharpeDelta > 0) {
    score4 += 1;
    reasons.push(`フルSharpe +${fullSharpeDelta}`);
  } else {
    reasons.push(`フルSharpe差 ${fullSharpeDelta}`);
  }

  if (oos25SharpeDelta >= 0 && (v4.walkForward.fold1.validate2025.sharpe ?? 0) >= 0.8) {
    score4 += 2;
    reasons.push(`2025 OOS: 4ETF ${v4.walkForward.fold1.validate2025.sharpe} vs 5ETF ${v5.walkForward.fold1.validate2025.sharpe} (Δ${oos25SharpeDelta})`);
  } else if (oos25SharpeDelta < -0.1) {
    score4 -= 2;
    reasons.push(`2025 OOSで4ETF劣化 (Δ${oos25SharpeDelta}) — 過剰最適化疑い`);
  } else {
    reasons.push(`2025 OOS Δ${oos25SharpeDelta}`);
  }

  const train24_4 = v4.walkForward.fold1.train2024.sharpe ?? 0;
  const val25_4 = v4.walkForward.fold1.validate2025.sharpe ?? 0;
  const decay4 = val25_4 - train24_4;
  const train24_5 = v5.walkForward.fold1.train2024.sharpe ?? 0;
  const val25_5 = v5.walkForward.fold1.validate2025.sharpe ?? 0;
  const decay5 = val25_5 - train24_5;

  if (decay4 >= decay5 - 0.2) {
    score4 += 1;
    reasons.push(`4ETF WF減衰 ${round3(decay4)} vs 5ETF ${round3(decay5)} — OOS安定`);
  } else {
    score4 -= 1;
    reasons.push(`4ETF WF減衰 ${round3(decay4)} vs 5ETF ${round3(decay5)} — 4ETFの方が不安定`);
  }

  if (maxDdImprove > 0.5) {
    score4 += 1;
    reasons.push(`MaxDD改善 +${round2(maxDdImprove)}pt`);
  }

  reasons.push(`2026 OOS ΔSharpe ${oos26SharpeDelta}（参考・件数4ETF ${v4.walkForward.fold2.validate2026.tradeCount}）`);

  let verdict: ComparativeVerdict;
  if (!v4.tradesGe90 || oos25SharpeDelta < -0.1) {
    verdict = oos25SharpeDelta < -0.1 ? '5ETF維持推奨' : '判定不能';
  } else if (score4 >= 6 && oos25SharpeDelta >= 0) {
    verdict = '4ETF優位・過剰最適化疑い低';
  } else if (score4 >= 4) {
    verdict = '4ETF優位だが要注意';
  } else {
    verdict = '5ETF維持推奨';
  }

  return { verdict, reasonsJa: reasons };
}

describe('Case4 ETF4 reproducibility vs ETF5', () => {
  it('walk-forward, MC, yearly, trades>=90, comparison table', async () => {
    const ohlcv = new Map<Etf, OhlcvBar[]>();
    for (const sym of UNIVERSE_5) {
      ohlcv.set(sym, await fetchYahooOhlcv(sym));
    }
    const regimeMap = buildSpyRegimeMap(ohlcv.get('SPY')!);

    const candidates: SignalCandidate[] = [];
    for (const sym of UNIVERSE_5) {
      candidates.push(...buildCandidates(ohlcv.get(sym)!, sym, regimeMap));
    }

    const allSignals: Signal[] = [];
    for (const c of candidates) {
      const ret = simulateExit(ohlcv.get(c.symbol)!, c.signalIdx);
      if (ret == null) continue;
      allSignals.push({ date: c.date, symbol: c.symbol, returnPct: ret, year: c.year });
    }

    const etf5 = buildVariantReport('etf5_spy_first', '現行5ETF（SPY優先）', UNIVERSE_5, allSignals);
    const etf4 = buildVariantReport(
      'etf4_no_spy',
      'SPY除外4ETF（SCHD+VYM+DGRO+SPLG）',
      UNIVERSE_4,
      allSignals,
    );

    const { verdict, reasonsJa } = comparativeVerdict(etf5, etf4);

    const comparisonTable = {
      fullPeriod: {
        metric: 'フル期間',
        etf5: etf5.fullPeriod,
        etf4: etf4.fullPeriod,
        delta: {
          tradeCount: etf4.fullPeriod.tradeCount - etf5.fullPeriod.tradeCount,
          sharpe: delta(etf4.fullPeriod.sharpe, etf5.fullPeriod.sharpe),
          maxDrawdownPct: delta(etf4.fullPeriod.maxDrawdownPct, etf5.fullPeriod.maxDrawdownPct),
          profitFactor: delta(etf4.fullPeriod.profitFactor, etf5.fullPeriod.profitFactor),
          winRate: delta(etf4.fullPeriod.winRate, etf5.fullPeriod.winRate),
        },
      },
      walkForward: [
        {
          fold: '2024→2025',
          phase: 'train2024',
          etf5: etf5.walkForward.fold1.train2024,
          etf4: etf4.walkForward.fold1.train2024,
        },
        {
          fold: '2024→2025',
          phase: 'val2025',
          etf5: etf5.walkForward.fold1.validate2025,
          etf4: etf4.walkForward.fold1.validate2025,
        },
        {
          fold: '2024-25→2026',
          phase: 'train2024_2025',
          etf5: etf5.walkForward.fold2.train2024_2025,
          etf4: etf4.walkForward.fold2.train2024_2025,
        },
        {
          fold: '2024-25→2026',
          phase: 'val2026',
          etf5: etf5.walkForward.fold2.validate2026,
          etf4: etf4.walkForward.fold2.validate2026,
        },
      ],
      byYear: ['2024', '2025', '2026'].map((y) => ({
        year: y,
        etf5: etf5.byYear[`y${y}` as 'y2024' | 'y2025' | 'y2026'],
        etf4: etf4.byYear[`y${y}` as 'y2024' | 'y2025' | 'y2026'],
      })),
      monteCarlo: { etf5: etf5.monteCarlo, etf4: etf4.monteCarlo },
      tradesGe90Check: {
        threshold: MIN_TRADES_4ETF,
        etf4TradeCount: etf4.fullPeriod.tradeCount,
        passed: etf4.tradesGe90,
      },
    };

    const report = {
      fixedRuleJa: {
        entry: '4レジーム + 浅押し ADX>30 MACD>0.15',
        exit: '利確+3% / 最大25日',
        etf4: 'SCHD, VYM, DGRO, SPLG',
        etf5: 'SCHD, SPY, VYM, DGRO, SPLG（SPY優先）',
        concurrent: 3,
      },
      etf5,
      etf4,
      comparisonTable,
      comparativeVerdict: verdict,
      comparativeVerdictReasonsJa: reasonsJa,
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-etf4-reproducibility');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'variant,section,period,trades,sharpe,maxDD,PF,winRate',
      ...['etf5', 'etf4'].flatMap((v) => {
        const r = v === 'etf5' ? etf5 : etf4;
        return [
          [v, 'full', 'all', r.fullPeriod.tradeCount, r.fullPeriod.sharpe ?? '', r.fullPeriod.maxDrawdownPct ?? '', r.fullPeriod.profitFactor ?? '', r.fullPeriod.winRate ?? ''].join(','),
          [v, 'wf1', 'train2024', r.walkForward.fold1.train2024.tradeCount, r.walkForward.fold1.train2024.sharpe ?? '', r.walkForward.fold1.train2024.maxDrawdownPct ?? '', r.walkForward.fold1.train2024.profitFactor ?? '', r.walkForward.fold1.train2024.winRate ?? ''].join(','),
          [v, 'wf1', 'val2025', r.walkForward.fold1.validate2025.tradeCount, r.walkForward.fold1.validate2025.sharpe ?? '', r.walkForward.fold1.validate2025.maxDrawdownPct ?? '', r.walkForward.fold1.validate2025.profitFactor ?? '', r.walkForward.fold1.validate2025.winRate ?? ''].join(','),
          [v, 'wf2', 'train2024_25', r.walkForward.fold2.train2024_2025.tradeCount, r.walkForward.fold2.train2024_2025.sharpe ?? '', r.walkForward.fold2.train2024_2025.maxDrawdownPct ?? '', r.walkForward.fold2.train2024_2025.profitFactor ?? '', r.walkForward.fold2.train2024_2025.winRate ?? ''].join(','),
          [v, 'wf2', 'val2026', r.walkForward.fold2.validate2026.tradeCount, r.walkForward.fold2.validate2026.sharpe ?? '', r.walkForward.fold2.validate2026.maxDrawdownPct ?? '', r.walkForward.fold2.validate2026.profitFactor ?? '', r.walkForward.fold2.validate2026.winRate ?? ''].join(','),
          [v, 'year', '2024', r.byYear.y2024.tradeCount, r.byYear.y2024.sharpe ?? '', r.byYear.y2024.maxDrawdownPct ?? '', r.byYear.y2024.profitFactor ?? '', r.byYear.y2024.winRate ?? ''].join(','),
          [v, 'year', '2025', r.byYear.y2025.tradeCount, r.byYear.y2025.sharpe ?? '', r.byYear.y2025.maxDrawdownPct ?? '', r.byYear.y2025.profitFactor ?? '', r.byYear.y2025.winRate ?? ''].join(','),
          [v, 'year', '2026', r.byYear.y2026.tradeCount, r.byYear.y2026.sharpe ?? '', r.byYear.y2026.maxDrawdownPct ?? '', r.byYear.y2026.profitFactor ?? '', r.byYear.y2026.winRate ?? ''].join(','),
        ];
      }),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'comparison.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== ETF4 REPRODUCIBILITY ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
