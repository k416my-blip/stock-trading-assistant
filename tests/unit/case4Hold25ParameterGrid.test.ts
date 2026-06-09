/**
 * Hold 25d primary — dist52 × ADX × MACD grid (SCHD+SPY)
 * npx vitest run tests/unit/case4Hold25ParameterGrid.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const SYMBOLS = ['SCHD', 'SPY'] as const;
type Sym = (typeof SYMBOLS)[number];
const HOLD_DAYS = 25;
const MAX_CONCURRENT = 2;
const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';
const YEARS = ['2024', '2025', '2026'] as const;

const DIST_GRID = [-7, -6, -5, -4, -3] as const;
const ADX_GRID = [25, 22, 20] as const;
const MACD_GRID = [0.15, 0.12, 0.1] as const;

const GOAL_MAX_DD = -20;
const GOAL_SHARPE = 0.8;
const GOAL_MIN_TRADES = 100;

type OhlcvBar = { date: string; high: number; low: number; close: number };
type RawBar = {
  date: string;
  year: string;
  symbol: Sym;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
  returnPct: number;
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
      adx14: round3(adx),
      macdHistPct: round3(macd),
      dist52wPct: round3(dist52),
      returnPct: round3(((bars[exitIdx]!.close / entry - 1) * 100)),
    });
  }
  return out;
}

function runCombo(
  raw: RawBar[],
  adxMin: number,
  macdMin: number,
  distMax: number,
  yearFilter: string | null,
) {
  const picks = raw.filter(
    (r) => r.adx14 > adxMin && r.macdHistPct > macdMin && r.dist52wPct <= distMax && (yearFilter == null || r.year === yearFilter),
  );
  const byDate = new Map<string, RawBar[]>();
  for (const p of picks) {
    const arr = byDate.get(p.date) ?? [];
    arr.push(p);
    byDate.set(p.date, arr);
  }
  const dates = [...byDate.keys()].sort();
  const dailyReturns: number[] = [];
  const outDates: string[] = [];
  let tradeCount = 0;
  let wins = 0;
  for (const d of dates) {
    const day = [...byDate.get(d)!].sort((a, b) => (b.symbol === 'SCHD' ? 1 : 0) - (a.symbol === 'SCHD' ? 1 : 0));
    const taken = day.slice(0, MAX_CONCURRENT);
    const rets = taken.map((t) => t.returnPct);
    dailyReturns.push(round3(mean(rets)));
    outDates.push(d);
    tradeCount += taken.length;
    wins += rets.filter((r) => r > 0).length;
  }
  return { dailyReturns, dates: outDates, tradeCount, tradeWinRate: tradeCount > 0 ? wins / tradeCount : 0 };
}

function metrics(dailyReturns: number[], dates: string[], tradeCount: number, tradeWinRate: number) {
  if (dailyReturns.length === 0) {
    return {
      sharpe: null as number | null,
      maxDrawdownPct: null as number | null,
      profitFactor: null as number | null,
      cagrPct: null as number | null,
      winRate: null as number | null,
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
    winRate: round3(tradeWinRate),
  };
}

function priorityScore(r: {
  maxDrawdownPct: number | null;
  sharpe: number | null;
  tradeCount: number;
  firesAllYears: boolean;
}): number {
  let s = 0;
  if (r.maxDrawdownPct != null && r.maxDrawdownPct >= GOAL_MAX_DD) s += 10_000;
  if ((r.sharpe ?? -1) >= GOAL_SHARPE) s += 5_000;
  if (r.tradeCount >= GOAL_MIN_TRADES) s += 2_500;
  if (r.firesAllYears) s += 1_000;
  s += Math.min(r.tradeCount, 200);
  s += (r.sharpe ?? 0) * 50;
  if (r.maxDrawdownPct != null) s += r.maxDrawdownPct * 5;
  return s;
}

describe('Case4 hold 25d parameter grid', () => {
  it('writes full dist×adx×macd grid ranked by priority', async () => {
    const raw: RawBar[] = [];
    for (const sym of SYMBOLS) {
      raw.push(...buildRaw(await fetchYahooOhlcv(sym), sym));
    }

    const combos: Array<{
      dist52Max: number;
      adxMin: number;
      macdMin: number;
      tradeCount: number;
      sharpe: number | null;
      maxDrawdownPct: number | null;
      profitFactor: number | null;
      winRate: number | null;
      cagrPct: number | null;
      firesAllYears: boolean;
      tradesByYear: Record<string, number>;
      checks: {
        maxDdOk: boolean;
        sharpeOk: boolean;
        trades100: boolean;
        allYears: boolean;
        meetsAllFour: boolean;
      };
      priorityScore: number;
      rank: number;
    }> = [];

    for (const distMax of DIST_GRID) {
      for (const adxMin of ADX_GRID) {
        for (const macdMin of MACD_GRID) {
          const byYear: Record<string, number> = {};
          const fires: Record<string, boolean> = {};
          for (const y of YEARS) {
            const run = runCombo(raw, adxMin, macdMin, distMax, y);
            byYear[y] = run.tradeCount;
            fires[y] = run.tradeCount > 0;
          }
          const full = runCombo(raw, adxMin, macdMin, distMax, null);
          const m = metrics(full.dailyReturns, full.dates, full.tradeCount, full.tradeWinRate);
          const firesAllYears = YEARS.every((y) => fires[y]!);
          const row = {
            dist52Max: distMax,
            adxMin,
            macdMin,
            tradeCount: full.tradeCount,
            ...m,
            firesAllYears,
            tradesByYear: byYear,
            checks: {
              maxDdOk: m.maxDrawdownPct != null && m.maxDrawdownPct >= GOAL_MAX_DD,
              sharpeOk: (m.sharpe ?? -1) >= GOAL_SHARPE,
              trades100: full.tradeCount >= GOAL_MIN_TRADES,
              allYears: firesAllYears,
              meetsAllFour: false,
            },
            priorityScore: 0,
            rank: 0,
          };
          row.checks.meetsAllFour = row.checks.maxDdOk && row.checks.sharpeOk && row.checks.trades100 && row.checks.allYears;
          row.priorityScore = priorityScore(row);
          combos.push(row);
        }
      }
    }

    combos.sort((a, b) => b.priorityScore - a.priorityScore);
    combos.forEach((c, i) => {
      c.rank = i + 1;
    });

    const baseline = combos.find((c) => c.dist52Max === -7 && c.adxMin === 25 && c.macdMin === 0.15);

    const marginalDist = DIST_GRID.map((d) => {
      const subset = combos.filter((c) => c.adxMin === 25 && c.macdMin === 0.15);
      const row = subset.find((c) => c.dist52Max === d);
      return { dist52Max: d, tradeCount: row?.tradeCount ?? 0, sharpe: row?.sharpe, maxDD: row?.maxDrawdownPct };
    });
    const marginalAdx = ADX_GRID.map((a) => {
      const row = combos.find((c) => c.dist52Max === -7 && c.adxMin === a && c.macdMin === 0.15);
      return { adxMin: a, tradeCount: row?.tradeCount ?? 0, sharpe: row?.sharpe, maxDD: row?.maxDrawdownPct };
    });
    const marginalMacd = MACD_GRID.map((m) => {
      const row = combos.find((c) => c.dist52Max === -7 && c.adxMin === 25 && c.macdMin === m);
      return { macdMin: m, tradeCount: row?.tradeCount ?? 0, sharpe: row?.sharpe, maxDD: row?.maxDrawdownPct };
    });

    const report = {
      fixedJa: {
        universe: 'SCHD + SPY',
        holdDays: HOLD_DAYS,
        maxConcurrent: MAX_CONCURRENT,
        period: `${SIGNAL_START}〜`,
      },
      goalsJa: ['① MaxDD<20%', '② Sharpe>0.8', '③ トレード>=100', '④ 2024/25/26全年度発火'],
      gridSize: { dist: DIST_GRID.length, adx: ADX_GRID.length, macd: MACD_GRID.length, total: combos.length },
      baselineHold25_dist7: baseline,
      meetsAllFourCount: combos.filter((c) => c.checks.meetsAllFour).length,
      top20: combos.slice(0, 20),
      goalPassers: combos.filter((c) => c.checks.maxDdOk && c.checks.sharpeOk),
      trades100Passers: combos.filter((c) => c.checks.trades100),
      marginalAnalysis: { dist52: marginalDist, adx: marginalAdx, macd: marginalMacd },
      recommendationJa: (() => {
        const best = combos[0];
        const all4 = combos.filter((c) => c.checks.meetsAllFour);
        if (all4.length > 0) {
          return `4条件同時達成 ${all4.length}件。最優先: dist<=${all4[0]!.dist52Max}% ADX>${all4[0]!.adxMin} MACD>${all4[0]!.macdMin} (${all4[0]!.tradeCount}件)`;
        }
        const ddSharpe = combos.filter((c) => c.checks.maxDdOk && c.checks.sharpeOk);
        if (ddSharpe.length > 0) {
          const t = [...ddSharpe].sort((a, b) => b.tradeCount - a.tradeCount)[0]!;
          return `MaxDD+Sharpe達成は${ddSharpe.length}件。最多トレード: dist<=${t.dist52Max}% ADX>${t.adxMin} MACD>${t.macdMin} (${t.tradeCount}件、100件${t.checks.trades100 ? '達成' : '未達'})`;
        }
        return `現グリッドで①②同時は${combos.filter((c) => c.checks.maxDdOk && c.checks.sharpeOk).length}件。③100件は要さらに緩和またはETF追加。`;
      })(),
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-hold25-grid');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'grid-ranking.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'rank,dist52,adx,macd,trades,sharpe,maxDD,PF,winRate,cagr,t24,t25,t26,allYears,meet1234',
      ...combos.map((c) =>
        [
          c.rank,
          c.dist52Max,
          c.adxMin,
          c.macdMin,
          c.tradeCount,
          c.sharpe ?? '',
          c.maxDrawdownPct ?? '',
          c.profitFactor ?? '',
          c.winRate ?? '',
          c.cagrPct ?? '',
          c.tradesByYear['2024'],
          c.tradesByYear['2025'],
          c.tradesByYear['2026'],
          c.firesAllYears,
          c.checks.meetsAllFour,
        ].join(','),
      ),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'grid-ranking.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== HOLD25 GRID ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
