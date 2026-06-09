/**
 * pair:dist+adx base strategy + filter sweep walkforward OOS
 * npx vitest run tests/unit/pairDistAdxFilterWalkforwardSweep.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const FORWARD_DAYS = 20;
const ANALYSIS_START = '2024-06-01';
const TRAIN_MONTHS = 6;
const TEST_MONTHS = 1;
const MIN_TRAIN_SAMPLES = 120;
const SCORE_QUANTILES = [0.6, 0.7, 0.8, 0.9];
const INITIAL_CAPITAL = 1_000_000;

const SYMBOL_DEFS = [
  { symbol: '1023', yahooSymbol: '1023.KL' },
  { symbol: '1295', yahooSymbol: '1295.KL' },
  { symbol: '1155', yahooSymbol: '1155.KL' },
  { symbol: 'SPY', yahooSymbol: 'SPY' },
  { symbol: 'QQQ', yahooSymbol: 'QQQ' },
  { symbol: 'SCHD', yahooSymbol: 'SCHD' },
  { symbol: 'JEPI', yahooSymbol: 'JEPI' },
  { symbol: 'VYM', yahooSymbol: 'VYM' },
] as const;

type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };
type SampleRow = {
  date: string;
  month: string;
  symbol: string;
  expectancyPct: number;
  distFrom52wHighPct: number;
  macdHistPct: number;
  adx14: number;
  aboveSma50: boolean;
  aboveSma200: boolean;
};

type FilterDef = { id: string; labelJa: string; pass: (row: SampleRow) => boolean };

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function mean(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function std(vals: number[]): number {
  const m = mean(vals);
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}
function monthStr(date: string): string {
  return date.slice(0, 7);
}
function monthAdd(yyyymm: string, delta: number): string {
  const [y, m] = yyyymm.split('-').map((x) => Number(x));
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function inMonthRange(m: string, start: string, endExclusive: string): boolean {
  return m >= start && m < endExclusive;
}
function quantile(vals: number[], q: number): number {
  const s = [...vals].sort((a, b) => a - b);
  if (s.length === 0) return 0;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo]!;
  const w = pos - lo;
  return s[lo]! * (1 - w) + s[hi]! * w;
}
function pearson(xs: number[], ys: number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]! - mx;
    const y = ys[i]! - my;
    num += x * y;
    dx += x * x;
    dy += y * y;
  }
  if (dx <= 0 || dy <= 0) return 0;
  return num / Math.sqrt(dx * dy);
}
function zNorm(values: number[]): { mean: number; std: number } {
  const m = mean(values);
  const s = std(values);
  return { mean: m, std: s > 1e-9 ? s : 1 };
}

function computeAdx14(bars: OhlcvBar[], idx: number, period = 14): number | null {
  if (idx < period * 2) return null;
  const trList: number[] = [];
  const plusDm: number[] = [];
  const minusDm: number[] = [];
  for (let i = idx - period * 2 + 1; i <= idx; i++) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const ph = bars[i - 1]!.high;
    const pl = bars[i - 1]!.low;
    const pc = bars[i - 1]!.close;
    trList.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    plusDm.push(Math.max(h - ph, 0));
    minusDm.push(Math.max(pl - l, 0));
  }
  const smooth = (arr: number[]) => {
    let s = arr.slice(0, period).reduce((a, b) => a + b, 0);
    const out: number[] = [s];
    for (let i = period; i < arr.length; i++) {
      s = s - s / period + arr[i]!;
      out.push(s);
    }
    return out;
  };
  const trS = smooth(trList);
  const pS = smooth(plusDm);
  const mS = smooth(minusDm);
  const dx: number[] = [];
  for (let i = 0; i < trS.length; i++) {
    if (trS[i]! <= 0) return null;
    const diPlus = (100 * pS[i]!) / trS[i]!;
    const diMinus = (100 * mS[i]!) / trS[i]!;
    const sum = diPlus + diMinus;
    dx.push(sum <= 0 ? 0 : (100 * Math.abs(diPlus - diMinus)) / sum);
  }
  if (dx.length < period) return null;
  return round3(dx.slice(-period).reduce((a, b) => a + b, 0) / period);
}
function computeMacdHistPct(closes: number[], idx: number): number | null {
  if (idx < 35) return null;
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1);
    let v = arr[0]!;
    for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
    return v;
  };
  const slice = closes.slice(0, idx + 1);
  const macd = ema(slice, 12) - ema(slice, 26);
  const signalSlice: number[] = [];
  for (let i = Math.max(0, idx - 8); i <= idx; i++) {
    const s = closes.slice(0, i + 1);
    signalSlice.push(ema(s, 12) - ema(s, 26));
  }
  const signal = ema(signalSlice, 9);
  const hist = macd - signal;
  const c = closes[idx]!;
  if (c <= 0) return null;
  return round4((hist / c) * 100);
}
function computeDistFrom52wHigh(bars: OhlcvBar[], idx: number): number | null {
  const lookback = Math.min(252, idx);
  if (lookback < 60) return null;
  let maxH = -Infinity;
  for (let i = idx - lookback; i <= idx; i++) maxH = Math.max(maxH, bars[i]!.high);
  if (maxH <= 0) return null;
  return round4((bars[idx]!.close / maxH - 1) * 100);
}
function smaAt(closes: number[], idx: number, period: number): number | null {
  if (idx < period - 1) return null;
  return mean(closes.slice(idx - period + 1, idx + 1));
}
function forwardExpectancy(bars: OhlcvBar[], idx: number): number | null {
  const entryIdx = idx + 1;
  const exitIdx = entryIdx + FORWARD_DAYS;
  if (exitIdx >= bars.length) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;
  return round4((bars[exitIdx]!.close / entry - 1) * 100);
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
        indicators?: { quote?: Array<{ high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }> };
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
    const v = q?.volume?.[i];
    if (h == null || l == null || c == null || v == null || !Number.isFinite(c)) continue;
    out.push({ date: new Date(ts[i]! * 1000).toISOString().slice(0, 10), high: h, low: l, close: c, volume: v });
  }
  return out;
}

function buildSamplesForSymbol(symbol: string, bars: OhlcvBar[]): SampleRow[] {
  const rows: SampleRow[] = [];
  const closes = bars.map((b) => b.close);
  for (let idx = 0; idx < bars.length; idx++) {
    const date = bars[idx]!.date;
    if (date < ANALYSIS_START) continue;
    const expectancy = forwardExpectancy(bars, idx);
    const dist52 = computeDistFrom52wHigh(bars, idx);
    const macd = computeMacdHistPct(closes, idx);
    const adx = computeAdx14(bars, idx);
    const sma50 = smaAt(closes, idx, 50);
    const sma200 = smaAt(closes, idx, 200);
    if (expectancy == null || dist52 == null || macd == null || adx == null || sma50 == null || sma200 == null) continue;
    rows.push({
      date,
      month: monthStr(date),
      symbol,
      expectancyPct: expectancy,
      distFrom52wHighPct: dist52,
      macdHistPct: macd,
      adx14: adx,
      aboveSma50: bars[idx]!.close > sma50,
      aboveSma200: bars[idx]!.close > sma200,
    });
  }
  return rows;
}

function buildFilterDefs(): FilterDef[] {
  return [
    { id: 'adx_gt_20', labelJa: 'ADX > 20', pass: (r) => r.adx14 > 20 },
    { id: 'adx_gt_25', labelJa: 'ADX > 25', pass: (r) => r.adx14 > 25 },
    { id: 'adx_gt_30', labelJa: 'ADX > 30', pass: (r) => r.adx14 > 30 },
    { id: 'macd_hist_gt_0', labelJa: 'MACDヒストグラム > 0', pass: (r) => r.macdHistPct > 0 },
    { id: 'above_sma200', labelJa: '200日移動平均線より上', pass: (r) => r.aboveSma200 },
    { id: 'above_sma50', labelJa: '50日移動平均線より上', pass: (r) => r.aboveSma50 },
    { id: 'within_10pct_52w_high', labelJa: '52週高値から10%以内', pass: (r) => r.distFrom52wHighPct >= -10 },
  ];
}

function buildStrategies(filters: FilterDef[]) {
  const strategies: Array<{ id: string; labelJa: string; filterIds: string[] }> = [
    { id: 'base', labelJa: 'base(pair:dist+adx)', filterIds: [] },
  ];
  // all non-empty combinations
  const n = filters.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const ids: string[] = [];
    const labels: string[] = [];
    for (let i = 0; i < n; i++) {
      if ((mask & (1 << i)) !== 0) {
        ids.push(filters[i]!.id);
        labels.push(filters[i]!.labelJa);
      }
    }
    strategies.push({
      id: `combo:${ids.join('+')}`,
      labelJa: labels.join(' + '),
      filterIds: ids,
    });
  }
  return strategies;
}

describe('pair dist+adx filter walkforward sweep', () => {
  it('writes fixed-capital OOS comparison table for requested filters and combinations', async () => {
    const samples: SampleRow[] = [];
    for (const def of SYMBOL_DEFS) {
      const bars = await fetchYahooOhlcv(def.yahooSymbol);
      samples.push(...buildSamplesForSymbol(def.symbol, bars));
    }
    samples.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

    const months = [...new Set(samples.map((s) => s.month))].sort();
    const filters = buildFilterDefs();
    const filterMap = new Map(filters.map((f) => [f.id, f]));
    const strategies = buildStrategies(filters);

    const results = strategies.map((strategy) => {
      const selected: Array<{ date: string; expectancyPct: number }> = [];
      for (const testMonth of months) {
        const trainStart = monthAdd(testMonth, -TRAIN_MONTHS);
        const trainEnd = testMonth;
        const testEnd = monthAdd(testMonth, TEST_MONTHS);

        let trainRows = samples.filter((s) => inMonthRange(s.month, trainStart, trainEnd));
        let testRows = samples.filter((s) => inMonthRange(s.month, testMonth, testEnd));
        for (const fid of strategy.filterIds) {
          const f = filterMap.get(fid)!;
          trainRows = trainRows.filter(f.pass);
          testRows = testRows.filter(f.pass);
        }
        if (trainRows.length < MIN_TRAIN_SAMPLES || testRows.length === 0) continue;

        const distNorm = zNorm(trainRows.map((r) => r.distFrom52wHighPct));
        const adxNorm = zNorm(trainRows.map((r) => r.adx14));
        const wDist = pearson(trainRows.map((r) => r.distFrom52wHighPct), trainRows.map((r) => r.expectancyPct));
        const wAdx = pearson(trainRows.map((r) => r.adx14), trainRows.map((r) => r.expectancyPct));
        const scoreRow = (row: SampleRow) => {
          const zd = (row.distFrom52wHighPct - distNorm.mean) / distNorm.std;
          const za = (row.adx14 - adxNorm.mean) / adxNorm.std;
          return zd * wDist + za * wAdx;
        };

        const trainScores = trainRows.map(scoreRow);
        const best = SCORE_QUANTILES.map((q) => {
          const thr = quantile(trainScores, q);
          const pass = trainRows.filter((r) => scoreRow(r) >= thr);
          const exp = pass.length > 0 ? mean(pass.map((r) => r.expectancyPct)) : -Infinity;
          return { q, thr, exp };
        }).sort((a, b) => b.exp - a.exp)[0]!;

        for (const row of testRows) {
          if (scoreRow(row) >= best.thr) selected.push({ date: row.date, expectancyPct: row.expectancyPct });
        }
      }

      const byDate = new Map<string, number[]>();
      for (const t of selected) {
        const arr = byDate.get(t.date) ?? [];
        arr.push(t.expectancyPct);
        byDate.set(t.date, arr);
      }
      const dates = [...byDate.keys()].sort();
      const dailyReturns = dates.map((d) => mean(byDate.get(d)!)); // equal weight; total exposure 100%
      const wins = dailyReturns.filter((r) => r > 0);
      const losses = dailyReturns.filter((r) => r < 0);
      const expectancy = dailyReturns.length > 0 ? mean(dailyReturns) : null;
      const sigma = dailyReturns.length > 1 ? std(dailyReturns) : null;
      const sharpe = sigma != null && sigma > 1e-9 && expectancy != null ? expectancy / sigma : null;
      const pf =
        losses.length > 0
          ? wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0))
          : null;
      const winRate = dailyReturns.length > 0 ? wins.length / dailyReturns.length : null;

      let equity = INITIAL_CAPITAL;
      let peak = INITIAL_CAPITAL;
      let maxDd = 0;
      const curve: Array<{ date: string; dailyReturnPct: number; equity: number; drawdownPct: number }> = [];
      for (let i = 0; i < dates.length; i++) {
        const r = dailyReturns[i]!;
        equity += (INITIAL_CAPITAL * r) / 100; // fixed-capital, no compounding
        if (equity > peak) peak = equity;
        const dd = peak > 0 ? equity / peak - 1 : -1;
        maxDd = Math.min(maxDd, dd);
        curve.push({ date: dates[i]!, dailyReturnPct: round3(r), equity: round2(equity), drawdownPct: round2(dd * 100) });
      }

      const yearsSpan =
        curve.length > 1
          ? (new Date(`${curve[curve.length - 1]!.date}T00:00:00Z`).getTime() -
              new Date(`${curve[0]!.date}T00:00:00Z`).getTime()) /
            (365.25 * 24 * 3600 * 1000)
          : 0;
      const cagr =
        yearsSpan > 0 && equity > 0 ? Math.pow(equity / INITIAL_CAPITAL, 1 / yearsSpan) - 1 : null;
      const annualized =
        yearsSpan > 0 ? ((equity - INITIAL_CAPITAL) / INITIAL_CAPITAL / yearsSpan) : null;

      return {
        strategyId: strategy.id,
        strategyLabelJa: strategy.labelJa,
        filterIds: strategy.filterIds,
        signalCount: selected.length,
        activeDays: dates.length,
        avgHoldingDays: FORWARD_DAYS,
        expectancyPct: expectancy == null ? null : round3(expectancy),
        sharpe: sharpe == null ? null : round3(sharpe),
        profitFactor: pf == null ? null : round3(pf),
        maxDrawdownPct: round2(maxDd * 100),
        winRate: winRate == null ? null : round3(winRate),
        cagrPct: cagr == null ? null : round3(cagr * 100),
        annualizedReturnPct: annualized == null ? null : round3(annualized * 100),
        goalCheck: {
          maxDdAtLeastMinus15: maxDd >= -0.15, // maxDd is negative ratio
          sharpeAtLeast08: sharpe != null && sharpe >= 0.8,
        },
        equityCurve: curve,
      };
    });

    const ranked = [...results]
      .sort((a, b) => {
        const scoreA = (a.goalCheck.maxDdAtLeastMinus15 ? 1 : 0) + (a.goalCheck.sharpeAtLeast08 ? 1 : 0);
        const scoreB = (b.goalCheck.maxDdAtLeastMinus15 ? 1 : 0) + (b.goalCheck.sharpeAtLeast08 ? 1 : 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        const sa = a.sharpe ?? -999;
        const sb = b.sharpe ?? -999;
        if (sb !== sa) return sb - sa;
        return (b.cagrPct ?? -999) - (a.cagrPct ?? -999);
      })
      .map((r, i) => ({ rank: i + 1, ...r }));

    const table = ranked.map((r) => ({
      rank: r.rank,
      strategy: r.strategyLabelJa,
      cagrPct: r.cagrPct,
      sharpe: r.sharpe,
      profitFactor: r.profitFactor,
      maxDrawdownPct: r.maxDrawdownPct,
      winRate: r.winRate,
      avgHoldingDays: r.avgHoldingDays,
      signalCount: r.signalCount,
      annualizedReturnPct: r.annualizedReturnPct,
      goalMaxDdLeMinus15: r.goalCheck.maxDdAtLeastMinus15,
      goalSharpeGe08: r.goalCheck.sharpeAtLeast08,
    }));

    const report = {
      methodologyJa: {
        baseStrategy: 'pair:dist+adx',
        filters: filters.map((f) => ({ id: f.id, labelJa: f.labelJa })),
        strategyCount: strategies.length,
        walkforward: '6ヶ月学習 -> 1ヶ月検証ローリング',
        capitalModel: '固定資金100万円・資金100%上限・同日均等配分・複利なし',
      },
      objectiveJa: {
        maxDdTarget: '>= -15%',
        sharpeTarget: '>= 0.8',
      },
      comparisonTable: table,
      oosRanking: ranked,
      bestBySharpe: ranked[0] ?? null,
      bestByMaxDd: [...ranked].sort((a, b) => b.maxDrawdownPct - a.maxDrawdownPct)[0] ?? null,
      hitBothTargetsCount: ranked.filter((r) => r.goalCheck.maxDdAtLeastMinus15 && r.goalCheck.sharpeAtLeast08).length,
      summaryJa: ranked.slice(0, 20).map(
        (r) =>
          `#${r.rank} ${r.strategyLabelJa}: CAGR=${r.cagrPct ?? '—'}% Sharpe=${r.sharpe ?? '—'} PF=${r.profitFactor ?? '—'} MaxDD=${r.maxDrawdownPct}% 勝率=${r.winRate ?? '—'} signals=${r.signalCount}`,
      ),
    };

    const out = path.join(process.cwd(), 'scripts', 'pair-dist-adx-filter-walkforward-oos.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n=== PAIR DIST+ADX FILTER WF ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
