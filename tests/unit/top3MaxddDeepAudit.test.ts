/**
 * MaxDD -70%台の原因調査（固定資金100万・非複利含む）
 * npx vitest run tests/unit/top3MaxddDeepAudit.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const FORWARD_DAYS = 20;
const HOLDING_DAYS = FORWARD_DAYS;
const ANALYSIS_START = '2024-06-01';
const TRAIN_MONTHS = 6;
const TEST_MONTHS = 1;
const MIN_TRAIN_SAMPLES = 120;
const SCORE_QUANTILES = [0.6, 0.7, 0.8, 0.9];
const INITIAL_CAPITAL_JPY = 1_000_000;
const TRADING_DAYS_PER_YEAR = 252;

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

type PickTrade = {
  date: string;
  month: string;
  year: string;
  symbol: string;
  expectancyPct: number;
  testMonth: string;
  weightPct: number;
  pnlJpyFixed: number;
};

type EquityPoint = {
  date: string;
  dailyReturnPct: number;
  dailyPnlJpy: number;
  equityJpy: number;
  drawdownPct: number;
  tradeCount: number;
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
  return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
}
function std(vals: number[]): number {
  const m = mean(vals);
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length) || 1e-9;
}
function monthStr(date: string): string {
  return date.slice(0, 7);
}
function yearStr(date: string): string {
  return date.slice(0, 4);
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
function safeFileName(ruleName: string): string {
  return ruleName.replace(/[:+]/g, '-');
}
function yearsBetween(startDate: string, endDate: string): number {
  const s = new Date(`${startDate}T00:00:00Z`).getTime();
  const e = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.max((e - s) / (365.25 * 24 * 3600 * 1000), 1 / 365.25);
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

function maxConsecutive<T>(items: T[], isLoss: (x: T) => boolean): { count: number; start: string | null; end: string | null } {
  let best = 0;
  let cur = 0;
  let bestStart: string | null = null;
  let bestEnd: string | null = null;
  let curStart: string | null = null;
  for (const it of items) {
    const date = (it as { date: string }).date;
    if (isLoss(it)) {
      if (cur === 0) curStart = date;
      cur += 1;
      if (cur > best) {
        best = cur;
        bestStart = curStart;
        bestEnd = date;
      }
    } else {
      cur = 0;
      curStart = null;
    }
  }
  return { count: best, start: bestStart, end: bestEnd };
}

function buildEquityCurves(trades: PickTrade[]) {
  const byDate = new Map<string, PickTrade[]>();
  for (const t of trades) {
    const arr = byDate.get(t.date) ?? [];
    arr.push(t);
    byDate.set(t.date, arr);
  }
  const dates = [...byDate.keys()].sort();

  let eqCompound = 1;
  let peakCompound = 1;
  let eqFixed = INITIAL_CAPITAL_JPY;
  let peakFixed = INITIAL_CAPITAL_JPY;
  const compoundCurve: Array<{ date: string; equity: number; drawdownPct: number; dailyReturnPct: number }> = [];
  const fixedCurve: EquityPoint[] = [];

  for (const d of dates) {
    const dayTrades = byDate.get(d)!;
    const n = dayTrades.length;
    const dailyRet = mean(dayTrades.map((t) => t.expectancyPct));
    const dailyPnl = dayTrades.reduce((a, t) => a + t.pnlJpyFixed, 0);

    eqCompound *= 1 + dailyRet / 100;
    if (eqCompound > peakCompound) peakCompound = eqCompound;
    const ddCompound = (eqCompound / peakCompound - 1) * 100;

    eqFixed += dailyPnl;
    if (eqFixed > peakFixed) peakFixed = eqFixed;
    const ddFixed = peakFixed > 0 ? ((eqFixed - peakFixed) / peakFixed) * 100 : 0;

    compoundCurve.push({ date: d, equity: round4(eqCompound), drawdownPct: round2(ddCompound), dailyReturnPct: round3(dailyRet) });
    fixedCurve.push({
      date: d,
      dailyReturnPct: round3(dailyRet),
      dailyPnlJpy: round2(dailyPnl),
      equityJpy: round2(eqFixed),
      drawdownPct: round2(ddFixed),
      tradeCount: n,
    });
  }

  return { compoundCurve, fixedCurve, dates };
}

function findMaxDdWindow(curve: Array<{ date: string; equity: number; drawdownPct: number }>) {
  let troughIdx = 0;
  let minDd = 0;
  let peakIdx = 0;
  let peakEq = curve[0]?.equity ?? 1;
  for (let i = 0; i < curve.length; i++) {
    const pt = curve[i]!;
    if (pt.equity >= peakEq) {
      peakEq = pt.equity;
      peakIdx = i;
    }
    const dd = pt.drawdownPct;
    if (dd < minDd) {
      minDd = dd;
      troughIdx = i;
    }
  }
  let peakBeforeTrough = 0;
  let maxPeak = curve[0]?.equity ?? 1;
  for (let i = 0; i <= troughIdx; i++) {
    if (curve[i]!.equity >= maxPeak) {
      maxPeak = curve[i]!.equity;
      peakBeforeTrough = i;
    }
  }
  return {
    maxDrawdownPct: round2(minDd),
    peakDate: curve[peakBeforeTrough]?.date ?? null,
    troughDate: curve[troughIdx]?.date ?? null,
    peakEquity: curve[peakBeforeTrough]?.equity ?? null,
    troughEquity: curve[troughIdx]?.equity ?? null,
    windowCurve: curve.slice(peakBeforeTrough, troughIdx + 1),
  };
}

function aggregateReturns(trades: PickTrade[], keyFn: (t: PickTrade) => string) {
  const map = new Map<string, number>();
  for (const t of trades) {
    const k = keyFn(t);
    map.set(k, (map.get(k) ?? 0) + t.pnlJpyFixed);
  }
  return [...map.entries()]
    .map(([period, pnlJpy]) => ({
      period,
      pnlJpy: round2(pnlJpy),
      returnPct: round3((pnlJpy / INITIAL_CAPITAL_JPY) * 100),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function calcFixedCapitalMetrics(fixedCurve: EquityPoint[]) {
  if (fixedCurve.length === 0) {
    return { cagrPct: null, maxDrawdownPct: null, sharpe: null, annualizedReturnPct: null, totalReturnPct: null };
  }
  const start = fixedCurve[0]!.date;
  const end = fixedCurve[fixedCurve.length - 1]!.date;
  const years = yearsBetween(start, end);
  const finalEq = fixedCurve[fixedCurve.length - 1]!.equityJpy;
  const totalReturn = (finalEq - INITIAL_CAPITAL_JPY) / INITIAL_CAPITAL_JPY;
  const cagr = Math.pow(finalEq / INITIAL_CAPITAL_JPY, 1 / years) - 1;
  const dailyPct = fixedCurve.map((p) => (p.dailyPnlJpy / INITIAL_CAPITAL_JPY) * 100);
  const sharpe = (mean(dailyPct) / std(dailyPct)) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  const minDd = Math.min(...fixedCurve.map((p) => p.drawdownPct));
  return {
    cagrPct: round3(cagr * 100),
    maxDrawdownPct: round2(minDd),
    sharpe: round3(sharpe),
    annualizedReturnPct: round3((totalReturn * 100) / years),
    totalReturnPct: round3(totalReturn * 100),
  };
}

function writeCsv(filePath: string, headers: string[], rows: Array<Array<string | number>>) {
  const lines = [headers.join(','), ...rows.map((r) => r.join(','))];
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function writeSvgEquityChart(filePath: string, title: string, points: Array<{ date: string; equity: number }>) {
  const w = 1200;
  const h = 420;
  const pad = { l: 60, r: 20, t: 40, b: 50 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const ys = points.map((p) => p.equity);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const yRange = maxY - minY || 1;
  const coords = points.map((p, i) => {
    const x = pad.l + (i / Math.max(points.length - 1, 1)) * innerW;
    const y = pad.t + (1 - (p.equity - minY) / yRange) * innerH;
    return { x, y, ...p };
  });
  const poly = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#0f172a"/>
  <text x="${pad.l}" y="24" fill="#e2e8f0" font-size="16" font-family="sans-serif">${title}</text>
  <polyline fill="none" stroke="#38bdf8" stroke-width="2" points="${poly}"/>
  <text x="${pad.l}" y="${h - 12}" fill="#94a3b8" font-size="11" font-family="sans-serif">${points[0]?.date ?? ''}</text>
  <text x="${w - pad.r - 90}" y="${h - 12}" fill="#94a3b8" font-size="11" font-family="sans-serif">${points[points.length - 1]?.date ?? ''}</text>
  <text x="8" y="${pad.t + 12}" fill="#94a3b8" font-size="11" font-family="sans-serif">${maxY.toFixed(2)}</text>
  <text x="8" y="${pad.t + innerH}" fill="#94a3b8" font-size="11" font-family="sans-serif">${minY.toFixed(2)}</text>
</svg>`;
  fs.writeFileSync(filePath, svg, 'utf8');
}

describe('Top3 MaxDD deep audit', () => {
  it('writes MaxDD root-cause report with CSV/SVG equity curves', async () => {
    const samples: SampleRow[] = [];
    for (const def of SYMBOL_DEFS) {
      const bars = await fetchYahooOhlcv(def.yahooSymbol);
      samples.push(...buildSamplesForSymbol(def.symbol, bars));
    }
    samples.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

    const months = [...new Set(samples.map((s) => s.month))].sort();
    const rules = buildRuleDefs();
    const chartDir = path.join(process.cwd(), 'scripts', 'top3-maxdd-charts');
    fs.mkdirSync(chartDir, { recursive: true });

    const perRule: unknown[] = [];

    for (const rule of rules) {
      const rawPicks: Array<{ date: string; month: string; symbol: string; expectancyPct: number; testMonth: string }> = [];

      for (const testMonth of months) {
        const trainStart = monthAdd(testMonth, -TRAIN_MONTHS);
        const trainEnd = testMonth;
        const testEnd = monthAdd(testMonth, TEST_MONTHS);
        const trainRows = samples.filter((s) => inMonthRange(s.month, trainStart, trainEnd));
        const testRows = samples.filter((s) => inMonthRange(s.month, testMonth, testEnd));
        if (trainRows.length < MIN_TRAIN_SAMPLES || testRows.length === 0) continue;

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

        for (const row of testRows.filter((r) => scoreRow(r) >= best.thr)) {
          rawPicks.push({
            date: row.date,
            month: row.month,
            symbol: row.symbol,
            expectancyPct: row.expectancyPct,
            testMonth,
          });
        }
      }

      const byDateCount = new Map<string, number>();
      for (const p of rawPicks) byDateCount.set(p.date, (byDateCount.get(p.date) ?? 0) + 1);
      const trades: PickTrade[] = rawPicks.map((p) => {
        const n = byDateCount.get(p.date)!;
        const weightPct = round3(100 / n);
        const pnlJpyFixed = round2((INITIAL_CAPITAL_JPY * weightPct) / 100 * (p.expectancyPct / 100));
        return { ...p, year: yearStr(p.date), weightPct, pnlJpyFixed };
      });

      const tradeLossStreak = maxConsecutive(trades, (t) => t.expectancyPct < 0);
      const { compoundCurve, fixedCurve } = buildEquityCurves(trades);
      const dailyPoints = compoundCurve.map((c) => ({ date: c.date, equity: c.equity }));
      const dayLossStreak = maxConsecutive(dailyPoints.map((d) => ({ date: d.date, ret: compoundCurve.find((x) => x.date === d.date)!.dailyReturnPct })), (x) => x.ret < 0);

      const ddCompound = findMaxDdWindow(compoundCurve);
      const ddFixed = findMaxDdWindow(
        fixedCurve.map((p) => ({ date: p.date, equity: p.equityJpy, drawdownPct: p.drawdownPct })),
      );

      const peak = ddCompound.peakDate!;
      const trough = ddCompound.troughDate!;
      const windowTrades = trades.filter((t) => t.date >= peak && t.date <= trough);
      const symbolPnl = [...windowTrades.reduce((m, t) => m.set(t.symbol, (m.get(t.symbol) ?? 0) + t.pnlJpyFixed), new Map<string, number>())]
        .map(([symbol, pnlJpy]) => ({ symbol, pnlJpy: round2(pnlJpy) }))
        .sort((a, b) => a.pnlJpy - b.pnlJpy);

      const annualReturns = aggregateReturns(trades, (t) => t.year);
      const monthlyReturns = aggregateReturns(trades, (t) => t.month);
      const fixedMetrics = calcFixedCapitalMetrics(fixedCurve);

      const fileBase = safeFileName(rule.name);
      const csvPath = path.join(chartDir, `${fileBase}-maxdd-window.csv`);
      const svgPath = path.join(chartDir, `${fileBase}-maxdd-window.svg`);
      writeCsv(
        csvPath,
        ['date', 'equity_compound', 'drawdownPct_compound', 'dailyReturnPct'],
        ddCompound.windowCurve.map((p) => [p.date, p.equity, p.drawdownPct, p.dailyReturnPct ?? '']),
      );
      writeSvgEquityChart(
        svgPath,
        `${rule.name} MaxDD window (${peak} -> ${trough})`,
        ddCompound.windowCurve.map((p) => ({ date: p.date, equity: p.equity })),
      );

      perRule.push({
        ruleName: rule.name,
        buySignalCount: trades.length,
        averageHoldingDays: HOLDING_DAYS,
        maxConsecutiveLosses: {
          tradeLevel: tradeLossStreak,
          dayLevel: { count: dayLossStreak.count, start: dayLossStreak.start, end: dayLossStreak.end },
        },
        maxDrawdownCompoundEqualWeight: {
          maxDrawdownPct: ddCompound.maxDrawdownPct,
          peakDate: ddCompound.peakDate,
          troughDate: ddCompound.troughDate,
          peakEquity: ddCompound.peakEquity,
          troughEquity: ddCompound.troughEquity,
          equityProgressionAtMaxDd: ddCompound.windowCurve,
        },
        maxDrawdownPeriodTrades: windowTrades,
        maxDrawdownPeriodSymbolPnl: symbolPnl,
        annualReturnsFixedCapital: annualReturns,
        monthlyReturnsFixedCapital: monthlyReturns,
        fixedCapital1MNoCompound: {
          initialCapitalJpy: INITIAL_CAPITAL_JPY,
          compounding: false,
          ...fixedMetrics,
          noteJa: '日次PnLを初期資金100万円に対する固定比率で加算（複利なし）',
        },
        fixedCapitalMaxDdWindow: {
          peakDate: ddFixed.peakDate,
          troughDate: ddFixed.troughDate,
          maxDrawdownPct: ddFixed.maxDrawdownPct,
        },
        outputFiles: { csvPath, svgPath },
        whyStillLargeDrawdownJa: [
          `複利かつ同日均等配分でも日次リターンが連続マイナス（最大${dayLossStreak.count}日連続）`,
          `最大DD期間の合計損益(固定資金)=${round2(windowTrades.reduce((a, t) => a + t.pnlJpyFixed, 0))}円`,
          `複利曲線ではピーク${ddCompound.peakEquity}→ボトム${ddCompound.troughEquity}（DD ${ddCompound.maxDrawdownPct}%）`,
        ],
      });
    }

    const report = {
      methodologyJa: {
        selection: 'Top3特徴ウォークフォワード（6M学習→1M検証）',
        capitalOnTrades: '同日N銘柄は各100/N%配分',
        fixedCapitalModel: '初期100万円・複利なし・日次PnL加算',
        holding: `シグナル翌日エントリー・${HOLDING_DAYS}営業日保有`,
      },
      perRule,
      conclusionsJa: [
        '複利MaxDD -70%台は主に「日次リターンの連続マイナス × 複利効果」',
        '固定資金100万・非複利ではMaxDDは大幅に縮小するが、トレード数/同日集中により損失期間は残る',
        '各ルールのMaxDD期間CSV/SVGは scripts/top3-maxdd-charts/ に出力',
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'top3-maxdd-deep-audit.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n=== TOP3 MAXDD DEEP AUDIT ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
