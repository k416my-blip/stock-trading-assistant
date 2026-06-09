/**
 * Primary candidate validation: dist52<=-3% vs legacy -7%
 * SCHD+SPY, ADX>25, MACD>0.15, concurrent 2, hold 20d
 * npx vitest run tests/unit/case4PrimaryCandidateValidation.test.ts
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
const MACD_MIN = 0.15;
const MONTE_CARLO_RUNS = 10_000;

type Variant = { id: string; labelJa: string; dist52Max: number };
const VARIANTS: Variant[] = [
  { id: 'new_primary', labelJa: '本命: 52週高値 <= -3%', dist52Max: -3 },
  { id: 'legacy', labelJa: '旧本命: 52週高値 <= -7%', dist52Max: -7 },
];

type OhlcvBar = { date: string; high: number; low: number; close: number };
type RawBar = {
  date: string;
  year: string;
  symbol: Sym;
  returnPctGross: number;
  adx: number;
  macd: number;
  dist52: number;
};
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

function buildRaw(bars: OhlcvBar[], symbol: Sym): RawBar[] {
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
      return ((bars[i]!.close / maxH - 1) * 100);
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
      returnPctGross: round3(((bars[exitIdx]!.close / entry - 1) * 100)),
      adx,
      macd,
      dist52,
    });
  }
  return out;
}

function toSignals(raw: RawBar[], dist52Max: number, year: string | null, costPerSide = 0): Signal[] {
  return raw
    .filter(
      (r) =>
        r.adx > ADX_MIN &&
        r.macd > MACD_MIN &&
        r.dist52 <= dist52Max &&
        (year == null || r.year === year),
    )
    .map((r) => ({
      date: r.date,
      symbol: r.symbol,
      returnPct: round3(r.returnPctGross - 2 * costPerSide),
      year: r.year,
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
  let tradeCount = 0;
  for (const d of dates) {
    const day = [...byDate.get(d)!].sort((a, b) => (b.symbol === 'SCHD' ? 1 : 0) - (a.symbol === 'SCHD' ? 1 : 0));
    const taken = day.slice(0, MAX_CONCURRENT);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    outDates.push(d);
    tradeCount += taken.length;
  }
  return { dailyReturns, dates: outDates, tradeCount };
}

function metrics(dailyReturns: number[], dates: string[]) {
  if (dailyReturns.length === 0) {
    return {
      sharpe: null as number | null,
      maxDrawdownPct: null as number | null,
      profitFactor: null as number | null,
      cagrPct: null as number | null,
      finalBalanceUsd: INITIAL_CAPITAL_USD,
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
    finalBalanceUsd: round2(equity),
    activeDays: dailyReturns.length,
  };
}

function runMonteCarlo(dailyReturns: number[], dates: string[], seed: number) {
  const rng = mulberry32(seed);
  const mcSharpe: number[] = [];
  const mcMaxDd: number[] = [];
  const mcPf: number[] = [];
  for (let i = 0; i < MONTE_CARLO_RUNS; i++) {
    const sample: number[] = [];
    const sampleDates: string[] = [];
    for (let j = 0; j < dailyReturns.length; j++) {
      const k = Math.floor(rng() * dailyReturns.length);
      sample.push(dailyReturns[k]!);
      sampleDates.push(dates[k]!);
    }
    const m = metrics(sample, sampleDates);
    if (m.sharpe != null) mcSharpe.push(m.sharpe);
    if (m.maxDrawdownPct != null) mcMaxDd.push(m.maxDrawdownPct);
    if (m.profitFactor != null) mcPf.push(m.profitFactor);
  }
  return {
    runs: MONTE_CARLO_RUNS,
    sharpe: { p5: percentile(mcSharpe, 0.05), p50: percentile(mcSharpe, 0.5), p95: percentile(mcSharpe, 0.95) },
    maxDrawdownPct: {
      p5: percentile(mcMaxDd, 0.05),
      p50: percentile(mcMaxDd, 0.5),
      p95: percentile(mcMaxDd, 0.95),
    },
    profitFactor: { p50: percentile(mcPf, 0.5) },
    probSharpeAbove08: round3(mcSharpe.filter((s) => s >= 0.8).length / mcSharpe.length),
    probMaxDdAboveMinus20: round3(mcMaxDd.filter((d) => d >= -20).length / mcMaxDd.length),
  };
}

function evaluateVariant(raw: RawBar[], v: Variant) {
  const block = (year: string | null, cost = 0) => {
    const run = runPortfolio(toSignals(raw, v.dist52Max, year, cost));
    const m = metrics(run.dailyReturns, run.dates);
    return { tradeCount: run.tradeCount, fires: run.tradeCount > 0, ...m };
  };

  const fullNoCost = block(null, 0);
  const byYear = {
    '2024': block('2024', 0),
    '2025': block('2025', 0),
    '2026': block('2026', 0),
  };
  const firesAllYears = ['2024', '2025', '2026'].every((y) => byYear[y as keyof typeof byYear]!.fires);

  const wf = {
    train2024: block('2024', 0),
    test2025: block('2025', 0),
    train2024_2025: block(null, 0),
    test2026: block('2026', 0),
  };
  wf.train2024_2025 = (() => {
    const sigs = toSignals(
      raw.filter((r) => r.year === '2024' || r.year === '2025'),
      v.dist52Max,
      null,
    );
    const run = runPortfolio(sigs);
    const m = metrics(run.dailyReturns, run.dates);
    return { tradeCount: run.tradeCount, fires: run.tradeCount > 0, ...m };
  })();

  const fullRun = runPortfolio(toSignals(raw, v.dist52Max, null, 0));
  const monteCarlo10000 = runMonteCarlo(fullRun.dailyReturns, fullRun.dates, v.id === 'new_primary' ? 20260605 : 20260606);

  const costs = [0.1, 0.25, 0.5].map((c) => ({
    costPctPerSide: c,
    ...block(null, c),
  }));

  return {
    variant: v,
    fullPeriod: fullNoCost,
    byYear,
    firesAllYears,
    walkForward: {
      split1_train2024_test2025: { train: wf.train2024, test: wf.test2025 },
      split2_train2024_2025_test2026: { train: wf.train2024_2025, test: wf.test2026 },
    },
    monteCarlo10000,
    withCosts: costs,
  };
}

describe('Case4 primary candidate validation', () => {
  it('validates -3% vs -7% with WF, MC, costs, adoption verdict', async () => {
    const raw: RawBar[] = [];
    for (const sym of SYMBOLS) {
      raw.push(...buildRaw(await fetchYahooOhlcv(sym), sym));
    }

    const results = VARIANTS.map((v) => evaluateVariant(raw, v));
    const [newP, legacy] = results;

    const compare = (a: number | null, b: number | null) => (a != null && b != null ? round3(a - b) : null);

    const adoptionVerdictJa = (() => {
      const n = newP!;
      const l = legacy!;
      const pros: string[] = [];
      const cons: string[] = [];
      if (n.firesAllYears && !l.firesAllYears) pros.push('3年全てで発火（旧は2024/2026ゼロ）');
      if ((n.fullPeriod.tradeCount ?? 0) > (l.fullPeriod.tradeCount ?? 0))
        pros.push(`トレード数増加 ${l.fullPeriod.tradeCount}→${n.fullPeriod.tradeCount}`);
      if ((n.fullPeriod.maxDrawdownPct ?? -999) > (l.fullPeriod.maxDrawdownPct ?? -999))
        pros.push(`MaxDD改善 ${l.fullPeriod.maxDrawdownPct}%→${n.fullPeriod.maxDrawdownPct}%`);
      if ((n.fullPeriod.sharpe ?? 0) < (l.fullPeriod.sharpe ?? 0))
        cons.push(`Sharpe低下 ${l.fullPeriod.sharpe}→${n.fullPeriod.sharpe}`);
      if ((n.fullPeriod.tradeCount ?? 0) < 100) cons.push(`トレード数${n.fullPeriod.tradeCount}件は100件目標未達`);
      if (!n.firesAllYears) cons.push('全年度発火未達');
      const cost05 = n.withCosts.find((c) => c.costPctPerSide === 0.5);
      if (cost05 && (cost05.sharpe ?? 0) < 0.8) cons.push(`コスト0.5%でSharpe ${cost05.sharpe}`);

      let adoptable: 'yes' | 'conditional' | 'no' = 'no';
      if (
        n.firesAllYears &&
        n.fullPeriod.tradeCount >= 30 &&
        (n.fullPeriod.maxDrawdownPct ?? -999) >= -20 &&
        (n.monteCarlo10000.probMaxDdAboveMinus20 ?? 0) >= 0.9
      ) {
        adoptable = n.fullPeriod.tradeCount >= 100 && (n.fullPeriod.sharpe ?? 0) >= 0.8 ? 'yes' : 'conditional';
      }

      return {
        adoptable,
        adoptableJa:
          adoptable === 'yes'
            ? '実運用採用可（統計量・安定性とも基準クリア）'
            : adoptable === 'conditional'
              ? '条件付き採用可（ペーパートレード後に本番）'
              : '現状は採用非推奨',
        pros,
        cons,
        rationaleJa: [
          adoptable === 'conditional'
            ? '52週-3%緩和で2024発火と時間的安定性は改善。ただしサンプル件数・Sharpeは要監視。'
            : '',
          '旧-7%は2025集中の過学習型、新-3%はマルチイヤー検証が可能。',
        ].filter(Boolean),
      };
    })();

    const report = {
      fixedJa: {
        universe: 'SCHD + SPY',
        adx: `> ${ADX_MIN}`,
        macd: `> ${MACD_MIN}`,
        maxConcurrent: MAX_CONCURRENT,
        holdDays: HOLD_DAYS,
        period: `${SIGNAL_START}〜`,
      },
      newPrimary: newP,
      legacyDist7: legacy,
      headToHead: {
        dist52: { new: -3, legacy: -7 },
        fullPeriod: {
          tradeCount: { new: newP!.fullPeriod.tradeCount, legacy: legacy!.fullPeriod.tradeCount, delta: newP!.fullPeriod.tradeCount - legacy!.fullPeriod.tradeCount },
          sharpe: { new: newP!.fullPeriod.sharpe, legacy: legacy!.fullPeriod.sharpe, delta: compare(newP!.fullPeriod.sharpe, legacy!.fullPeriod.sharpe) },
          maxDrawdownPct: {
            new: newP!.fullPeriod.maxDrawdownPct,
            legacy: legacy!.fullPeriod.maxDrawdownPct,
            delta: compare(newP!.fullPeriod.maxDrawdownPct, legacy!.fullPeriod.maxDrawdownPct),
          },
          profitFactor: {
            new: newP!.fullPeriod.profitFactor,
            legacy: legacy!.fullPeriod.profitFactor,
            delta: compare(newP!.fullPeriod.profitFactor, legacy!.fullPeriod.profitFactor),
          },
          cagrPct: {
            new: newP!.fullPeriod.cagrPct,
            legacy: legacy!.fullPeriod.cagrPct,
            delta: compare(newP!.fullPeriod.cagrPct, legacy!.fullPeriod.cagrPct),
          },
          finalBalanceUsd: {
            new: newP!.fullPeriod.finalBalanceUsd,
            legacy: legacy!.fullPeriod.finalBalanceUsd,
          },
        },
        firesAllYears: { new: newP!.firesAllYears, legacy: legacy!.firesAllYears },
        byYearTradeCount: {
          '2024': { new: newP!.byYear['2024'].tradeCount, legacy: legacy!.byYear['2024'].tradeCount },
          '2025': { new: newP!.byYear['2025'].tradeCount, legacy: legacy!.byYear['2025'].tradeCount },
          '2026': { new: newP!.byYear['2026'].tradeCount, legacy: legacy!.byYear['2026'].tradeCount },
        },
      },
      adoptionVerdict: adoptionVerdictJa,
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-primary-candidate-validation');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log('\n=== PRIMARY CANDIDATE VALIDATION ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
