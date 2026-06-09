/**
 * 全日・全銘柄: ATR_ratio / 5日騰落 ↔ 将来20営業日の相関
 * 銘柄別: ATR_ratio > 1.05 純市場ルール検証（OpenAI buy 前提なし）
 * npx vitest run tests/unit/atrRatioForward20Correlation.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const FORWARD_DAYS = 20;
const ATR_RULE_THRESHOLD = 1.05;
const ANALYSIS_START = '2024-06-01';

const SYMBOL_DEFS = [
  { symbol: '1023', yahooSymbol: '1023.KL', labelJa: '1023.KL' },
  { symbol: '1295', yahooSymbol: '1295.KL', labelJa: '1295.KL (Public Bank)' },
  { symbol: '1155', yahooSymbol: '1155.KL', labelJa: '1155.KL (Maybank)' },
  { symbol: 'SPY', yahooSymbol: 'SPY', labelJa: 'SPY' },
  { symbol: 'QQQ', yahooSymbol: 'QQQ', labelJa: 'QQQ' },
  { symbol: 'SCHD', yahooSymbol: 'SCHD', labelJa: 'SCHD' },
  { symbol: 'JEPI', yahooSymbol: 'JEPI', labelJa: 'JEPI' },
  { symbol: 'VYM', yahooSymbol: 'VYM', labelJa: 'VYM' },
] as const;

type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };

type DayRow = {
  date: string;
  symbol: string;
  atrRatio: number;
  change5dPct: number;
  maxUpsidePct: number;
  maxDownsidePct: number;
  expectancyPct: number;
};

type GroupStats = {
  n: number;
  meanMaxUpsidePct: number | null;
  meanMaxDownsidePct: number | null;
  meanExpectancyPct: number | null;
  winRateExpectancyPositive: number | null;
  medianExpectancyPct: number | null;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round2(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function median(vals: number[]): number | null {
  if (vals.length === 0) return null;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? round2((s[m - 1]! + s[m]!) / 2) : round2(s[m]!);
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 10) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i]! - mx;
    const y = ys[i]! - my;
    num += x * y;
    dx += x * x;
    dy += y * y;
  }
  if (dx <= 0 || dy <= 0) return null;
  return round3(num / Math.sqrt(dx * dy));
}

function spearman(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 10) return null;
  const rank = (arr: number[]) => {
    const indexed = arr.map((v, i) => ({ v, i }));
    indexed.sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(n);
    for (let r = 0; r < indexed.length; r++) {
      ranks[indexed[r]!.i] = r + 1;
    }
    return ranks;
  };
  return pearson(rank(xs), rank(ys));
}

function computeAtrPctAt(bars: OhlcvBar[], idx: number, period = 14): number | null {
  if (idx < period) return null;
  const trs: number[] = [];
  for (let i = idx - period + 1; i <= idx; i++) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const pc = bars[i - 1]!.close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atr = trs.reduce((a, b) => a + b, 0) / period;
  const close = bars[idx]!.close;
  if (close <= 0) return null;
  return round2((atr / close) * 100);
}

function computeAtr90AvgPct(bars: OhlcvBar[], idx: number): number | null {
  const start = idx - 90 + 1;
  if (start < 14) return null;
  const samples: number[] = [];
  for (let i = start; i <= idx; i++) {
    const v = computeAtrPctAt(bars, i);
    if (v != null) samples.push(v);
  }
  if (samples.length < 60) return null;
  return round2(samples.reduce((a, b) => a + b, 0) / samples.length);
}

function trailingChangePct(bars: OhlcvBar[], idx: number, lookback: number): number | null {
  if (idx < lookback || bars[idx - lookback]!.close <= 0) return null;
  return round2(((bars[idx]!.close / bars[idx - lookback]!.close - 1) * 100));
}

function forward20FromSignal(bars: OhlcvBar[], signalIdx: number): {
  maxUpsidePct: number;
  maxDownsidePct: number;
  expectancyPct: number;
} | null {
  const entryIdx = signalIdx + 1;
  const exitIdx = entryIdx + FORWARD_DAYS;
  if (exitIdx >= bars.length) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;
  let maxHigh = entry;
  let minLow = entry;
  for (let i = entryIdx; i <= exitIdx; i++) {
    maxHigh = Math.max(maxHigh, bars[i]!.high);
    minLow = Math.min(minLow, bars[i]!.low);
  }
  const exitClose = bars[exitIdx]!.close;
  return {
    maxUpsidePct: round2(((maxHigh / entry - 1) * 100)),
    maxDownsidePct: round2(((minLow / entry - 1) * 100)),
    expectancyPct: round2(((exitClose / entry - 1) * 100)),
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

function buildDayRows(bars: OhlcvBar[], symbol: string): DayRow[] {
  const rows: DayRow[] = [];
  for (let idx = 0; idx < bars.length; idx++) {
    const bar = bars[idx]!;
    if (bar.date < ANALYSIS_START) continue;
    const atrPct = computeAtrPctAt(bars, idx);
    const atr90 = computeAtr90AvgPct(bars, idx);
    const change5d = trailingChangePct(bars, idx, 5);
    if (atrPct == null || atr90 == null || atr90 <= 0 || change5d == null) continue;
    const fwd = forward20FromSignal(bars, idx);
    if (!fwd) continue;
    rows.push({
      date: bar.date,
      symbol,
      atrRatio: round3(atrPct / atr90),
      change5dPct: change5d,
      ...fwd,
    });
  }
  return rows;
}

function groupStats(rows: DayRow[]): GroupStats {
  if (rows.length === 0) {
    return {
      n: 0,
      meanMaxUpsidePct: null,
      meanMaxDownsidePct: null,
      meanExpectancyPct: null,
      winRateExpectancyPositive: null,
      medianExpectancyPct: null,
    };
  }
  const exp = rows.map((r) => r.expectancyPct);
  return {
    n: rows.length,
    meanMaxUpsidePct: mean(rows.map((r) => r.maxUpsidePct)),
    meanMaxDownsidePct: mean(rows.map((r) => r.maxDownsidePct)),
    meanExpectancyPct: mean(exp),
    winRateExpectancyPositive: round3(exp.filter((e) => e > 0).length / exp.length),
    medianExpectancyPct: median(exp),
  };
}

function correlationBlock(rows: DayRow[]) {
  const atr = rows.map((r) => r.atrRatio);
  const ch5 = rows.map((r) => r.change5dPct);
  const up = rows.map((r) => r.maxUpsidePct);
  const down = rows.map((r) => r.maxDownsidePct);
  const exp = rows.map((r) => r.expectancyPct);
  return {
    sampleDays: rows.length,
    atrRatio: {
      vsMaxUpside: { pearson: pearson(atr, up), spearman: spearman(atr, up) },
      vsMaxDownside: { pearson: pearson(atr, down), spearman: spearman(atr, down) },
      vsExpectancy: { pearson: pearson(atr, exp), spearman: spearman(atr, exp) },
    },
    change5dPct: {
      vsMaxUpside: { pearson: pearson(ch5, up), spearman: spearman(ch5, up) },
      vsMaxDownside: { pearson: pearson(ch5, down), spearman: spearman(ch5, down) },
      vsExpectancy: { pearson: pearson(ch5, exp), spearman: spearman(ch5, exp) },
    },
  };
}

function atrRuleValidation(rows: DayRow[], labelJa: string) {
  const pass = rows.filter((r) => r.atrRatio > ATR_RULE_THRESHOLD);
  const fail = rows.filter((r) => r.atrRatio <= ATR_RULE_THRESHOLD);
  const all = groupStats(rows);
  const rulePass = groupStats(pass);
  const ruleFail = groupStats(fail);
  const upliftExpectancy =
    rulePass.meanExpectancyPct != null && all.meanExpectancyPct != null
      ? round2(rulePass.meanExpectancyPct - all.meanExpectancyPct)
      : null;
  const effectiveJa =
    pass.length < 5
      ? 'サンプル不足'
      : rulePass.meanExpectancyPct != null &&
          all.meanExpectancyPct != null &&
          rulePass.meanExpectancyPct > all.meanExpectancyPct &&
          (rulePass.winRateExpectancyPositive ?? 0) >= (all.winRateExpectancyPositive ?? 0)
        ? '有効（期待値・勝率がベースライン上回り）'
        : rulePass.meanExpectancyPct != null &&
            all.meanExpectancyPct != null &&
            rulePass.meanExpectancyPct > all.meanExpectancyPct
          ? '弱い有効性（期待値のみ上回り）'
          : '無効または不明確';
  return {
    symbol: labelJa,
    rule: `ATR_ratio > ${ATR_RULE_THRESHOLD}`,
    rulePassDays: pass.length,
    rulePassRate: rows.length > 0 ? round3(pass.length / rows.length) : null,
    baselineAllDays: all,
    rulePassGroup: rulePass,
    ruleFailGroup: ruleFail,
    upliftExpectancyVsBaseline: upliftExpectancy,
    effectiveJa,
  };
}

describe('ATR_ratio forward-20 correlation & pure market rule', () => {
  it('writes correlation and per-symbol ATR>1.05 validation JSON', async () => {
    const allRows: DayRow[] = [];
    const bySymbol = new Map<string, DayRow[]>();

    for (const def of SYMBOL_DEFS) {
      const bars = await fetchYahooOhlcv(def.yahooSymbol);
      const rows = buildDayRows(bars, def.symbol);
      bySymbol.set(def.symbol, rows);
      allRows.push(...rows);
    }

    const pooledCorrelation = correlationBlock(allRows);
    const perSymbolCorrelation = Object.fromEntries(
      SYMBOL_DEFS.map((d) => [d.symbol, correlationBlock(bySymbol.get(d.symbol) ?? [])]),
    );

    const atrRatioBuckets = [0.8, 0.9, 1.0, 1.05, 1.1, 1.2, 1.5].map((lo, i, arr) => {
      const hi = arr[i + 1] ?? Infinity;
      const bucketRows = allRows.filter((r) => r.atrRatio >= lo && r.atrRatio < hi);
      return {
        atrRatioMin: lo,
        atrRatioMax: hi === Infinity ? null : hi,
        ...groupStats(bucketRows),
      };
    });

    const perSymbolRuleValidation = SYMBOL_DEFS.map((d) =>
      atrRuleValidation(bySymbol.get(d.symbol) ?? [], d.labelJa),
    );

    const report = {
      methodologyJa: {
        scope: '8銘柄・分析期間内の全営業日（OpenAI buy 前提なし）',
        analysisStart: ANALYSIS_START,
        features: {
          atrRatio: 'ATR14% / 90日平均ATR14%',
          change5dPct: 'シグナル日終値ベースの直前5営業日騰落率',
        },
        forwardWindow: `シグナル翌日終値エントリーから${FORWARD_DAYS}営業日`,
        outcomes: {
          maxUpsidePct: '期間内高値 / エントリー − 1',
          maxDownsidePct: '期間内安値 / エントリー − 1',
          expectancyPct: `${FORWARD_DAYS}営業日後終値 / エントリー − 1（保有期間リターン）`,
        },
        pureMarketRule: `ATR_ratio > ${ATR_RULE_THRESHOLD}`,
      },
      pooledAllSymbols: {
        correlation: pooledCorrelation,
        atrRatioBuckets,
      },
      perSymbolCorrelation,
      perSymbolAtr105Rule: perSymbolRuleValidation,
      summaryJa: [
        `全銘柄プール ${allRows.length} 営業日`,
        `ATR_ratio↔期待値 Pearson=${pooledCorrelation.atrRatio.vsExpectancy.pearson ?? '—'} / 5日騰落↔期待値=${pooledCorrelation.change5dPct.vsExpectancy.pearson ?? '—'}`,
        ...perSymbolRuleValidation.map(
          (v) => `${v.symbol}: ルール通過${v.rulePassDays}日 期待値${v.rulePassGroup.meanExpectancyPct ?? '—'}% → ${v.effectiveJa}`,
        ),
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'atr-ratio-forward20-correlation.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n=== ATR FWD20 ===\n', JSON.stringify(report, null, 2));
  }, 120_000);
});
