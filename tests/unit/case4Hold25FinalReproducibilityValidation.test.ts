/**
 * Final fixed rule — walk-forward + Monte Carlo reproducibility validation
 * npx vitest run tests/unit/case4Hold25FinalReproducibilityValidation.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const UNIVERSE = ['SCHD', 'SPY', 'VYM', 'DGRO', 'SPLG'] as const;
type Etf = (typeof UNIVERSE)[number];

const MAX_CONCURRENT = 3;
const HOLD_DAYS = 25;
const TAKE_PROFIT_PCT = 3;
const STOP_LOSS_PCT = null as number | null;
const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';
const MONTE_CARLO_RUNS = 1000;
const MC_SEED = 20260602;

const ADX_MIN = 25;
const MACD_MIN = 0.1;
const SHALLOW_ADX_MIN = 30;
const SHALLOW_MACD_MIN = 0.15;

const REGIME_UP_THRESH = 5;
const REGIME_DOWN_THRESH = -5;
const SIDEWAYS_DEEP_DIST = -5;

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

type Metrics = {
  tradeCount: number;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  profitFactor: number | null;
  winRate: number | null;
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
    const bar = bars[i]!;
    if (bar.high >= targetPrice) return round3(TAKE_PROFIT_PCT);
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

function evaluateSignals(signals: Signal[]): Metrics {
  const run = runPortfolio(signals);
  return metricsFromDailyReturns(run.dailyReturns, run.executed);
}

function filterByYear(signals: Signal[], pred: (year: string) => boolean): Signal[] {
  return signals.filter((s) => pred(s.year));
}

function monteCarloShuffle1000(dailyReturns: number[], trades: Signal[]) {
  const rng = mulberry32(MC_SEED);
  const mcSharpe: number[] = [];
  const mcMaxDd: number[] = [];
  for (let i = 0; i < MONTE_CARLO_RUNS; i++) {
    const shuffled = [...dailyReturns];
    shuffleInPlace(shuffled, rng);
    const m = metricsFromDailyReturns(shuffled, trades);
    if (m.sharpe != null) mcSharpe.push(m.sharpe);
    if (m.maxDrawdownPct != null) mcMaxDd.push(m.maxDrawdownPct);
  }
  return {
    runs: MONTE_CARLO_RUNS,
    methodJa: '日次リターンのランダム順序入替（1000回）',
    meanSharpe: round3(mean(mcSharpe)),
    sharpeP5: percentile(mcSharpe, 0.05),
    sharpeP95: percentile(mcSharpe, 0.95),
    meanMaxDD: round2(mean(mcMaxDd)),
    maxDD95thWorst: percentile(mcMaxDd, 0.05),
  };
}

type Verdict = '実運用可能' | '要注意' | '過剰最適化疑い';

function classifyVerdict(args: {
  train2024: Metrics;
  val2025: Metrics;
  train2024_2025: Metrics;
  val2026: Metrics;
  mc: ReturnType<typeof monteCarloShuffle1000>;
  fullPeriod: Metrics;
}): { verdict: Verdict; reasonsJa: string[] } {
  const { train2024, val2025, train2024_2025, val2026, mc, fullPeriod } = args;
  const reasons: string[] = [];
  let score = 0;

  const val25Sharpe = val2025.sharpe ?? -999;
  const val26Sharpe = val2026.sharpe ?? -999;
  const train24Sharpe = train2024.sharpe ?? 0;

  if (val25Sharpe >= 0.8) {
    score += 2;
    reasons.push(`2025 OOS Sharpe ${val2025.sharpe} >= 0.8`);
  } else if (val25Sharpe >= 0.3) {
    score += 1;
    reasons.push(`2025 OOS Sharpe ${val2025.sharpe} は中程度`);
  } else {
    reasons.push(`2025 OOS Sharpe ${val2025.sharpe} が低い`);
  }

  if (val26Sharpe >= 0.5 && (val2026.tradeCount ?? 0) >= 3) {
    score += 1;
    reasons.push(`2026 OOS Sharpe ${val2026.sharpe}（${val2026.tradeCount}件）`);
  } else if ((val2026.tradeCount ?? 0) < 3) {
    reasons.push(`2026はサンプル不足（${val2026.tradeCount}件）— 参考値`);
  } else {
    reasons.push(`2026 OOS Sharpe ${val2026.sharpe} が弱い`);
  }

  const sharpeDecay = train24Sharpe > 0 && val25Sharpe > -999 ? val25Sharpe - train24Sharpe : null;
  if (sharpeDecay != null && sharpeDecay < -0.8) {
    score -= 2;
    reasons.push(`2024→2025 Sharpe減衰 ${round3(sharpeDecay)}（大）`);
  } else if (sharpeDecay != null && sharpeDecay < -0.3) {
    score -= 1;
    reasons.push(`2024→2025 Sharpe減衰 ${round3(sharpeDecay)}`);
  }

  if ((mc.sharpeP5 ?? -999) >= 0) {
    score += 2;
    reasons.push(`MC Sharpe 5%分位 ${mc.sharpeP5} >= 0`);
  } else if ((mc.sharpeP5 ?? -999) >= -0.3) {
    score += 1;
    reasons.push(`MC Sharpe 5%分位 ${mc.sharpeP5} はやや低い`);
  } else {
    score -= 1;
    reasons.push(`MC Sharpe 5%分位 ${mc.sharpeP5} がマイナス`);
  }

  if ((val2025.maxDrawdownPct ?? -999) >= -10) {
    score += 1;
    reasons.push(`2025 MaxDD ${val2025.maxDrawdownPct}%`);
  } else {
    reasons.push(`2025 MaxDD ${val2025.maxDrawdownPct}% が深い`);
  }

  if (fullPeriod.tradeCount >= 100 && (fullPeriod.sharpe ?? 0) >= 1.0) {
    score += 1;
    reasons.push(`フル期間 ${fullPeriod.tradeCount}件 Sharpe ${fullPeriod.sharpe}`);
  }

  let verdict: Verdict;
  if (score >= 5 && val25Sharpe >= 0.8 && (mc.sharpeP5 ?? -1) >= 0) {
    verdict = '実運用可能';
  } else if (score <= 1 || val25Sharpe < 0 || (sharpeDecay != null && sharpeDecay < -1.0)) {
    verdict = '過剰最適化疑い';
  } else {
    verdict = '要注意';
  }

  return { verdict, reasonsJa: reasons };
}

describe('Case4 final rule reproducibility validation', () => {
  it('walk-forward, year splits, Monte Carlo shuffle, verdict', async () => {
    const ohlcv = new Map<Etf, OhlcvBar[]>();
    for (const sym of UNIVERSE) {
      ohlcv.set(sym, await fetchYahooOhlcv(sym));
    }
    const regimeMap = buildSpyRegimeMap(ohlcv.get('SPY')!);

    const candidates: SignalCandidate[] = [];
    for (const sym of UNIVERSE) {
      candidates.push(...buildCandidates(ohlcv.get(sym)!, sym, regimeMap));
    }

    const allSignals: Signal[] = [];
    for (const c of candidates) {
      const ret = simulateExit(ohlcv.get(c.symbol)!, c.signalIdx);
      if (ret == null) continue;
      allSignals.push({ date: c.date, symbol: c.symbol, returnPct: ret, year: c.year });
    }

    const fullRun = runPortfolio(allSignals);
    const fullPeriod = metricsFromDailyReturns(fullRun.dailyReturns, fullRun.executed);

    const walkForward = {
      fold1: {
        trainLabel: '2024',
        validateLabel: '2025',
        train2024: evaluateSignals(filterByYear(allSignals, (y) => y === '2024')),
        validate2025: evaluateSignals(filterByYear(allSignals, (y) => y === '2025')),
      },
      fold2: {
        trainLabel: '2024-2025',
        validateLabel: '2026',
        train2024_2025: evaluateSignals(filterByYear(allSignals, (y) => y === '2024' || y === '2025')),
        validate2026: evaluateSignals(filterByYear(allSignals, (y) => y === '2026')),
      },
    };

    const byYear = {
      y2024: evaluateSignals(filterByYear(allSignals, (y) => y === '2024')),
      y2025: evaluateSignals(filterByYear(allSignals, (y) => y === '2025')),
      y2026: evaluateSignals(filterByYear(allSignals, (y) => y === '2026')),
    };

    const monteCarlo = monteCarloShuffle1000(fullRun.dailyReturns, fullRun.executed);

    const { verdict, reasonsJa } = classifyVerdict({
      train2024: walkForward.fold1.train2024,
      val2025: walkForward.fold1.validate2025,
      train2024_2025: walkForward.fold2.train2024_2025,
      val2026: walkForward.fold2.validate2026,
      mc: monteCarlo,
      fullPeriod,
    });

    const report = {
      fixedRuleJa: {
        entry: {
          up: 'dist <= -2%',
          sidewaysShallow: 'dist52 > -5%, dist <= -2%, ADX > 30, MACD > 0.15',
          sidewaysDeep: 'dist52 <= -5%, dist <= -8%',
          down: 'dist <= -8%',
          baseFilter: 'ADX > 25, MACD > 0.10',
        },
        exit: '利確+3% / 損切りなし / 最大25日',
        operational: '5ETF / SPY優先 / 同時3',
        noteJa: 'パラメータ固定 — WFは閾値再最適化なし、期間切り出しのみ',
      },
      walkForward,
      byYear,
      fullPeriod,
      monteCarlo,
      verdict,
      verdictReasonsJa: reasonsJa,
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-final-reproducibility');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'section,period,trades,sharpe,maxDD,PF,winRate',
      ['wf1', 'train2024', walkForward.fold1.train2024.tradeCount, walkForward.fold1.train2024.sharpe ?? '', walkForward.fold1.train2024.maxDrawdownPct ?? '', walkForward.fold1.train2024.profitFactor ?? '', walkForward.fold1.train2024.winRate ?? ''].join(','),
      ['wf1', 'val2025', walkForward.fold1.validate2025.tradeCount, walkForward.fold1.validate2025.sharpe ?? '', walkForward.fold1.validate2025.maxDrawdownPct ?? '', walkForward.fold1.validate2025.profitFactor ?? '', walkForward.fold1.validate2025.winRate ?? ''].join(','),
      ['wf2', 'train2024_2025', walkForward.fold2.train2024_2025.tradeCount, walkForward.fold2.train2024_2025.sharpe ?? '', walkForward.fold2.train2024_2025.maxDrawdownPct ?? '', walkForward.fold2.train2024_2025.profitFactor ?? '', walkForward.fold2.train2024_2025.winRate ?? ''].join(','),
      ['wf2', 'val2026', walkForward.fold2.validate2026.tradeCount, walkForward.fold2.validate2026.sharpe ?? '', walkForward.fold2.validate2026.maxDrawdownPct ?? '', walkForward.fold2.validate2026.profitFactor ?? '', walkForward.fold2.validate2026.winRate ?? ''].join(','),
      ['year', '2024', byYear.y2024.tradeCount, byYear.y2024.sharpe ?? '', byYear.y2024.maxDrawdownPct ?? '', byYear.y2024.profitFactor ?? '', byYear.y2024.winRate ?? ''].join(','),
      ['year', '2025', byYear.y2025.tradeCount, byYear.y2025.sharpe ?? '', byYear.y2025.maxDrawdownPct ?? '', byYear.y2025.profitFactor ?? '', byYear.y2025.winRate ?? ''].join(','),
      ['year', '2026', byYear.y2026.tradeCount, byYear.y2026.sharpe ?? '', byYear.y2026.maxDrawdownPct ?? '', byYear.y2026.profitFactor ?? '', byYear.y2026.winRate ?? ''].join(','),
      ['full', 'all', fullPeriod.tradeCount, fullPeriod.sharpe ?? '', fullPeriod.maxDrawdownPct ?? '', fullPeriod.profitFactor ?? '', fullPeriod.winRate ?? ''].join(','),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'summary.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== REPRODUCIBILITY VALIDATION ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
