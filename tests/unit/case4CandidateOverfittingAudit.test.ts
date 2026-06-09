/**
 * Overfitting audit — Case4 candidate (ADX>25, MACD>0.2, dist52<=-7%, n=2, 20d, SCHD+SPY)
 * npx vitest run tests/unit/case4CandidateOverfittingAudit.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const SYMBOLS = ['SCHD', 'SPY'] as const;
type Sym = (typeof SYMBOLS)[number];

const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-06-01';
const HOLD_DAYS = 20;
const MAX_CONCURRENT = 2;
const ADX_MIN = 25;
const MACD_MIN = 0.2;
const DIST52_MAX = -7;
const MIN_TRADES_TARGET = 30;
const MONTE_CARLO_RUNS = 10_000;

type OhlcvBar = { date: string; high: number; low: number; close: number };
type Signal = {
  date: string;
  symbol: Sym;
  returnPctGross: number;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
};

type Scenario = {
  id: string;
  labelJa: string;
  symbols: readonly Sym[];
  dateFrom: string | null;
  dateTo: string | null;
  costPctPerSide: number;
  slippagePctPerSide: number;
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

function buildSignals(bars: OhlcvBar[], symbol: Sym): Signal[] {
  const closes = bars.map((b) => b.close);
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1);
    let v = arr[0]!;
    for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
    return v;
  };
  const out: Signal[] = [];
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
    if (!(adx > ADX_MIN && macd > MACD_MIN && dist52 <= DIST52_MAX)) continue;
    const entryIdx = i + 1;
    const exitIdx = entryIdx + HOLD_DAYS;
    if (exitIdx >= bars.length) continue;
    const entry = bars[entryIdx]!.close;
    if (entry <= 0) continue;
    const ret = round3(((bars[exitIdx]!.close / entry - 1) * 100));
    out.push({ date, symbol, returnPctGross: ret, adx14: round3(adx), macdHistPct: round3(macd), dist52wPct: round3(dist52) });
  }
  return out;
}

function netReturn(grossPct: number, costPerSide: number, slipPerSide: number): number {
  const friction = 2 * (costPerSide + slipPerSide);
  return round3(grossPct - friction);
}

function symPriority(s: Sym): number {
  return s === 'SCHD' ? 2 : 1;
}

function inDateRange(date: string, from: string | null, to: string | null): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function runScenario(
  allSignals: Signal[],
  scenario: Scenario,
): { dailyReturns: number[]; dates: string[]; tradeCount: number } {
  const filtered = allSignals.filter(
    (s) =>
      scenario.symbols.includes(s.symbol) &&
      inDateRange(s.date, scenario.dateFrom, scenario.dateTo),
  );
  const byDate = new Map<string, Signal[]>();
  for (const s of filtered) {
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
    const dayRet = mean(
      taken.map((t) => netReturn(t.returnPctGross, scenario.costPctPerSide, scenario.slippagePctPerSide)),
    );
    dailyReturns.push(round3(dayRet));
    outDates.push(d);
    tradeCount += taken.length;
  }
  return { dailyReturns, dates: outDates, tradeCount };
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
  };
}

function runMonteCarlo10000(dailyReturns: number[], dates: string[]) {
  const rng = mulberry32(20260604);
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
    const m = metricsFromDaily(sample, sampleDates);
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
    profitFactor: { p5: percentile(mcPf, 0.05), p50: percentile(mcPf, 0.5), p95: percentile(mcPf, 0.95) },
    probSharpeAbove08: round3(mcSharpe.filter((s) => s >= 0.8).length / mcSharpe.length),
    probMaxDdAboveMinus20: round3(mcMaxDd.filter((d) => d >= -20).length / mcMaxDd.length),
  };
}

describe('Case4 candidate overfitting audit', () => {
  it('writes walk-forward, friction, period splits, and comparison table', async () => {
    const allSignals: Signal[] = [];
    for (const sym of SYMBOLS) {
      const bars = await fetchYahooOhlcv(sym);
      allSignals.push(...buildSignals(bars, sym));
    }

    const baseScenario = (overrides: Partial<Scenario>): Scenario => ({
      id: 'baseline',
      labelJa: '現行フル期間（コストなし）',
      symbols: SYMBOLS,
      dateFrom: SIGNAL_START,
      dateTo: null,
      costPctPerSide: 0,
      slippagePctPerSide: 0,
      ...overrides,
    });

    const scenarios: Scenario[] = [
      baseScenario({ id: 'current_full', labelJa: '【基準】現行結果 2024-06〜' }),
      baseScenario({
        id: 'wf_train_2024',
        labelJa: 'WF: 学習2024（2024-06〜12）',
        dateFrom: SIGNAL_START,
        dateTo: '2024-12-31',
      }),
      baseScenario({
        id: 'wf_test_2025',
        labelJa: 'WF: 検証2025',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      }),
      baseScenario({
        id: 'wf_train_2024_2025',
        labelJa: 'WF: 学習2024-2025',
        dateFrom: SIGNAL_START,
        dateTo: '2025-12-31',
      }),
      baseScenario({
        id: 'wf_test_2026',
        labelJa: 'WF: 検証2026',
        dateFrom: '2026-01-01',
        dateTo: null,
      }),
      baseScenario({ id: 'year_2025_only', labelJa: '2025年のみ', dateFrom: '2025-01-01', dateTo: '2025-12-31' }),
      baseScenario({ id: 'year_2026_only', labelJa: '2026年のみ', dateFrom: '2026-01-01', dateTo: null }),
      baseScenario({ id: 'schd_only', labelJa: 'SCHDのみ', symbols: ['SCHD'] }),
      baseScenario({ id: 'spy_only', labelJa: 'SPYのみ', symbols: ['SPY'] }),
      ...[0.1, 0.25, 0.5].map((c) =>
        baseScenario({
          id: `cost_${c}`,
          labelJa: `取引コスト ${c}%/片道`,
          costPctPerSide: c,
        }),
      ),
      ...[0.1, 0.25].map((s) =>
        baseScenario({
          id: `slip_${s}`,
          labelJa: `スリッページ ${s}%/片道`,
          slippagePctPerSide: s,
        }),
      ),
      ...[0.1, 0.25, 0.5].flatMap((c) =>
        [0.1, 0.25].map((s) =>
          baseScenario({
            id: `cost_${c}_slip_${s}`,
            labelJa: `コスト${c}%+スリップ${s}%/片道`,
            costPctPerSide: c,
            slippagePctPerSide: s,
          }),
        ),
      ),
    ];

    const rows = scenarios.map((sc) => {
      const { dailyReturns, dates, tradeCount } = runScenario(allSignals, sc);
      const m = metricsFromDaily(dailyReturns, dates);
      return {
        scenarioId: sc.id,
        labelJa: sc.labelJa,
        costPctPerSide: sc.costPctPerSide,
        slippagePctPerSide: sc.slippagePctPerSide,
        symbols: sc.symbols.join('+'),
        dateFrom: sc.dateFrom,
        dateTo: sc.dateTo,
        tradeCount,
        tradesAbove30: tradeCount >= MIN_TRADES_TARGET,
        ...m,
      };
    });

    const baseline = rows.find((r) => r.scenarioId === 'current_full')!;
    const comparisonTable = rows.map((r) => {
      const delta = (v: number | null, b: number | null) =>
        v != null && b != null ? round3(v - b) : null;
      return {
        ...r,
        vsBaseline: {
          sharpeDelta: delta(r.sharpe, baseline.sharpe),
          maxDrawdownPctDelta: delta(r.maxDrawdownPct, baseline.maxDrawdownPct),
          profitFactorDelta: delta(r.profitFactor, baseline.profitFactor),
          cagrPctDelta: delta(r.cagrPct, baseline.cagrPct),
          tradeCountDelta: r.tradeCount - baseline.tradeCount,
          finalBalanceUsdDelta: round2(r.finalBalanceUsd - baseline.finalBalanceUsd),
        },
      };
    });

    const { dailyReturns: baseDaily, dates: baseDates } = runScenario(
      allSignals,
      baseScenario({ id: 'mc', labelJa: '' }),
    );
    const monteCarlo10000 = runMonteCarlo10000(baseDaily, baseDates);

    const walkForwardSummaryJa = {
      split1: {
        train2024: comparisonTable.find((r) => r.scenarioId === 'wf_train_2024'),
        test2025: comparisonTable.find((r) => r.scenarioId === 'wf_test_2025'),
        interpretationJa:
          '固定パラメータのため閾値再最適化はなし。2024後半の in-sample と 2025 out-of-sample を比較。',
      },
      split2: {
        train2024_2025: comparisonTable.find((r) => r.scenarioId === 'wf_train_2024_2025'),
        test2026: comparisonTable.find((r) => r.scenarioId === 'wf_test_2026'),
        interpretationJa: '2026は検証専用（サンプル期間が短い可能性あり）。',
      },
    };

    const report = {
      candidateJa: {
        universe: 'SCHD + SPY',
        adx: `> ${ADX_MIN}`,
        macd: `> ${MACD_MIN}`,
        dist52w: `<= ${DIST52_MAX}%`,
        maxConcurrent: MAX_CONCURRENT,
        holdDays: HOLD_DAYS,
        signalStart: SIGNAL_START,
        capitalJa: '固定$10,000・複利なし・等ウェイト',
      },
      minTradesTarget: MIN_TRADES_TARGET,
      baselineFullPeriod: baseline,
      monteCarlo10000,
      walkForwardSummaryJa,
      comparisonTable,
      overfittingVerdictJa: (() => {
        const t2025 = rows.find((r) => r.scenarioId === 'wf_test_2025');
        const t2026 = rows.find((r) => r.scenarioId === 'wf_test_2026');
        const cost05 = rows.find((r) => r.scenarioId === 'cost_0.5');
        const lines: string[] = [];
        lines.push(
          baseline.tradeCount >= MIN_TRADES_TARGET
            ? `フル期間トレード数 ${baseline.tradeCount} >= ${MIN_TRADES_TARGET} を満たす。`
            : `フル期間トレード数 ${baseline.tradeCount} は ${MIN_TRADES_TARGET} 未満。`,
        );
        if (t2025) {
          lines.push(
            `2025検証: Sharpe ${t2025.sharpe}, MaxDD ${t2025.maxDrawdownPct}%, トレード ${t2025.tradeCount}件。`,
          );
        }
        if (t2026) {
          lines.push(
            `2026検証: Sharpe ${t2026.sharpe}, MaxDD ${t2026.maxDrawdownPct}%, トレード ${t2026.tradeCount}件（期間短い注意）。`,
          );
        }
        if (cost05) {
          lines.push(`コスト0.5%/片道後: Sharpe ${cost05.sharpe}, 残高 $${cost05.finalBalanceUsd}。`);
        }
        lines.push(
          `MC10000: Sharpe p50=${monteCarlo10000.sharpe.p50}, P(Sharpe>=0.8)=${monteCarlo10000.probSharpeAbove08}, MaxDD p50=${monteCarlo10000.maxDrawdownPct.p50}%。`,
        );
        return lines;
      })(),
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-overfitting-audit');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'audit-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csvHeader =
      'scenario,label,sharpe,sortino,maxDD_pct,PF,cagr_pct,finalUsd,trades,trades_ge_30,sharpe_vs_base,maxDD_vs_base';
    const csvRows = comparisonTable.map((r) =>
      [
        r.scenarioId,
        `"${r.labelJa}"`,
        r.sharpe ?? '',
        r.sortino ?? '',
        r.maxDrawdownPct ?? '',
        r.profitFactor ?? '',
        r.cagrPct ?? '',
        r.finalBalanceUsd,
        r.tradeCount,
        r.tradesAbove30,
        r.vsBaseline.sharpeDelta ?? '',
        r.vsBaseline.maxDrawdownPctDelta ?? '',
      ].join(','),
    );
    fs.writeFileSync(path.join(outDir, 'comparison-table.csv'), `${csvHeader}\n${csvRows.join('\n')}\n`, 'utf8');

    console.log('\n=== CASE4 OVERFITTING AUDIT ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
