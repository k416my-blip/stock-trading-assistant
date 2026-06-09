/**
 * 2025依存度 — 6ETF統合のETF別・年別・除外分析
 * npx vitest run tests/unit/case4Hold25Y2025DependencyAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const ALL_ETFS = ['SCHD', 'SPY', 'VYM', 'VIG', 'DGRO', 'SPLG'] as const;
type Etf = (typeof ALL_ETFS)[number];

const HOLD_DAYS = 25;
const MAX_CONCURRENT = 2;
const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';
const YEARS = ['2024', '2025', '2026'] as const;

const ADX_MIN = 25;
const MACD_MIN = 0.1;
const DIST52_MAX = -3;

const ETF_PRIORITY: Record<Etf, number> = {
  SCHD: 6,
  VIG: 5,
  DGRO: 4,
  VYM: 3,
  SPLG: 2,
  SPY: 1,
};

const UNIVERSE_STEPS: Array<{ labelJa: string; symbols: readonly Etf[] }> = [
  { labelJa: 'SCHD+SPY', symbols: ['SCHD', 'SPY'] },
  { labelJa: '+VYM', symbols: ['SCHD', 'SPY', 'VYM'] },
  { labelJa: '+VIG', symbols: ['SCHD', 'SPY', 'VYM', 'VIG'] },
  { labelJa: '+DGRO', symbols: ['SCHD', 'SPY', 'VYM', 'VIG', 'DGRO'] },
  { labelJa: '+SPLG', symbols: [...ALL_ETFS] },
];

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

type Signal = { date: string; symbol: Etf; returnPct: number; year: string };
type ExecutedTrade = Signal;

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

function toSignals(raw: RawBar[], universe: readonly Etf[], yearFilter: string | null): Signal[] {
  const set = new Set(universe);
  return raw
    .filter(
      (r) =>
        set.has(r.symbol) &&
        r.adx14 > ADX_MIN &&
        r.macdHistPct > MACD_MIN &&
        r.dist52wPct <= DIST52_MAX &&
        (yearFilter == null || r.year === yearFilter),
    )
    .map((r) => ({ date: r.date, symbol: r.symbol, returnPct: r.returnPct, year: r.year }));
}

function runPortfolio(
  signals: Signal[],
  maxConcurrent: number,
): { dailyReturns: number[]; dates: string[]; executed: ExecutedTrade[] } {
  const byDate = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const dates = [...byDate.keys()].sort();
  const dailyReturns: number[] = [];
  const outDates: string[] = [];
  const executed: ExecutedTrade[] = [];
  for (const d of dates) {
    const day = [...byDate.get(d)!].sort((a, b) => ETF_PRIORITY[b.symbol] - ETF_PRIORITY[a.symbol]);
    const taken = day.slice(0, maxConcurrent);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    outDates.push(d);
    executed.push(...taken);
  }
  return { dailyReturns, dates: outDates, executed };
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

function countBySymbol(trades: ExecutedTrade[]): Record<Etf, number> {
  const c = Object.fromEntries(ALL_ETFS.map((s) => [s, 0])) as Record<Etf, number>;
  for (const t of trades) c[t.symbol]++;
  return c;
}

function countBySymbolYear(trades: ExecutedTrade[]): Record<Etf, Record<string, number>> {
  const c = Object.fromEntries(ALL_ETFS.map((s) => [s, { '2024': 0, '2025': 0, '2026': 0 }])) as Record<
    Etf,
    Record<string, number>
  >;
  for (const t of trades) c[t.symbol][t.year] = (c[t.symbol][t.year] ?? 0) + 1;
  return c;
}

function pct(part: number, whole: number): number | null {
  return whole === 0 ? null : round3((part / whole) * 100);
}

describe('Case4 2025 dependency analysis', () => {
  it('writes ETF-level, yearly, leave-one-out, and 2025 increment attribution', async () => {
    const raw: RawBar[] = [];
    for (const sym of ALL_ETFS) {
      raw.push(...buildRaw(await fetchYahooOhlcv(sym), sym));
    }

    const fullSignals = toSignals(raw, ALL_ETFS, null);
    const fullRun = runPortfolio(fullSignals, MAX_CONCURRENT);
    const fullM = metricsFromDaily(fullRun.dailyReturns, fullRun.dates);

    const rawSignalCounts = Object.fromEntries(
      ALL_ETFS.map((sym) => {
        const sigs = toSignals(raw, [sym], null);
        const byYear = Object.fromEntries(YEARS.map((y) => [y, sigs.filter((s) => s.year === y).length]));
        return [sym, { total: sigs.length, byYear }] as const;
      }),
    );

    const executedFull = fullRun.executed;
    const executedByEtf = countBySymbol(executedFull);
    const executedByEtfYear = countBySymbolYear(executedFull);

    const perEtfStandalone = Object.fromEntries(
      ALL_ETFS.map((sym) => {
        const sigs = toSignals(raw, [sym], null);
        const run = runPortfolio(sigs, 1);
        const m = metricsFromDaily(run.dailyReturns, run.dates);
        const byYear = Object.fromEntries(
          YEARS.map((y) => {
            const ys = toSignals(raw, [sym], y);
            const yr = runPortfolio(ys, 1);
            const ym = metricsFromDaily(yr.dailyReturns, yr.dates);
            return [
              y,
              {
                tradeCount: yr.executed.length,
                sharpe: ym.sharpe,
                profitFactor: ym.profitFactor,
                maxDrawdownPct: ym.maxDrawdownPct,
              },
            ] as const;
          }),
        );
        return [
          sym,
          {
            tradeCount: run.executed.length,
            sharpe: m.sharpe,
            profitFactor: m.profitFactor,
            maxDrawdownPct: m.maxDrawdownPct,
            byYear,
          },
        ] as const;
      }),
    );

    const executed2025 = executedFull.filter((t) => t.year === '2025');
    const trades2025Total = executed2025.length;
    const executed2025ByEtf = countBySymbol(executed2025);

    const stepwise2025 = UNIVERSE_STEPS.map((step, i) => {
      const run = runPortfolio(toSignals(raw, step.symbols, '2025'), MAX_CONCURRENT);
      const prev = i > 0 ? runPortfolio(toSignals(raw, UNIVERSE_STEPS[i - 1]!.symbols, '2025'), MAX_CONCURRENT) : null;
      const delta = prev ? run.executed.length - prev.executed.length : run.executed.length;
      const addedEtf = i > 0 ? step.symbols[step.symbols.length - 1]! : null;
      return {
        step: step.labelJa,
        trades2025: run.executed.length,
        deltaVsPrev: delta,
        addedEtf,
        bySymbol: countBySymbol(run.executed),
      };
    });

    const leaveOneOut = ALL_ETFS.map((excluded) => {
      const universe = ALL_ETFS.filter((s) => s !== excluded);
      const run = runPortfolio(toSignals(raw, universe, null), MAX_CONCURRENT);
      const m = metricsFromDaily(run.dailyReturns, run.dates);
      const y2025 = run.executed.filter((t) => t.year === '2025').length;
      return {
        excluded,
        universe: [...universe],
        tradeCount: run.executed.length,
        trades2025: y2025,
        tradesLostVsFull: executedFull.length - run.executed.length,
        trades2025Lost: trades2025Total - y2025,
        sharpe: m.sharpe,
        maxDrawdownPct: m.maxDrawdownPct,
        profitFactor: m.profitFactor,
      };
    });

    const y2025LeaveOneOutAttribution = ALL_ETFS.map((excluded) => {
      const universe = ALL_ETFS.filter((s) => s !== excluded);
      const without = runPortfolio(toSignals(raw, universe, '2025'), MAX_CONCURRENT).executed.length;
      return {
        etf: excluded,
        trades2025WithoutThisEtf: without,
        trades2025AttributedToEtf: trades2025Total - without,
        pctOf2025Trades: pct(trades2025Total - without, trades2025Total),
      };
    });

    const yearTotals = Object.fromEntries(
      YEARS.map((y) => [y, executedFull.filter((t) => t.year === y).length]),
    ) as Record<string, number>;
    const totalTrades = executedFull.length;

    const report = {
      strategyJa: {
        universe: [...ALL_ETFS],
        dist52w: `<= ${DIST52_MAX}%`,
        adx: `> ${ADX_MIN}`,
        macd: `> ${MACD_MIN}`,
        holdDays: HOLD_DAYS,
        maxConcurrent: MAX_CONCURRENT,
      },
      integratedFullPeriod: {
        tradeCount: totalTrades,
        sharpe: fullM.sharpe,
        maxDrawdownPct: fullM.maxDrawdownPct,
        profitFactor: fullM.profitFactor,
        tradesByYear: yearTotals,
        pct2025OfAllTrades: pct(yearTotals['2025']!, totalTrades),
      },
      item1_executedTradesByEtf: executedByEtf,
      item1_rawQualifyingSignalsByEtf: rawSignalCounts,
      item2_executedByEtfAndYear: executedByEtfYear,
      item2_pct2025ShareByEtf: Object.fromEntries(
        ALL_ETFS.map((s) => [
          s,
          {
            trades2025: executed2025ByEtf[s],
            pctOfAll2025Trades: pct(executed2025ByEtf[s], trades2025Total),
            pctOfEtfOwnTradesIn2025: pct(executed2025ByEtf[s], executedByEtf[s]),
          },
        ]),
      ),
      item3_perEtfStandaloneMetrics: perEtfStandalone,
      item4_2025IncrementAnalysis: {
        trades2025Total,
        baselineSchdSpy2025: stepwise2025[0]!.trades2025,
        netIncrementVsBaseline: trades2025Total - stepwise2025[0]!.trades2025,
        executedShareByEtfIn2025: executed2025ByEtf,
        pctShareByEtfIn2025: Object.fromEntries(
          ALL_ETFS.map((s) => [s, pct(executed2025ByEtf[s], trades2025Total)]),
        ),
        stepwiseUniverseExpansion2025: stepwise2025,
        leaveOneOut2025Attribution: y2025LeaveOneOutAttribution,
      },
      item5_leaveOneOutFullPeriod: leaveOneOut,
      diagnosisJa: (() => {
        const top2025Share = [...ALL_ETFS].sort((a, b) => executed2025ByEtf[b] - executed2025ByEtf[a])[0]!;
        const topAttr = [...y2025LeaveOneOutAttribution].sort(
          (a, b) => b.trades2025AttributedToEtf - a.trades2025AttributedToEtf,
        )[0]!;
        const splgOut = leaveOneOut.find((x) => x.excluded === 'SPLG')!;
        const dgroOut = leaveOneOut.find((x) => x.excluded === 'DGRO')!;
        return [
          `全${totalTrades}件のうち2025が${yearTotals['2025']}件（${pct(yearTotals['2025']!, totalTrades)}%）— 2025依存が高い。`,
          `2025実行件数の最多シンボル: ${top2025Share}（${executed2025ByEtf[top2025Share]}件、${pct(executed2025ByEtf[top2025Share], trades2025Total)}%）。`,
          `除外時に2025が最も減るETF（限界貢献）: ${topAttr.etf}（-${topAttr.trades2025AttributedToEtf}件相当）。`,
          `SPLG除外→全期間${splgOut.tradeCount}件/Sharpe${splgOut.sharpe}/MaxDD${splgOut.maxDrawdownPct}%。DGRO除外→${dgroOut.tradeCount}件。`,
          splgOut.trades2025Lost <= 3 && dgroOut.trades2025Lost <= 3
            ? 'SPLG・DGROは件数増の主因ではなく、VYM/VIG/SCHDが2025の体を作っている可能性が高い。'
            : 'DGRO/SPLGも2025件数に一定の限界貢献あり。',
        ].join(' ');
      })(),
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-hold25-2025-dependency');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csvLines = [
      'section,key,metric,value',
      ...ALL_ETFS.flatMap((s) => [
        `item1,${s},executed_total,${executedByEtf[s]}`,
        `item1,${s},raw_signals_total,${rawSignalCounts[s]!.total}`,
      ]),
      ...ALL_ETFS.flatMap((s) =>
        YEARS.flatMap((y) => [`item2,${s},${y},${executedByEtfYear[s][y]}`]),
      ),
      ...ALL_ETFS.map(
        (s) =>
          `item3,${s},sharpe,${perEtfStandalone[s]!.sharpe ?? ''},PF,${perEtfStandalone[s]!.profitFactor ?? ''},maxDD,${perEtfStandalone[s]!.maxDrawdownPct ?? ''},trades,${perEtfStandalone[s]!.tradeCount}`,
      ),
      ...ALL_ETFS.map(
        (s) =>
          `item5,exclude_${s},trades,${leaveOneOut.find((x) => x.excluded === s)!.tradeCount},sharpe,${leaveOneOut.find((x) => x.excluded === s)!.sharpe},maxDD,${leaveOneOut.find((x) => x.excluded === s)!.maxDrawdownPct}`,
      ),
    ];
    fs.writeFileSync(path.join(outDir, 'summary.csv'), `${csvLines.join('\n')}\n`, 'utf8');

    console.log('\n=== 2025 DEPENDENCY ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
