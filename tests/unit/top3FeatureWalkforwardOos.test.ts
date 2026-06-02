/**
 * 上位3指標のみ: 6ヶ月学習→翌1ヶ月検証のローリングOOSランキング
 * npx vitest run tests/unit/top3FeatureWalkforwardOos.test.ts
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

const TOP3_FEATURES = [
  { key: 'distFrom52wHighPct', labelJa: '52週高値からの距離' },
  { key: 'macdHistPct', labelJa: 'MACD' },
  { key: 'adx14', labelJa: 'ADX' },
] as const;

type FeatureKey = (typeof TOP3_FEATURES)[number]['key'];
type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };
type SampleRow = { date: string; month: string; symbol: string; expectancyPct: number } & Record<FeatureKey, number>;

type RuleMetrics = {
  ruleName: string;
  featureKeys: FeatureKey[];
  oosTradeCount: number;
  oosMonths: number;
  expectancyPct: number | null;
  sharpe: number | null;
  profitFactor: number | null;
  maxDrawdownPct: number | null;
  winRate: number | null;
};

type WindowResult = {
  testMonth: string;
  trainCount: number;
  testCount: number;
  quantile: number;
  thresholdScore: number;
  selectedCount: number;
  selectedExpectancyPct: number | null;
};

type RuleDef = { name: string; keys: FeatureKey[] };

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
  const v = vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length;
  return Math.sqrt(v);
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
        indicators?: {
          quote?: Array<{
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
            volume?: (number | null)[];
          }>;
        };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const bars: OhlcvBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const h = q?.high?.[i];
    const l = q?.low?.[i];
    const c = q?.close?.[i];
    const v = q?.volume?.[i];
    if (h == null || l == null || c == null || v == null || !Number.isFinite(c)) continue;
    bars.push({
      date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
      high: h,
      low: l,
      close: c,
      volume: v,
    });
  }
  return bars;
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

function zNorm(values: number[]): { mean: number; std: number } {
  const m = mean(values);
  const s = std(values);
  return { mean: m, std: s > 1e-9 ? s : 1 };
}

function buildRuleDefs(): RuleDef[] {
  const f = TOP3_FEATURES.map((x) => x.key);
  return [
    { name: 'single:distFrom52wHighPct', keys: [f[0]!] },
    { name: 'single:macdHistPct', keys: [f[1]!] },
    { name: 'single:adx14', keys: [f[2]!] },
    { name: 'pair:dist+macd', keys: [f[0]!, f[1]!] },
    { name: 'pair:dist+adx', keys: [f[0]!, f[2]!] },
    { name: 'pair:macd+adx', keys: [f[1]!, f[2]!] },
    { name: 'triple:dist+macd+adx', keys: [f[0]!, f[1]!, f[2]!] },
  ];
}

function calcMetrics(ruleName: string, keys: FeatureKey[], returns: number[], byDate: Map<string, number>): RuleMetrics {
  if (returns.length === 0) {
    return {
      ruleName,
      featureKeys: keys,
      oosTradeCount: 0,
      oosMonths: 0,
      expectancyPct: null,
      sharpe: null,
      profitFactor: null,
      maxDrawdownPct: null,
      winRate: null,
    };
  }
  const exp = mean(returns);
  const sd = std(returns);
  const sharpe = sd > 1e-9 ? exp / sd : null;
  const profit = returns.filter((r) => r > 0).reduce((a, b) => a + b, 0);
  const lossAbs = Math.abs(returns.filter((r) => r < 0).reduce((a, b) => a + b, 0));
  const pf = lossAbs > 1e-9 ? profit / lossAbs : null;
  const winRate = returns.filter((r) => r > 0).length / returns.length;

  let eq = 1;
  let peak = 1;
  let maxDd = 0;
  const dates = [...byDate.keys()].sort();
  for (const d of dates) {
    eq *= 1 + (byDate.get(d)! / 100);
    if (eq > peak) peak = eq;
    maxDd = Math.min(maxDd, eq / peak - 1);
  }

  return {
    ruleName,
    featureKeys: keys,
    oosTradeCount: returns.length,
    oosMonths: dates.length,
    expectancyPct: round3(exp),
    sharpe: sharpe == null ? null : round3(sharpe),
    profitFactor: pf == null ? null : round3(pf),
    maxDrawdownPct: round2(maxDd * 100),
    winRate: round3(winRate),
  };
}

describe('Top3 feature walkforward OOS', () => {
  it('writes rolling 6M->1M OOS ranking using only top3 features', async () => {
    const samples: SampleRow[] = [];
    for (const def of SYMBOL_DEFS) {
      const bars = await fetchYahooOhlcv(def.yahooSymbol);
      samples.push(...buildSamplesForSymbol(def.symbol, bars));
    }
    samples.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

    const months = [...new Set(samples.map((s) => s.month))].sort();
    const rules = buildRuleDefs();
    const perRuleReturns = new Map<string, number[]>();
    const perRuleDaily = new Map<string, Map<string, number>>();
    const perRuleWindows = new Map<string, WindowResult[]>();
    for (const r of rules) {
      perRuleReturns.set(r.name, []);
      perRuleDaily.set(r.name, new Map());
      perRuleWindows.set(r.name, []);
    }

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
        const candidates = SCORE_QUANTILES.map((q) => {
          const thr = quantile(trainScores, q);
          const selected = trainRows.filter((r) => scoreRow(r) >= thr);
          const expectancy = selected.length > 0 ? mean(selected.map((r) => r.expectancyPct)) : -Infinity;
          return { q, thr, expectancy };
        });
        const best = candidates.sort((a, b) => b.expectancy - a.expectancy)[0]!;

        const selectedTest = testRows.filter((r) => scoreRow(r) >= best.thr);
        const retArr = perRuleReturns.get(rule.name)!;
        const dailyMap = perRuleDaily.get(rule.name)!;
        for (const row of selectedTest) {
          retArr.push(row.expectancyPct);
          dailyMap.set(row.date, (dailyMap.get(row.date) ?? 0) + row.expectancyPct);
        }

        perRuleWindows.get(rule.name)!.push({
          testMonth,
          trainCount: trainRows.length,
          testCount: testRows.length,
          quantile: best.q,
          thresholdScore: round4(best.thr),
          selectedCount: selectedTest.length,
          selectedExpectancyPct: selectedTest.length > 0 ? round3(mean(selectedTest.map((r) => r.expectancyPct))) : null,
        });
      }
    }

    const ranking = rules
      .map((r) => calcMetrics(r.name, r.keys, perRuleReturns.get(r.name)!, perRuleDaily.get(r.name)!))
      .sort((a, b) => {
        const ea = a.expectancyPct ?? -999;
        const eb = b.expectancyPct ?? -999;
        if (eb !== ea) return eb - ea;
        const sa = a.sharpe ?? -999;
        const sb = b.sharpe ?? -999;
        if (sb !== sa) return sb - sa;
        return (b.profitFactor ?? -999) - (a.profitFactor ?? -999);
      })
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const report = {
      methodologyJa: {
        featureFreeze: 'ATR_ratio/RSI/出来高系は凍結し未使用',
        featuresUsed: TOP3_FEATURES,
        ruleGroups: {
          single: 3,
          pair: 3,
          triple: 1,
        },
        walkforward: `過去${TRAIN_MONTHS}ヶ月学習→翌${TEST_MONTHS}ヶ月検証を月次ローリング`,
        target: `翌日終値エントリー後${FORWARD_DAYS}営業日の期待値`,
        noOpenAiBuy: true,
      },
      sampleMeta: {
        symbols: SYMBOL_DEFS.map((s) => s.symbol),
        totalRows: samples.length,
        monthRange: {
          start: months[0] ?? null,
          end: months[months.length - 1] ?? null,
        },
      },
      oosRanking: ranking,
      perRuleWindowDiagnostics: Object.fromEntries(
        rules.map((r) => [r.name, perRuleWindows.get(r.name)!]),
      ),
      summaryJa: ranking.map(
        (r) =>
          `#${r.rank} ${r.ruleName}: 期待値${r.expectancyPct ?? '—'} Sharpe=${r.sharpe ?? '—'} PF=${r.profitFactor ?? '—'} MaxDD=${r.maxDrawdownPct ?? '—'}% 件数${r.oosTradeCount}`,
      ),
    };

    const out = path.join(process.cwd(), 'scripts', 'top3-feature-walkforward-oos-ranking.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n=== TOP3 WF OOS ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
