/**
 * Top3特徴ウォークフォワードのMaxDD監査レポート
 * npx vitest run tests/unit/top3FeatureWalkforwardDrawdownAudit.test.ts
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
type SelectedTrade = {
  ruleName: string;
  date: string;
  month: string;
  symbol: string;
  expectancyPct: number;
  score: number;
  testMonth: string;
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
    rows.push({ date, month: monthStr(date), symbol, expectancyPct: expectancy, distFrom52wHighPct: dist52, macdHistPct: macd, adx14: adx });
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

function calcCoreStats(returns: number[]) {
  const wins = returns.filter((r) => r > 0);
  const losses = returns.filter((r) => r < 0);
  return {
    totalTrades: returns.length,
    winRate: returns.length > 0 ? round3(wins.length / returns.length) : null,
    avgProfit: wins.length > 0 ? round3(mean(wins)) : null,
    avgLoss: losses.length > 0 ? round3(mean(losses)) : null,
    maxProfit: wins.length > 0 ? round3(Math.max(...wins)) : null,
    maxLoss: losses.length > 0 ? round3(Math.min(...losses)) : null,
    expectancyPct: returns.length > 0 ? round3(mean(returns)) : null,
    sharpe: returns.length > 1 && std(returns) > 1e-9 ? round3(mean(returns) / std(returns)) : null,
    profitFactor:
      losses.length > 0
        ? round3(wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)))
        : null,
  };
}

function computeEquityAudit(dailyReturnPct: Array<{ date: string; returnPct: number }>) {
  // Original formula in ranking test: eq *= (1 + dailyReturnPct/100)
  let eq = 1;
  let peak = 1;
  let maxDd = 0;
  let ddStart = dailyReturnPct[0]?.date ?? null;
  let ddTrough = dailyReturnPct[0]?.date ?? null;
  let peakDate = dailyReturnPct[0]?.date ?? null;
  const curve: Array<{ date: string; dailyReturnPct: number; equity: number; drawdownPct: number }> = [];
  for (const d of dailyReturnPct) {
    eq *= 1 + d.returnPct / 100;
    if (eq > peak) {
      peak = eq;
      peakDate = d.date;
    }
    const dd = peak > 0 ? eq / peak - 1 : -1;
    if (dd < maxDd) {
      maxDd = dd;
      ddStart = peakDate;
      ddTrough = d.date;
    }
    curve.push({ date: d.date, dailyReturnPct: round3(d.returnPct), equity: round4(eq), drawdownPct: round2(dd * 100) });
  }
  // Fixed-capital reference: additive PnL with 1x notional baseline.
  let eqFixed = 1;
  let peakFixed = 1;
  let maxDdFixed = 0;
  for (const d of dailyReturnPct) {
    eqFixed += d.returnPct / 100;
    if (eqFixed > peakFixed) peakFixed = eqFixed;
    const dd = peakFixed > 0 ? eqFixed / peakFixed - 1 : -1;
    maxDdFixed = Math.min(maxDdFixed, dd);
  }

  return {
    maxDrawdownPct: round2(maxDd * 100),
    maxDdPeriod: { start: ddStart, trough: ddTrough },
    equityCurve: curve,
    fixedCapitalReference: {
      maxDrawdownPct: round2(maxDdFixed * 100),
      endingEquity: round4(eqFixed),
    },
    minDailyReturnPct: curve.length > 0 ? Math.min(...curve.map((x) => x.dailyReturnPct)) : null,
    minEquity: curve.length > 0 ? Math.min(...curve.map((x) => x.equity)) : null,
  };
}

describe('Top3 walkforward drawdown audit', () => {
  it('writes detailed MaxDD investigation report', async () => {
    const samples: SampleRow[] = [];
    for (const def of SYMBOL_DEFS) {
      const bars = await fetchYahooOhlcv(def.yahooSymbol);
      samples.push(...buildSamplesForSymbol(def.symbol, bars));
    }
    samples.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

    const months = [...new Set(samples.map((s) => s.month))].sort();
    const rules = buildRuleDefs();
    const tradesByRule = new Map<string, SelectedTrade[]>();
    for (const r of rules) tradesByRule.set(r.name, []);

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
        const list = tradesByRule.get(rule.name)!;
        for (const row of selectedTest) {
          list.push({
            ruleName: rule.name,
            date: row.date,
            month: row.month,
            symbol: row.symbol,
            expectancyPct: row.expectancyPct,
            score: round4(scoreRow(row)),
            testMonth,
          });
        }
      }
    }

    const perRuleReport = rules.map((rule) => {
      const trades = tradesByRule.get(rule.name)!;
      const returns = trades.map((t) => t.expectancyPct);
      const stats = calcCoreStats(returns);

      const byDateMap = new Map<string, SelectedTrade[]>();
      for (const t of trades) {
        const arr = byDateMap.get(t.date) ?? [];
        arr.push(t);
        byDateMap.set(t.date, arr);
      }
      const dailyAggregated = [...byDateMap.entries()]
        .map(([date, ts]) => ({
          date,
          returnPct: ts.reduce((a, x) => a + x.expectancyPct, 0),
          tradeCount: ts.length,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const ddAudit = computeEquityAudit(dailyAggregated.map((d) => ({ date: d.date, returnPct: d.returnPct })));
      const ddWindowTrades =
        ddAudit.maxDdPeriod.start && ddAudit.maxDdPeriod.trough
          ? trades
              .filter((t) => t.date >= ddAudit.maxDdPeriod.start! && t.date <= ddAudit.maxDdPeriod.trough!)
              .sort((a, b) => a.date.localeCompare(b.date))
          : [];

      const crashDays = dailyAggregated.filter((d) => d.returnPct <= -95);
      const causeTrades = crashDays.flatMap((d) =>
        (byDateMap.get(d.date) ?? []).map((t) => ({
          date: t.date,
          symbol: t.symbol,
          expectancyPct: t.expectancyPct,
          testMonth: t.testMonth,
          dailyAggregatedReturnPct: round3(d.returnPct),
          dailyTradeCount: d.tradeCount,
        })),
      );

      const leverage = {
        modelAssumption: '日次で同日採用トレードの期待値%を単純合算して1つの資産に適用（事実上、同日ポジション数分のレバレッジ）',
        explicitLeverageInput: 1,
        impliedLeverageByConcurrency: {
          maxConcurrentTradesPerDay: dailyAggregated.length > 0 ? Math.max(...dailyAggregated.map((d) => d.tradeCount)) : 0,
          avgConcurrentTradesPerDay:
            dailyAggregated.length > 0 ? round3(mean(dailyAggregated.map((d) => d.tradeCount))) : null,
        },
      };

      const bugSignals = {
        hasDailyReturnBelowMinus100Pct: dailyAggregated.some((d) => d.returnPct < -100),
        minDailyAggregatedReturnPct:
          dailyAggregated.length > 0 ? round3(Math.min(...dailyAggregated.map((d) => d.returnPct))) : null,
        rationaleJa:
          dailyAggregated.some((d) => d.returnPct < -100)
            ? '同日複数トレードの期待値%を合算して複利適用しているため、-100%未満の日次リターンが発生し資産が符号反転/ゼロ近傍化。MaxDDが-95%〜-99%に過大化する計算仕様バグの疑いが高い。'
            : '日次合算リターンが-100%未満でなければ、極端DDは連敗集中または仕様要因。'
      };

      return {
        ruleName: rule.name,
        featureKeys: rule.keys,
        tradeStats: stats,
        maxDdFormula: 'eq_t = eq_{t-1} * (1 + dailyAggregatedReturnPct_t / 100); DD_t = eq_t / peak_t - 1; MaxDD = min(DD_t)',
        equityCurve: ddAudit.equityCurve,
        maxDdEvent: ddAudit.maxDdPeriod,
        ddWindowTradeCount: ddWindowTrades.length,
        ddWindowTrades: ddWindowTrades.slice(0, 300),
        causeTradesForDdBelow95: causeTrades.slice(0, 300),
        dailyCrashDays: crashDays.slice(0, 120),
        capitalAndLeverage: {
          compoundingType: '複利（コンパウンド）',
          fixedCapital: false,
          fixedCapitalReference: ddAudit.fixedCapitalReference,
          ...leverage,
        },
        bugPossibility: bugSignals,
      };
    });

    const report = {
      objectiveJa: 'MaxDDが-95%〜-99%となる原因調査',
      evaluationScope: 'top3FeatureWalkforwardOos.test.ts と同一条件',
      perRule: perRuleReport,
      conclusionsJa: [
        'MaxDDは「同日採用トレードの期待値%を合算して単一資産に複利適用」する計算仕様の影響を強く受ける。',
        '同日トレード数が多い日に大きなマイナスが重なると、日次合算リターンが-100%未満となりうる。',
        'この場合、資産曲線は現実的な1倍運用より過大なドローダウンを示し、計算バグ（少なくとも仕様不整合）の可能性が高い。',
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'top3-feature-walkforward-dd-audit.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n=== TOP3 WF DD AUDIT ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
