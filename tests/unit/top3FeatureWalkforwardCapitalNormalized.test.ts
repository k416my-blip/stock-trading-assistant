/**
 * Top3特徴ウォークフォワード: 資金100%制約（同日均等配分）で再計算
 * npx vitest run tests/unit/top3FeatureWalkforwardCapitalNormalized.test.ts
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

const TOP3 = ['distFrom52wHighPct', 'macdHistPct', 'adx14'] as const;
type FeatureKey = (typeof TOP3)[number];
type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };
type SampleRow = { date: string; month: string; symbol: string; expectancyPct: number } & Record<FeatureKey, number>;
type RuleDef = { name: string; keys: FeatureKey[] };

type DailyPortfolioPoint = {
  date: string;
  tradeCount: number;
  dailyReturnPct_oldSum: number;
  dailyReturnPct_newEqualWeight: number;
  equity_old: number;
  equity_new: number;
  drawdownPct_old: number;
  drawdownPct_new: number;
};

type MetricSet = {
  tradeCount: number;
  activeDays: number;
  expectancyPct: number | null;
  sharpe: number | null;
  profitFactor: number | null;
  maxDrawdownPct: number | null;
  winRate: number | null;
};

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
    if (expectancy == null || dist52 == null || macd == null || adx == null) continue;
    rows.push({
      date,
      month: monthStr(date),
      symbol,
      expectancyPct: expectancy,
      distFrom52wHighPct: dist52,
      macdHistPct: macd,
      adx14: adx,
    });
  }
  return rows;
}

function buildRuleDefs(): RuleDef[] {
  return [
    { name: 'single:distFrom52wHighPct', keys: ['distFrom52wHighPct'] },
    { name: 'single:macdHistPct', keys: ['macdHistPct'] },
    { name: 'single:adx14', keys: ['adx14'] },
    { name: 'pair:dist+macd', keys: ['distFrom52wHighPct', 'macdHistPct'] },
    { name: 'pair:dist+adx', keys: ['distFrom52wHighPct', 'adx14'] },
    { name: 'pair:macd+adx', keys: ['macdHistPct', 'adx14'] },
    { name: 'triple:dist+macd+adx', keys: ['distFrom52wHighPct', 'macdHistPct', 'adx14'] },
  ];
}

function zNorm(values: number[]): { mean: number; std: number } {
  const m = mean(values);
  const s = std(values);
  return { mean: m, std: s > 1e-9 ? s : 1 };
}

function calcMetricSet(seriesPct: number[], tradeCount: number): MetricSet {
  if (seriesPct.length === 0) {
    return {
      tradeCount,
      activeDays: 0,
      expectancyPct: null,
      sharpe: null,
      profitFactor: null,
      maxDrawdownPct: null,
      winRate: null,
    };
  }
  const wins = seriesPct.filter((r) => r > 0);
  const losses = seriesPct.filter((r) => r < 0);
  const expectancy = mean(seriesPct);
  const sigma = std(seriesPct);
  const sharpe = sigma > 1e-9 ? expectancy / sigma : null;
  const pf = losses.length > 0 ? wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)) : null;
  const winRate = wins.length / seriesPct.length;

  let eq = 1;
  let peak = 1;
  let maxDd = 0;
  for (const r of seriesPct) {
    eq *= 1 + r / 100;
    if (eq > peak) peak = eq;
    maxDd = Math.min(maxDd, eq / peak - 1);
  }
  return {
    tradeCount,
    activeDays: seriesPct.length,
    expectancyPct: round3(expectancy),
    sharpe: sharpe == null ? null : round3(sharpe),
    profitFactor: pf == null ? null : round3(pf),
    maxDrawdownPct: round2(maxDd * 100),
    winRate: round3(winRate),
  };
}

describe('Top3 walkforward capital normalized', () => {
  it('recomputes with 100% capital cap and equal-weight per day', async () => {
    const old = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'top3-feature-walkforward-oos-ranking.json'), 'utf8'),
    ) as {
      oosRanking: Array<{
        ruleName: string;
        expectancyPct: number | null;
        sharpe: number | null;
        profitFactor: number | null;
        maxDrawdownPct: number | null;
      }>;
    };

    const samples: SampleRow[] = [];
    for (const def of SYMBOL_DEFS) {
      const bars = await fetchYahooOhlcv(def.yahooSymbol);
      samples.push(...buildSamplesForSymbol(def.symbol, bars));
    }
    samples.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

    const months = [...new Set(samples.map((s) => s.month))].sort();
    const rules = buildRuleDefs();

    const selectedByRule = new Map<string, Array<{ date: string; symbol: string; expectancyPct: number; testMonth: string }>>();
    for (const r of rules) selectedByRule.set(r.name, []);

    for (const testMonth of months) {
      const trainStart = monthAdd(testMonth, -TRAIN_MONTHS);
      const trainEnd = testMonth;
      const testEnd = monthAdd(testMonth, TEST_MONTHS);
      const trainRows = samples.filter((s) => inMonthRange(s.month, trainStart, trainEnd));
      const testRows = samples.filter((s) => inMonthRange(s.month, testMonth, testEnd));
      if (trainRows.length < MIN_TRAIN_SAMPLES || testRows.length === 0) continue;

      for (const rule of rules) {
        const norms = new Map<FeatureKey, { mean: number; std: number }>();
        const corr = new Map<FeatureKey, number>();
        for (const k of rule.keys) {
          const xs = trainRows.map((r) => r[k]);
          norms.set(k, zNorm(xs));
          corr.set(k, pearson(xs, trainRows.map((r) => r.expectancyPct)));
        }
        const scoreRow = (row: SampleRow): number => {
          let s = 0;
          for (const k of rule.keys) {
            const n = norms.get(k)!;
            const z = (row[k] - n.mean) / n.std;
            const w = Math.abs(corr.get(k)!) < 1e-9 ? 0 : corr.get(k)!;
            s += z * w;
          }
          return s;
        };
        const trainScores = trainRows.map(scoreRow);
        const best = SCORE_QUANTILES.map((q) => {
          const thr = quantile(trainScores, q);
          const selected = trainRows.filter((r) => scoreRow(r) >= thr);
          const expectancy = selected.length > 0 ? mean(selected.map((r) => r.expectancyPct)) : -Infinity;
          return { q, thr, expectancy };
        }).sort((a, b) => b.expectancy - a.expectancy)[0]!;

        const selectedTest = testRows.filter((r) => scoreRow(r) >= best.thr);
        const arr = selectedByRule.get(rule.name)!;
        for (const row of selectedTest) {
          arr.push({ date: row.date, symbol: row.symbol, expectancyPct: row.expectancyPct, testMonth });
        }
      }
    }

    const oldByRule = new Map(old.oosRanking.map((r) => [r.ruleName, r]));

    const recomputed = rules.map((rule) => {
      const picks = selectedByRule.get(rule.name)!;
      const byDate = new Map<string, number[]>();
      for (const p of picks) {
        const arr = byDate.get(p.date) ?? [];
        arr.push(p.expectancyPct);
        byDate.set(p.date, arr);
      }
      const dates = [...byDate.keys()].sort();
      let eqOld = 1;
      let peakOld = 1;
      let eqNew = 1;
      let peakNew = 1;
      const curve: DailyPortfolioPoint[] = [];
      const oldSeries: number[] = [];
      const newSeries: number[] = [];

      for (const d of dates) {
        const arr = byDate.get(d)!;
        const oldR = arr.reduce((a, b) => a + b, 0);
        const newR = arr.reduce((a, b) => a + b, 0) / arr.length; // 100/N each, total <=100%
        oldSeries.push(oldR);
        newSeries.push(newR);

        eqOld *= 1 + oldR / 100;
        eqNew *= 1 + newR / 100;
        if (eqOld > peakOld) peakOld = eqOld;
        if (eqNew > peakNew) peakNew = eqNew;
        curve.push({
          date: d,
          tradeCount: arr.length,
          dailyReturnPct_oldSum: round3(oldR),
          dailyReturnPct_newEqualWeight: round3(newR),
          equity_old: round4(eqOld),
          equity_new: round4(eqNew),
          drawdownPct_old: round2((eqOld / peakOld - 1) * 100),
          drawdownPct_new: round2((eqNew / peakNew - 1) * 100),
        });
      }

      const oldMetrics = calcMetricSet(oldSeries, picks.length);
      const newMetrics = calcMetricSet(newSeries, picks.length);
      const oldRank = oldByRule.get(rule.name);

      return {
        ruleName: rule.name,
        featureKeys: rule.keys,
        capitalModel: {
          totalCapitalPct: 100,
          perDayAllocation: '同日N銘柄 -> 各100/N%',
          maxExposurePct: 100,
          leverage: 1,
        },
        metricsOldRecomputed: oldMetrics,
        metricsNewCapitalNormalized: newMetrics,
        comparisonVsPreviousReported: {
          previous: oldRank
            ? {
                expectancyPct: oldRank.expectancyPct,
                sharpe: oldRank.sharpe,
                profitFactor: oldRank.profitFactor,
                maxDrawdownPct: oldRank.maxDrawdownPct,
              }
            : null,
          deltaNewMinusPrevious: oldRank
            ? {
                expectancyPct:
                  newMetrics.expectancyPct != null && oldRank.expectancyPct != null
                    ? round3(newMetrics.expectancyPct - oldRank.expectancyPct)
                    : null,
                sharpe:
                  newMetrics.sharpe != null && oldRank.sharpe != null
                    ? round3(newMetrics.sharpe - oldRank.sharpe)
                    : null,
                profitFactor:
                  newMetrics.profitFactor != null && oldRank.profitFactor != null
                    ? round3(newMetrics.profitFactor - oldRank.profitFactor)
                    : null,
                maxDrawdownPct:
                  newMetrics.maxDrawdownPct != null && oldRank.maxDrawdownPct != null
                    ? round2(newMetrics.maxDrawdownPct - oldRank.maxDrawdownPct)
                    : null,
              }
            : null,
        },
        equityCurve: curve,
      };
    });

    const oosRankingNew = [...recomputed]
      .sort((a, b) => {
        const ea = a.metricsNewCapitalNormalized.expectancyPct ?? -999;
        const eb = b.metricsNewCapitalNormalized.expectancyPct ?? -999;
        if (eb !== ea) return eb - ea;
        const sa = a.metricsNewCapitalNormalized.sharpe ?? -999;
        const sb = b.metricsNewCapitalNormalized.sharpe ?? -999;
        if (sb !== sa) return sb - sa;
        return (b.metricsNewCapitalNormalized.profitFactor ?? -999) - (a.metricsNewCapitalNormalized.profitFactor ?? -999);
      })
      .map((r, i) => ({
        rank: i + 1,
        ruleName: r.ruleName,
        featureKeys: r.featureKeys,
        ...r.metricsNewCapitalNormalized,
      }));

    const report = {
      methodologyJa: {
        constraint: '総資金100%、同日採用N銘柄は各100/N%、総投資額100%超過禁止',
        walkforward: '過去6ヶ月学習 -> 翌1ヶ月検証',
        noOpenAiBuy: true,
      },
      sampleMeta: {
        symbols: SYMBOL_DEFS.map((s) => s.symbol),
        totalRows: samples.length,
        monthRange: { start: months[0] ?? null, end: months[months.length - 1] ?? null },
      },
      oldVsNewByRule: recomputed,
      oosRankingNew,
      summaryJa: oosRankingNew.map(
        (r) =>
          `#${r.rank} ${r.ruleName}: 期待値${r.expectancyPct ?? '—'} Sharpe=${r.sharpe ?? '—'} PF=${r.profitFactor ?? '—'} MaxDD=${r.maxDrawdownPct ?? '—'}%`,
      ),
    };

    const out = path.join(process.cwd(), 'scripts', 'top3-feature-walkforward-oos-ranking-capital-normalized.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n=== TOP3 WF OOS CAPITAL NORMALIZED ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
