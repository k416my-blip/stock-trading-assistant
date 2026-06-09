/**
 * Hold period comparison — fixed dist<=-7%, SCHD+SPY
 * npx vitest run tests/unit/case4HoldPeriodComparison.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const SYMBOLS = ['SCHD', 'SPY'] as const;
type Sym = (typeof SYMBOLS)[number];
const HOLD_GRID = [10, 15, 20, 25, 30, 40] as const;
const YEARS = ['2024', '2025', '2026'] as const;

const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';
const MAX_CONCURRENT = 2;
const ADX_MIN = 25;
const MACD_MIN = 0.15;
const DIST52_MAX = -7;

type OhlcvBar = { date: string; high: number; low: number; close: number };
type SignalBase = {
  date: string;
  year: string;
  symbol: Sym;
  adx: number;
  macd: number;
  dist52: number;
  retByHold: Record<number, number>;
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

function buildSignalBases(bars: OhlcvBar[], symbol: Sym): SignalBase[] {
  const closes = bars.map((b) => b.close);
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1);
    let v = arr[0]!;
    for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
    return v;
  };
  const maxHold = Math.max(...HOLD_GRID);
  const out: SignalBase[] = [];
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
    if (entryIdx + maxHold >= bars.length) continue;
    const entry = bars[entryIdx]!.close;
    if (entry <= 0) continue;
    const retByHold: Record<number, number> = {};
    for (const h of HOLD_GRID) {
      const exitIdx = entryIdx + h;
      if (exitIdx >= bars.length) continue;
      retByHold[h] = round3(((bars[exitIdx]!.close / entry - 1) * 100));
    }
    if (Object.keys(retByHold).length !== HOLD_GRID.length) continue;
    out.push({
      date,
      year: date.slice(0, 4),
      symbol,
      adx,
      macd,
      dist52,
      retByHold,
    });
  }
  return out;
}

function runForHold(
  bases: SignalBase[],
  holdDays: number,
  yearFilter: string | null,
) {
  const filtered = bases.filter((b) => yearFilter == null || b.year === yearFilter);
  const byDate = new Map<string, SignalBase[]>();
  for (const b of filtered) {
    const arr = byDate.get(b.date) ?? [];
    arr.push(b);
    byDate.set(b.date, arr);
  }
  const dates = [...byDate.keys()].sort();
  const dailyReturns: number[] = [];
  const outDates: string[] = [];
  let tradeCount = 0;
  for (const d of dates) {
    const day = [...byDate.get(d)!].sort((a, b) => (b.symbol === 'SCHD' ? 1 : 0) - (a.symbol === 'SCHD' ? 1 : 0));
    const taken = day.slice(0, MAX_CONCURRENT);
    dailyReturns.push(round3(mean(taken.map((t) => t.retByHold[holdDays]!))));
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
  };
}

function rowForPeriod(bases: SignalBase[], hold: number, year: string | null) {
  const run = runForHold(bases, hold, year);
  const m = metrics(run.dailyReturns, run.dates);
  return { tradeCount: run.tradeCount, ...m };
}

describe('hold period comparison dist<=-7%', () => {
  it('writes comparison table by hold days and year', async () => {
    const bases: SignalBase[] = [];
    for (const sym of SYMBOLS) {
      bases.push(...buildSignalBases(await fetchYahooOhlcv(sym), sym));
    }

    const baseline20 = rowForPeriod(bases, 20, null);

    const rows = HOLD_GRID.map((hold) => {
      const byYear = Object.fromEntries(
        YEARS.map((y) => [y, rowForPeriod(bases, hold, y)]),
      ) as Record<(typeof YEARS)[number], ReturnType<typeof rowForPeriod>>;
      const full = rowForPeriod(bases, hold, null);
      return {
        holdDays: hold,
        byYear,
        fullPeriod: full,
        vsBaseline20: {
          tradeCountDelta: full.tradeCount - baseline20.tradeCount,
          maxDrawdownPctDelta:
            full.maxDrawdownPct != null && baseline20.maxDrawdownPct != null
              ? round2(full.maxDrawdownPct - baseline20.maxDrawdownPct)
              : null,
          sharpeDelta:
            full.sharpe != null && baseline20.sharpe != null ? round3(full.sharpe - baseline20.sharpe) : null,
        },
      };
    });

    const bestForGoal = rows
      .filter((r) => r.fullPeriod.maxDrawdownPct != null && r.fullPeriod.maxDrawdownPct >= baseline20.maxDrawdownPct!)
      .sort((a, b) => b.fullPeriod.tradeCount - a.fullPeriod.tradeCount)[0];

    const report = {
      fixedJa: {
        universe: 'SCHD + SPY',
        adx: `> ${ADX_MIN}`,
        macd: `> ${MACD_MIN}`,
        dist52w: `<= ${DIST52_MAX}%`,
        maxConcurrent: MAX_CONCURRENT,
        noteJa: 'トレード数はエントリー条件のみで決まるため保有期間で同一（末尾バー不足時のみ微差）',
      },
      baselineHold20: baseline20,
      holdPeriodComparison: rows,
      comparisonTableFlat: rows.flatMap((r) => [
        { period: 'full', holdDays: r.holdDays, ...r.fullPeriod, ...r.vsBaseline20 },
        ...YEARS.map((y) => ({ period: y, holdDays: r.holdDays, ...r.byYear[y] })),
      ]),
      analysisJa: {
        tradeCountVariesByHold: rows.some((a, i, arr) => a.fullPeriod.tradeCount !== arr[0]!.fullPeriod.tradeCount),
        tradeCounts: rows.map((r) => ({ hold: r.holdDays, trades: r.fullPeriod.tradeCount })),
        maxDdMaintainedAndMoreTradesPossible: bestForGoal
          ? `保有${bestForGoal.holdDays}日はMaxDD維持かつ件数${bestForGoal.fullPeriod.tradeCount}（ベース${baseline20.tradeCount}）`
          : 'MaxDDを維持しつつトレード数を増やすことは保有期間変更では不可（件数は同一）',
        conclusionJa: [
          '発火数（トレード数）はフィルタで固定され、保有期間を変えてもシグナル件数は基本的に同じ。',
          '保有期間はリターン経路・Sharpe・MaxDD・最終残高にのみ影響。',
          rows
            .map(
              (r) =>
                `${r.holdDays}日: 全期間 Sharpe ${r.fullPeriod.sharpe} MaxDD ${r.fullPeriod.maxDrawdownPct}% 残高 $${r.fullPeriod.finalBalanceUsd} (${r.fullPeriod.tradeCount}件)`,
            )
            .join(' | '),
        ],
      },
    };

    const outDir = path.join(process.cwd(), 'scripts', 'hold-period-comparison');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const header =
      'hold_days,period,trades,sharpe,maxDD_pct,PF,cagr_pct,final_usd,dd_delta_vs_20d,sharpe_delta_vs_20d';
    const lines = [header];
    for (const r of rows) {
      lines.push(
        [
          r.holdDays,
          'full',
          r.fullPeriod.tradeCount,
          r.fullPeriod.sharpe ?? '',
          r.fullPeriod.maxDrawdownPct ?? '',
          r.fullPeriod.profitFactor ?? '',
          r.fullPeriod.cagrPct ?? '',
          r.fullPeriod.finalBalanceUsd,
          r.vsBaseline20.maxDrawdownPctDelta ?? '',
          r.vsBaseline20.sharpeDelta ?? '',
        ].join(','),
      );
      for (const y of YEARS) {
        const yr = r.byYear[y]!;
        lines.push(
          [
            r.holdDays,
            y,
            yr.tradeCount,
            yr.sharpe ?? '',
            yr.maxDrawdownPct ?? '',
            yr.profitFactor ?? '',
            yr.cagrPct ?? '',
            yr.finalBalanceUsd,
            '',
            '',
          ].join(','),
        );
      }
    }
    fs.writeFileSync(path.join(outDir, 'comparison.csv'), `${lines.join('\n')}\n`, 'utf8');

    console.log('\n=== HOLD PERIOD COMPARISON ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
