/**
 * Hold 25d + dist≤-3% / ADX>25 / MACD>0.10 — progressive ETF universe expansion
 * npx vitest run tests/unit/case4Hold25UniverseExpansion.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const ALL_ETFS = ['SCHD', 'SPY', 'VYM', 'VIG', 'DGRO', 'SPLG'] as const;
type Etf = (typeof ALL_ETFS)[number];

const HOLD_DAYS = 25;
const MAX_CONCURRENT = 2;
const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';
const YEARS = ['2024', '2025', '2026'] as const;

const ADX_MIN = 25;
const MACD_MIN = 0.1;
const DIST52_MAX = -3;

const GOAL_SHARPE = 0.8;
const GOAL_MAX_DD = -20;
const GOAL_MIN_TRADES = 100;

const UNIVERSE_STEPS: Array<{ id: string; labelJa: string; symbols: readonly Etf[] }> = [
  { id: 'schd_spy', labelJa: 'SCHD + SPY', symbols: ['SCHD', 'SPY'] },
  { id: 'plus_vym', labelJa: 'SCHD + SPY + VYM', symbols: ['SCHD', 'SPY', 'VYM'] },
  { id: 'plus_vig', labelJa: 'SCHD + SPY + VYM + VIG', symbols: ['SCHD', 'SPY', 'VYM', 'VIG'] },
  { id: 'plus_dgro', labelJa: 'SCHD + SPY + VYM + VIG + DGRO', symbols: ['SCHD', 'SPY', 'VYM', 'VIG', 'DGRO'] },
  { id: 'plus_splg', labelJa: 'SCHD + SPY + VYM + VIG + DGRO + SPLG', symbols: [...ALL_ETFS] },
];

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
  year: string;
  symbol: Etf;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
  returnPct: number;
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

function buildRaw(bars: OhlcvBar[], symbol: Etf): RawBar[] {
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
      return (bars[i]!.close / maxH - 1) * 100;
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

function toSignals(raw: RawBar[], universe: readonly Etf[], yearFilter: string | null): Signal[] {
  const set = new Set(universe);
  return raw
    .filter(
      (r) =>
        set.has(r.symbol) &&
        r.adx14 > ADX_MIN &&
        r.macdHistPct > MACD_MIN &&
        r.dist52wPct <= DIST52_MAX &&
        (yearFilter == null || r.year === yearFilter),
    )
    .map((r) => ({ date: r.date, symbol: r.symbol, returnPct: r.returnPct, year: r.year }));
}

function runPortfolio(signals: Signal[]) {
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
  let wins = 0;
  for (const d of dates) {
    const day = [...byDate.get(d)!].sort((a, b) => ETF_PRIORITY[b.symbol] - ETF_PRIORITY[a.symbol]);
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

function evaluateUniverse(raw: RawBar[], step: (typeof UNIVERSE_STEPS)[number]) {
  const tradesByYear = Object.fromEntries(
    YEARS.map((y) => {
      const run = runPortfolio(toSignals(raw, step.symbols, y));
      return [y, run.tradeCount] as const;
    }),
  ) as Record<(typeof YEARS)[number], number>;

  const full = runPortfolio(toSignals(raw, step.symbols, null));
  const m = metrics(full.dailyReturns, full.dates, full.tradeCount, full.tradeWinRate);
  const firesAllYears = YEARS.every((y) => tradesByYear[y]! > 0);

  return {
    id: step.id,
    labelJa: step.labelJa,
    universe: [...step.symbols],
    tradeCount: full.tradeCount,
    ...m,
    tradesByYear,
    firesAllYears,
    checks: {
      sharpeOk: (m.sharpe ?? -1) >= GOAL_SHARPE,
      maxDdOk: m.maxDrawdownPct != null && m.maxDrawdownPct >= GOAL_MAX_DD,
      trades100: full.tradeCount > GOAL_MIN_TRADES,
      allYears: firesAllYears,
      meetsAllFour: false,
    },
  };
}

function priorityScore(r: ReturnType<typeof evaluateUniverse>): number {
  let s = 0;
  if (r.checks.sharpeOk) s += 10_000;
  if (r.checks.maxDdOk) s += 5_000;
  if (r.checks.trades100) s += 2_500;
  if (r.checks.allYears) s += 1_000;
  s += Math.min(r.tradeCount, 300);
  s += (r.sharpe ?? 0) * 50;
  if (r.maxDrawdownPct != null) s += r.maxDrawdownPct * 5;
  return s;
}

function pickOperationalCandidate(results: ReturnType<typeof evaluateUniverse>[]) {
  for (const r of results) {
    r.checks.meetsAllFour = r.checks.sharpeOk && r.checks.maxDdOk && r.checks.trades100 && r.checks.allYears;
  }
  const ranked = [...results].sort((a, b) => priorityScore(b) - priorityScore(a));
  ranked.forEach((r, i) => {
    (r as { rank: number }).rank = i + 1;
  });

  const allFour = ranked.filter((r) => r.checks.meetsAllFour);
  if (allFour.length > 0) {
    return {
      pick: allFour[0]!,
      reasonJa: `4条件すべて達成。最多Sharpe・件数バランスで ${allFour[0]!.labelJa} を選定。`,
      ranked,
      allFourCount: allFour.length,
    };
  }

  const sharpeDdYears = ranked.filter((r) => r.checks.sharpeOk && r.checks.maxDdOk && r.checks.allYears);
  if (sharpeDdYears.length > 0) {
    const pick = sharpeDdYears[0]!;
    return {
      pick,
      reasonJa: `①②④達成・③100件未達（${pick.tradeCount}件）。ユニバース拡張の実運用候補として ${pick.labelJa} を選定。`,
      ranked,
      allFourCount: 0,
    };
  }

  const sharpeDd = ranked.filter((r) => r.checks.sharpeOk && r.checks.maxDdOk);
  const pick = sharpeDd[0] ?? ranked[0]!;
  return {
    pick,
    reasonJa: sharpeDd.length
      ? `①②のみ達成。件数最多の ${pick.labelJa}（${pick.tradeCount}件）を暫定候補とする。`
      : `目標未達。相対最良 ${pick.labelJa} を参考値として記録。`,
    ranked,
    allFourCount: 0,
  };
}

describe('Case4 hold25 universe expansion', () => {
  it('writes progressive ETF universe comparison and operational pick', async () => {
    const raw: RawBar[] = [];
    for (const sym of ALL_ETFS) {
      raw.push(...buildRaw(await fetchYahooOhlcv(sym), sym));
    }

    const results = UNIVERSE_STEPS.map((step) => evaluateUniverse(raw, step));
    const { pick, reasonJa, ranked, allFourCount } = pickOperationalCandidate(results);

    const report = {
      fixedStrategyJa: {
        dist52w: `<= ${DIST52_MAX}%`,
        adx: `> ${ADX_MIN}`,
        macd: `> ${MACD_MIN}`,
        holdDays: HOLD_DAYS,
        maxConcurrent: MAX_CONCURRENT,
        period: `${SIGNAL_START}〜`,
      },
      evaluationPriorityJa: [
        '① Sharpe > 0.8',
        '② MaxDD < 20%',
        '③ トレード > 100',
        '④ 全年度発火',
      ],
      universeSteps: ranked,
      meetsAllFourCount: allFourCount,
      operationalCandidate: {
        id: pick.id,
        labelJa: pick.labelJa,
        universe: pick.universe,
        tradeCount: pick.tradeCount,
        sharpe: pick.sharpe,
        maxDrawdownPct: pick.maxDrawdownPct,
        profitFactor: pick.profitFactor,
        winRate: pick.winRate,
        cagrPct: pick.cagrPct,
        tradesByYear: pick.tradesByYear,
        checks: pick.checks,
        selectionReasonJa: reasonJa,
      },
      incrementalDelta: results.map((r, i) => ({
        step: r.labelJa,
        tradeCount: r.tradeCount,
        deltaTrades: i === 0 ? r.tradeCount : r.tradeCount - results[i - 1]!.tradeCount,
        sharpe: r.sharpe,
        maxDD: r.maxDrawdownPct,
      })),
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-hold25-universe-expansion');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'universe,trades,sharpe,maxDD,PF,winRate,cagr,t2024,t2025,t2026,allYears,sharpeOk,maxDdOk,trades100,meet1234',
      ...ranked.map((r) =>
        [
          r.labelJa,
          r.tradeCount,
          r.sharpe ?? '',
          r.maxDrawdownPct ?? '',
          r.profitFactor ?? '',
          r.winRate ?? '',
          r.cagrPct ?? '',
          r.tradesByYear['2024'],
          r.tradesByYear['2025'],
          r.tradesByYear['2026'],
          r.firesAllYears,
          r.checks.sharpeOk,
          r.checks.maxDdOk,
          r.checks.trades100,
          r.checks.meetsAllFour,
        ].join(','),
      ),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'comparison.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== HOLD25 UNIVERSE EXPANSION ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
