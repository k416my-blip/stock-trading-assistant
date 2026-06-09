/**
 * 6-ETF stable strategy — per-ETF + integrated, yearly 2024–2026
 * npx vitest run tests/unit/sixEtfStableStrategyBacktest.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const ETFS = ['SCHD', 'SPY', 'VYM', 'VIG', 'DGRO', 'SPLG'] as const;
type Etf = (typeof ETFS)[number];

const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';
const HOLD_DAYS = 20;
const MAX_CONCURRENT = 2;
const ADX_MIN = 25;
const MACD_MIN = 0.15;
const DIST52_MAX = -7;
const MIN_TRADES_TARGET = 100;
const MAX_DD_GOAL_PCT = -20;
const SHARPE_GOAL = 0.8;

const YEARS = ['2024', '2025', '2026'] as const;

const ETF_PRIORITY: Record<Etf, number> = {
  SCHD: 6,
  VIG: 5,
  DGRO: 4,
  VYM: 3,
  SPLG: 2,
  SPY: 1,
};

type OhlcvBar = { date: string; high: number; low: number; close: number };
type RawBar = {
  date: string;
  symbol: Etf;
  year: string;
  returnPctGross: number;
  adx: number;
  macd: number;
  dist52: number;
};

type Signal = { date: string; symbol: Etf; returnPct: number; year: string };

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

function buildRawBars(bars: OhlcvBar[], symbol: Etf): RawBar[] {
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
      symbol,
      year: date.slice(0, 4),
      returnPctGross: round3(((bars[exitIdx]!.close / entry - 1) * 100)),
      adx,
      macd,
      dist52,
    });
  }
  return out;
}

function toSignals(raw: RawBar[], symbolFilter: Etf | null, yearFilter: string | null): Signal[] {
  return raw
    .filter(
      (r) =>
        r.adx > ADX_MIN &&
        r.macd > MACD_MIN &&
        r.dist52 <= DIST52_MAX &&
        (symbolFilter == null || r.symbol === symbolFilter) &&
        (yearFilter == null || r.year === yearFilter),
    )
    .map((r) => ({ date: r.date, symbol: r.symbol, returnPct: r.returnPctGross, year: r.year }));
}

function runPortfolio(signals: Signal[], maxConcurrent: number): { dailyReturns: number[]; dates: string[]; tradeCount: number } {
  const byDate = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const dates = [...byDate.keys()].sort();
  const dailyReturns: number[] = [];
  const outDates: string[] = [];
  let tradeCount = 0;
  for (const d of dates) {
    const day = [...byDate.get(d)!].sort((a, b) => ETF_PRIORITY[b.symbol] - ETF_PRIORITY[a.symbol]);
    const taken = day.slice(0, maxConcurrent);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    outDates.push(d);
    tradeCount += taken.length;
  }
  return { dailyReturns, dates: outDates, tradeCount };
}

function metricsFromDaily(dailyReturns: number[], dates: string[]) {
  if (dailyReturns.length === 0) {
    return {
      sharpe: null as number | null,
      maxDrawdownPct: null as number | null,
      profitFactor: null as number | null,
      cagrPct: null as number | null,
      activeDays: 0,
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
    activeDays: dailyReturns.length,
  };
}

function yearBlock(raw: RawBar[], symbol: Etf | null, year: string) {
  const sig = toSignals(raw, symbol, year);
  const run = runPortfolio(sig, symbol ? 1 : MAX_CONCURRENT);
  const m = metricsFromDaily(run.dailyReturns, run.dates);
  return {
    tradeCount: run.tradeCount,
    fires: run.tradeCount > 0,
    sharpe: m.sharpe,
    maxDrawdownPct: m.maxDrawdownPct,
    profitFactor: m.profitFactor,
    cagrPct: m.cagrPct,
    activeDays: m.activeDays,
  };
}

function evaluateEntity(
  id: string,
  labelJa: string,
  raw: RawBar[],
  symbol: Etf | null,
) {
  const byYear = Object.fromEntries(YEARS.map((y) => [y, yearBlock(raw, symbol, y)])) as Record<
    (typeof YEARS)[number],
    ReturnType<typeof yearBlock>
  >;
  const fullSig = toSignals(raw, symbol, null);
  const full = runPortfolio(fullSig, symbol ? 1 : MAX_CONCURRENT);
  const fullM = metricsFromDaily(full.dailyReturns, full.dates);
  const firesAllYears = YEARS.every((y) => byYear[y]!.fires);
  return {
    id,
    labelJa,
    byYear,
    fullPeriod: {
      tradeCount: full.tradeCount,
      sharpe: fullM.sharpe,
      maxDrawdownPct: fullM.maxDrawdownPct,
      profitFactor: fullM.profitFactor,
      cagrPct: fullM.cagrPct,
      activeDays: fullM.activeDays,
    },
    checks: {
      maxDdUnder20: fullM.maxDrawdownPct != null && fullM.maxDrawdownPct >= MAX_DD_GOAL_PCT,
      firesAllYears,
      trades100Plus: full.tradeCount >= MIN_TRADES_TARGET,
      sharpeAbove08: (fullM.sharpe ?? -1) >= SHARPE_GOAL,
      meetsPriority1234:
        fullM.maxDrawdownPct != null &&
        fullM.maxDrawdownPct >= MAX_DD_GOAL_PCT &&
        firesAllYears &&
        full.tradeCount >= MIN_TRADES_TARGET &&
        (fullM.sharpe ?? -1) >= SHARPE_GOAL,
    },
  };
}

function priorityScore(r: ReturnType<typeof evaluateEntity>): number {
  let s = 0;
  if (r.checks.maxDdUnder20) s += 10_000;
  if (r.checks.firesAllYears) s += 5_000;
  if (r.checks.trades100Plus) s += 2_500;
  if (r.checks.sharpeAbove08) s += 1_000;
  s += Math.min(r.fullPeriod.tradeCount, 300);
  if (r.fullPeriod.maxDrawdownPct != null) s += r.fullPeriod.maxDrawdownPct * 10;
  s += (r.fullPeriod.sharpe ?? 0) * 50;
  return s;
}

describe('6-ETF stable strategy backtest', () => {
  it('writes per-ETF yearly + integrated metrics with priority ranking', async () => {
    const raw: RawBar[] = [];
    for (const sym of ETFS) {
      raw.push(...buildRawBars(await fetchYahooOhlcv(sym), sym));
    }

    const perEtf = ETFS.map((sym) => evaluateEntity(sym, `${sym} 単体`, raw, sym));
    const integrated = evaluateEntity('ALL', '全ETF統合（同時2）', raw, null);

    const ranked = [...perEtf, integrated].sort((a, b) => priorityScore(b) - priorityScore(a));
    ranked.forEach((r, i) => {
      (r as { rank: number }).rank = i + 1;
    });

    const report = {
      strategyJa: {
        adx: `> ${ADX_MIN}`,
        macd: `> ${MACD_MIN}`,
        dist52w: `<= ${DIST52_MAX}%`,
        maxConcurrent: MAX_CONCURRENT,
        holdDays: HOLD_DAYS,
        universe: [...ETFS],
        period: `${SIGNAL_START} 〜`,
      },
      evaluationPriorityJa: [
        '1. MaxDD < 20%',
        '2. 2024/2025/2026 全年度発火',
        `3. トレード >= ${MIN_TRADES_TARGET}`,
        `4. Sharpe > ${SHARPE_GOAL}`,
      ],
      perEtf: Object.fromEntries(perEtf.map((e) => [e.id, e])),
      integrated,
      ranking: ranked.map((r) => ({
        rank: (r as { rank: number }).rank,
        id: r.id,
        maxDd: r.fullPeriod.maxDrawdownPct,
        trades: r.fullPeriod.tradeCount,
        sharpe: r.fullPeriod.sharpe,
        fires24: r.byYear['2024']!.fires,
        fires25: r.byYear['2025']!.fires,
        fires26: r.byYear['2026']!.fires,
        checks: r.checks,
      })),
      recommendationJa: (() => {
        const allYears = ranked.filter((r) => r.checks.firesAllYears);
        const ddOk = ranked.filter((r) => r.checks.maxDdUnder20);
        if (integrated.checks.meetsPriority1234) return '全ETF統合が全優先条件を満たす。';
        if (ddOk.length === 0) return 'MaxDD<20%を満たす構成なし。';
        const best = ranked[0]!;
        return `優先スコア1位: ${best.id}（MaxDD ${best.fullPeriod.maxDrawdownPct}%, トレード ${best.fullPeriod.tradeCount}, 全年度発火 ${best.checks.firesAllYears}）。全年度発火は ${allYears.map((x) => x.id).join(', ') || 'なし'}。`;
      })(),
    };

    const outDir = path.join(process.cwd(), 'scripts', 'six-etf-stable-backtest');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csvRows = [
      'entity,year,trades,sharpe,maxDD,PF',
      ...perEtf.flatMap((e) =>
        YEARS.map((y) =>
          [e.id, y, e.byYear[y]!.tradeCount, e.byYear[y]!.sharpe ?? '', e.byYear[y]!.maxDrawdownPct ?? '', e.byYear[y]!.profitFactor ?? ''].join(','),
        ),
      ),
      ['ALL', 'full', integrated.fullPeriod.tradeCount, integrated.fullPeriod.sharpe ?? '', integrated.fullPeriod.maxDrawdownPct ?? '', integrated.fullPeriod.profitFactor ?? ''].join(','),
    ];
    fs.writeFileSync(path.join(outDir, 'yearly.csv'), `${csvRows.join('\n')}\n`, 'utf8');

    console.log('\n=== 6-ETF STABLE BACKTEST ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
