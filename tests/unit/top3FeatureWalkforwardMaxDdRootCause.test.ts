/**
 * MaxDD root-cause deep audit (fixed capital, no compounding)
 * npx vitest run tests/unit/top3FeatureWalkforwardMaxDdRootCause.test.ts
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

const TOP3 = ['distFrom52wHighPct', 'macdHistPct', 'adx14'] as const;
type FeatureKey = (typeof TOP3)[number];

type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };
type SampleRow = { date: string; month: string; symbol: string; expectancyPct: number } & Record<FeatureKey, number>;
type RuleDef = { name: string; keys: FeatureKey[] };
type Pick = { date: string; symbol: string; expectancyPct: number; testMonth: string };
type EquityPoint = { date: string; tradeCount: number; dailyReturnPct: number; dailyPnl: number; equity: number; drawdownPct: number };

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
function zNorm(values: number[]): { mean: number; std: number } {
  const m = mean(values);
  const s = std(values);
  return { mean: m, std: s > 1e-9 ? s : 1 };
}
function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]+/g, '_');
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

function buildSvg(points: EquityPoint[], title: string): string {
  const w = 1000;
  const h = 400;
  const pad = 40;
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.equity);
  const minX = 0;
  const maxX = Math.max(1, xs.length - 1);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xScale = (x: number) => pad + ((x - minX) / (maxX - minX)) * (w - pad * 2);
  const yScale = (y: number) => h - pad - ((y - minY) / Math.max(1e-9, maxY - minY)) * (h - pad * 2);
  const poly = points.map((p, i) => `${xScale(i).toFixed(2)},${yScale(p.equity).toFixed(2)}`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
<rect x="0" y="0" width="${w}" height="${h}" fill="white"/>
<text x="${pad}" y="24" font-size="16" font-family="Arial">${title}</text>
<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#333"/>
<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#333"/>
<polyline fill="none" stroke="#0b84f3" stroke-width="2" points="${poly}"/>
<text x="${pad}" y="${h - 8}" font-size="11" font-family="Arial">start</text>
<text x="${w - pad - 60}" y="${h - 8}" font-size="11" font-family="Arial">end</text>
<text x="${pad + 4}" y="${pad + 12}" font-size="11" font-family="Arial">max ${round2(maxY)}</text>
<text x="${pad + 4}" y="${h - pad - 4}" font-size="11" font-family="Arial">min ${round2(minY)}</text>
</svg>`;
}

describe('Top3 MaxDD root-cause deep audit', () => {
  it('writes streak/DD/year-month/fixed-capital report with CSV and graph', async () => {
    const samples: SampleRow[] = [];
    for (const def of SYMBOL_DEFS) {
      const bars = await fetchYahooOhlcv(def.yahooSymbol);
      samples.push(...buildSamplesForSymbol(def.symbol, bars));
    }
    samples.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

    const months = [...new Set(samples.map((s) => s.month))].sort();
    const rules = buildRuleDefs();
    const picksByRule = new Map<string, Pick[]>();
    for (const r of rules) picksByRule.set(r.name, []);

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
        const arr = picksByRule.get(rule.name)!;
        for (const row of selectedTest) {
          arr.push({ date: row.date, symbol: row.symbol, expectancyPct: row.expectancyPct, testMonth });
        }
      }
    }

    const outDir = path.join(process.cwd(), 'scripts', 'maxdd-rootcause');
    fs.mkdirSync(outDir, { recursive: true });

    const perRule = rules.map((rule) => {
      const picks = picksByRule.get(rule.name)!.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));
      const tradeReturns = picks.map((p) => p.expectancyPct);
      let maxLosingStreak = 0;
      let curStreak = 0;
      let curStart: string | null = null;
      let streakStart: string | null = null;
      let streakEnd: string | null = null;
      for (const t of picks) {
        if (t.expectancyPct < 0) {
          curStreak += 1;
          if (!curStart) curStart = t.date;
          if (curStreak > maxLosingStreak) {
            maxLosingStreak = curStreak;
            streakStart = curStart;
            streakEnd = t.date;
          }
        } else {
          curStreak = 0;
          curStart = null;
        }
      }

      const byDate = new Map<string, Pick[]>();
      for (const p of picks) {
        const arr = byDate.get(p.date) ?? [];
        arr.push(p);
        byDate.set(p.date, arr);
      }
      const dates = [...byDate.keys()].sort();
      const curve: EquityPoint[] = [];
      let equity = INITIAL_CAPITAL;
      let peak = INITIAL_CAPITAL;
      let maxDd = 0;
      let ddStart = dates[0] ?? null;
      let ddTrough = dates[0] ?? null;
      let peakDate = dates[0] ?? null;

      for (const d of dates) {
        const arr = byDate.get(d)!;
        const dayRetPct = arr.reduce((a, b) => a + b.expectancyPct, 0) / arr.length; // equal weight
        const dayPnl = (INITIAL_CAPITAL * dayRetPct) / 100; // fixed capital no compounding
        equity += dayPnl;
        if (equity > peak) {
          peak = equity;
          peakDate = d;
        }
        const dd = peak > 0 ? equity / peak - 1 : -1;
        if (dd < maxDd) {
          maxDd = dd;
          ddStart = peakDate;
          ddTrough = d;
        }
        curve.push({
          date: d,
          tradeCount: arr.length,
          dailyReturnPct: round3(dayRetPct),
          dailyPnl: round2(dayPnl),
          equity: round2(equity),
          drawdownPct: round2(dd * 100),
        });
      }

      const ddCurve = ddStart && ddTrough ? curve.filter((p) => p.date >= ddStart && p.date <= ddTrough) : [];
      const ddTrades =
        ddStart && ddTrough ? picks.filter((p) => p.date >= ddStart && p.date <= ddTrough) : [];

      const symbolPnlMap = new Map<string, { pnl: number; count: number }>();
      for (const d of ddCurve) {
        const arr = byDate.get(d.date)!;
        const n = arr.length;
        for (const t of arr) {
          const contrib = (INITIAL_CAPITAL / n) * (t.expectancyPct / 100);
          const rec = symbolPnlMap.get(t.symbol) ?? { pnl: 0, count: 0 };
          rec.pnl += contrib;
          rec.count += 1;
          symbolPnlMap.set(t.symbol, rec);
        }
      }
      const symbolPnlInDd = [...symbolPnlMap.entries()]
        .map(([symbol, v]) => ({ symbol, pnlMYR: round2(v.pnl), tradeCount: v.count }))
        .sort((a, b) => a.pnlMYR - b.pnlMYR);

      const yearly = new Map<string, number>();
      const monthly = new Map<string, number>();
      for (const d of curve) {
        yearly.set(yearStr(d.date), (yearly.get(yearStr(d.date)) ?? 0) + d.dailyPnl);
        monthly.set(monthStr(d.date), (monthly.get(monthStr(d.date)) ?? 0) + d.dailyPnl);
      }
      const yearlyReturns = [...yearly.entries()]
        .map(([year, pnl]) => ({ year, pnlMYR: round2(pnl), returnPct: round3((pnl / INITIAL_CAPITAL) * 100) }))
        .sort((a, b) => a.year.localeCompare(b.year));
      const monthlyReturns = [...monthly.entries()]
        .map(([month, pnl]) => ({ month, pnlMYR: round2(pnl), returnPct: round3((pnl / INITIAL_CAPITAL) * 100) }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const yearsSpan =
        curve.length > 1
          ? (new Date(`${curve[curve.length - 1]!.date}T00:00:00Z`).getTime() -
              new Date(`${curve[0]!.date}T00:00:00Z`).getTime()) /
            (365.25 * 24 * 3600 * 1000)
          : 0;
      const ending = curve.length > 0 ? curve[curve.length - 1]!.equity : INITIAL_CAPITAL;
      const cagr =
        yearsSpan > 0 && ending > 0 ? Math.pow(ending / INITIAL_CAPITAL, 1 / yearsSpan) - 1 : null;
      const annualizedSimple =
        yearsSpan > 0 ? ((ending - INITIAL_CAPITAL) / INITIAL_CAPITAL / yearsSpan) : null;
      const dailyRetSeries = curve.map((c) => c.dailyReturnPct);
      const sharpe =
        dailyRetSeries.length > 1 && std(dailyRetSeries) > 1e-9 ? mean(dailyRetSeries) / std(dailyRetSeries) : null;

      const buySignalCount = picks.length;
      const avgHoldingDays = FORWARD_DAYS;

      const csvPath = path.join(outDir, `${sanitize(rule.name)}-maxdd-curve.csv`);
      const csvRows = ['date,tradeCount,dailyReturnPct,dailyPnl,equity,drawdownPct'];
      for (const p of ddCurve) {
        csvRows.push(`${p.date},${p.tradeCount},${p.dailyReturnPct},${p.dailyPnl},${p.equity},${p.drawdownPct}`);
      }
      fs.writeFileSync(csvPath, `${csvRows.join('\n')}\n`, 'utf8');

      const svgPath = path.join(outDir, `${sanitize(rule.name)}-maxdd-curve.svg`);
      fs.writeFileSync(svgPath, buildSvg(ddCurve.length > 1 ? ddCurve : curve, `${rule.name} MaxDD Curve`), 'utf8');

      return {
        ruleName: rule.name,
        maxLosingStreak: {
          count: maxLosingStreak,
          period: { start: streakStart, end: streakEnd },
        },
        maxDrawdown: {
          maxDrawdownPct: round2(maxDd * 100),
          period: { start: ddStart, trough: ddTrough },
          assetPathDuringMaxDd: ddCurve,
        },
        tradesDuringMaxDd: ddTrades,
        symbolPnlDuringMaxDd: symbolPnlInDd,
        yearlyReturns,
        monthlyReturns,
        fixedCapitalNoCompounding: {
          initialCapitalMYR: INITIAL_CAPITAL,
          cagrPct: cagr == null ? null : round3(cagr * 100),
          maxDrawdownPct: round2(maxDd * 100),
          sharpe: sharpe == null ? null : round3(sharpe),
          buySignalCount,
          avgHoldingDays,
          annualizedReturnPct: annualizedSimple == null ? null : round3(annualizedSimple * 100),
          endingEquityMYR: round2(ending),
        },
        files: {
          maxDdCurveCsv: csvPath,
          maxDdCurveGraphSvg: svgPath,
        },
      };
    });

    const newRanking = [...perRule]
      .sort((a, b) => {
        const ea = a.fixedCapitalNoCompounding.annualizedReturnPct ?? -999;
        const eb = b.fixedCapitalNoCompounding.annualizedReturnPct ?? -999;
        if (eb !== ea) return eb - ea;
        const sa = a.fixedCapitalNoCompounding.sharpe ?? -999;
        const sb = b.fixedCapitalNoCompounding.sharpe ?? -999;
        if (sb !== sa) return sb - sa;
        return b.fixedCapitalNoCompounding.maxDrawdownPct - a.fixedCapitalNoCompounding.maxDrawdownPct;
      })
      .map((r, i) => ({
        rank: i + 1,
        ruleName: r.ruleName,
        annualizedReturnPct: r.fixedCapitalNoCompounding.annualizedReturnPct,
        cagrPct: r.fixedCapitalNoCompounding.cagrPct,
        sharpe: r.fixedCapitalNoCompounding.sharpe,
        maxDrawdownPct: r.fixedCapitalNoCompounding.maxDrawdownPct,
      }));

    const report = {
      methodologyJa: {
        objective: 'MaxDDが-70%台となる原因の深掘り',
        capitalModel: '初期資金100万円・固定資金運用・複利なし',
        allocation: '同日採用N銘柄へ100/N%均等配分、総エクスポージャー100%',
        holdDays: FORWARD_DAYS,
      },
      perRule,
      oosRankingFixedCapital: newRanking,
      summaryJa: newRanking.map(
        (r) =>
          `#${r.rank} ${r.ruleName}: 年率${r.annualizedReturnPct ?? '—'}% CAGR=${r.cagrPct ?? '—'}% Sharpe=${r.sharpe ?? '—'} MaxDD=${r.maxDrawdownPct}%`,
      ),
    };

    const out = path.join(process.cwd(), 'scripts', 'top3-feature-maxdd-rootcause-report.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n=== TOP3 MAXDD ROOTCAUSE ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
