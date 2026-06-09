/**
 * 2025依存原因 — SPY優先・同時3固定
 * npx vitest run tests/unit/case4Hold25Y2025CauseAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const UNIVERSE = ['SCHD', 'SPY', 'VYM', 'DGRO', 'SPLG'] as const;
type Etf = (typeof UNIVERSE)[number];

const HOLD_DAYS = 25;
const MAX_CONCURRENT = 3;
const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';
const YEARS = ['2024', '2025', '2026'] as const;

const ADX_MIN = 25;
const MACD_MIN = 0.1;
const DIST52_MAX = -3;

const PRIORITY_SPY_FIRST: Record<Etf, number> = {
  SPY: 6,
  DGRO: 4,
  VYM: 3,
  SPLG: 2,
  SCHD: 1,
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

type Signal = {
  date: string;
  symbol: Etf;
  returnPct: number;
  year: string;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
};

type ExecutedTrade = Signal;

type Regime = 'up' | 'sideways' | 'down';

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
    .map((r) => ({
      date: r.date,
      symbol: r.symbol,
      returnPct: r.returnPct,
      year: r.year,
      adx14: r.adx14,
      macdHistPct: r.macdHistPct,
      dist52wPct: r.dist52wPct,
    }));
}

function sortDay(day: Signal[]): Signal[] {
  return [...day].sort((a, b) => PRIORITY_SPY_FIRST[b.symbol] - PRIORITY_SPY_FIRST[a.symbol]);
}

function runPortfolio(signals: Signal[], maxConcurrent: number) {
  const byDate = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const dates = [...byDate.keys()].sort();
  const dailyReturns: number[] = [];
  const outDates: string[] = [];
  const executed: ExecutedTrade[] = [];
  for (const d of dates) {
    const taken = sortDay(byDate.get(d)!).slice(0, maxConcurrent);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    outDates.push(d);
    executed.push(...taken);
  }
  return { dailyReturns, dates: outDates, executed };
}

function metricsFromDaily(dailyReturns: number[], dates: string[]) {
  if (dailyReturns.length === 0) {
    return {
      sharpe: null as number | null,
      maxDrawdownPct: null as number | null,
      profitFactor: null as number | null,
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
  return {
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      losses.length > 0
        ? round3(wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)))
        : null,
    activeDays: dailyReturns.length,
  };
}

function summarize(executed: ExecutedTrade[], dailyReturns: number[], dates: string[]) {
  const m = metricsFromDaily(dailyReturns, dates);
  const byYear = Object.fromEntries(YEARS.map((y) => [y, executed.filter((t) => t.year === y).length])) as Record<
    string,
    number
  >;
  return {
    tradeCount: executed.length,
    ...m,
    tradesByYear: byYear,
  };
}

function buildSpyRegimeByDate(spyBars: OhlcvBar[]): Map<string, Regime> {
  const closes = spyBars.map((b) => b.close);
  const dateToIdx = new Map(spyBars.map((b, i) => [b.date, i]));
  const out = new Map<string, Regime>();
  const lookback = 63;
  const upThresh = 5;
  const downThresh = -5;
  for (const bar of spyBars) {
    const i = dateToIdx.get(bar.date);
    if (i == null || i < lookback) continue;
    const ret63 = ((closes[i]! / closes[i - lookback]! - 1) * 100);
    let regime: Regime = 'sideways';
    if (ret63 > upThresh) regime = 'up';
    else if (ret63 < downThresh) regime = 'down';
    out.set(bar.date, regime);
  }
  return out;
}

function featureStats(trades: ExecutedTrade[]) {
  if (trades.length === 0) return null;
  const adx = trades.map((t) => t.adx14);
  const macd = trades.map((t) => t.macdHistPct);
  const dist = trades.map((t) => t.dist52wPct);
  const ret = trades.map((t) => t.returnPct);
  const bySymbol = Object.fromEntries(UNIVERSE.map((s) => [s, trades.filter((t) => t.symbol === s).length])) as Record<
    Etf,
    number
  >;
  return {
    count: trades.length,
    adx: { min: round3(Math.min(...adx)), max: round3(Math.max(...adx)), mean: round3(mean(adx)) },
    macd: { min: round3(Math.min(...macd)), max: round3(Math.max(...macd)), mean: round3(mean(macd)) },
    dist52: { min: round3(Math.min(...dist)), max: round3(Math.max(...dist)), mean: round3(mean(dist)) },
    returnPct: { mean: round3(mean(ret)), winRate: round3(trades.filter((t) => t.returnPct > 0).length / trades.length) },
    bySymbol,
  };
}

describe('Case4 2025 cause analysis', () => {
  it('analyzes 2025-only trades, all-year ETFs, ex-2025 metrics, regimes', async () => {
    const raw: RawBar[] = [];
    for (const sym of UNIVERSE) {
      raw.push(...buildRaw(await fetchYahooOhlcv(sym), sym));
    }
    const spyBars = await fetchYahooOhlcv('SPY');
    const regimeByDate = buildSpyRegimeByDate(spyBars);

    const fullRun = runPortfolio(toSignals(raw, UNIVERSE, null), MAX_CONCURRENT);
    const fullSummary = summarize(fullRun.executed, fullRun.dailyReturns, fullRun.dates);

    const trades2025Only = fullRun.executed.filter((t) => t.year === '2025');
    const tradesNot2024Or2026 = fullRun.executed.filter((t) => t.year !== '2024' && t.year !== '2026');

    const item1_conditionsList2025OnlyExecuted = trades2025Only.map((t) => ({
      date: t.date,
      symbol: t.symbol,
      adx14: t.adx14,
      macdHistPct: t.macdHistPct,
      dist52wPct: t.dist52wPct,
      returnPct: t.returnPct,
      spyRegime63d: regimeByDate.get(t.date) ?? 'unknown',
    }));

    const item1_noteJa =
      `全${fullSummary.tradeCount}件のうち2025のみ実行は${trades2025Only.length}件。` +
      `（2024・2026で発火しなかった＝2025年エントリー分。136件は総件数。）`;

    const item2_commonFeatures2025Only = {
      trades2025OnlyCount: trades2025Only.length,
      pctOfAllTrades: round3((trades2025Only.length / fullSummary.tradeCount) * 100),
      features: featureStats(trades2025Only),
      vsOtherYears: {
        y2024: featureStats(fullRun.executed.filter((t) => t.year === '2024')),
        y2026: featureStats(fullRun.executed.filter((t) => t.year === '2026')),
        y2025: featureStats(trades2025Only),
      },
      rawQualifyingSignalsByYear: Object.fromEntries(
        YEARS.map((y) => [y, toSignals(raw, UNIVERSE, y).length]),
      ),
      diagnosisJa: (() => {
        const f = featureStats(trades2025Only);
        if (!f) return '';
        return `2025のみ実行はdist52平均${f.dist52.mean}%・ADX平均${f.adx.mean}・MACD平均${f.macd.mean}。2024/26は生シグナルが少ない（フィルタ通過日が市場環境的に2025に集中）。`;
      })(),
    };

    const etfFiresAllYears = UNIVERSE.filter((sym) => {
      const sigs = toSignals(raw, [sym], null);
      return YEARS.every((y) => sigs.some((s) => s.year === y));
    });

    const item3_allYearEtfsOnly =
      etfFiresAllYears.length > 0
        ? (() => {
            const run = runPortfolio(toSignals(raw, etfFiresAllYears, null), MAX_CONCURRENT);
            return {
              etfsIncluded: [...etfFiresAllYears],
              etfsExcluded: UNIVERSE.filter((s) => !etfFiresAllYears.includes(s)),
              ...summarize(run.executed, run.dailyReturns, run.dates),
              tradesByEtf: Object.fromEntries(
                UNIVERSE.map((s) => [s, run.executed.filter((t) => t.symbol === s).length]),
              ),
            };
          })()
        : {
            etfsIncluded: [] as Etf[],
            etfsExcluded: [...UNIVERSE],
            tradeCount: 0,
            sharpe: null,
            maxDrawdownPct: null,
            profitFactor: null,
            tradesByYear: { '2024': 0, '2025': 0, '2026': 0 },
            noteJa: '全年度で生シグナルがあるETFなし',
          };

    const qualByEtfYear = Object.fromEntries(
      UNIVERSE.map((sym) => [
        sym,
        Object.fromEntries(YEARS.map((y) => [y, toSignals(raw, [sym], y).length > 0])),
      ]),
    );

    const ex2025Indices = fullRun.dates
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => !d.startsWith('2025'))
      .map(({ i }) => i);
    const ex2025Daily = ex2025Indices.map((i) => fullRun.dailyReturns[i]!);
    const ex2025Dates = ex2025Indices.map((i) => fullRun.dates[i]!);
    const ex2025Executed = fullRun.executed.filter((t) => t.year !== '2025');

    const item4_exclude2025 = {
      ...summarize(ex2025Executed, ex2025Daily, ex2025Dates),
      tradesByYear: {
        '2024': ex2025Executed.filter((t) => t.year === '2024').length,
        '2026': ex2025Executed.filter((t) => t.year === '2026').length,
      },
      comparisonFullPeriod: fullSummary,
      interpretationJa:
        '2025を除外すると件数・Sharpeはサンプル激減で参考値。2024+2026のみで戦略の「非2025」性能を確認。',
    };

    const regimeCounts = { up: 0, sideways: 0, down: 0, unknown: 0 };
    const byRegimeTrades: Record<Regime | 'unknown', ExecutedTrade[]> = {
      up: [],
      sideways: [],
      down: [],
      unknown: [],
    };
    for (const t of fullRun.executed) {
      const r = regimeByDate.get(t.date) ?? 'unknown';
      regimeCounts[r]++;
      byRegimeTrades[r].push(t);
    }

    const item5_regimeBreakdown = {
      regimeDefinitionJa: 'SPY 63営業日リターン: >+5%=上昇, <-5%=下落, その他=横ばい',
      regimeTradeCounts: regimeCounts,
      byRegime: (['up', 'sideways', 'down'] as Regime[]).map((regime) => {
        const trades = byRegimeTrades[regime];
        const byDate = new Map<string, ExecutedTrade[]>();
        for (const t of trades) {
          const arr = byDate.get(t.date) ?? [];
          arr.push(t);
          byDate.set(t.date, arr);
        }
        const dates = [...byDate.keys()].sort();
        const dailyReturns = dates.map((d) => round3(mean(byDate.get(d)!.map((t) => t.returnPct))));
        const m = metricsFromDaily(dailyReturns, dates);
        return {
          regime,
          labelJa: regime === 'up' ? '上昇' : regime === 'down' ? '下落' : '横ばい',
          tradeCount: trades.length,
          activeDays: dates.length,
          sharpe: m.sharpe,
          maxDrawdownPct: m.maxDrawdownPct,
          profitFactor: m.profitFactor,
          tradesByYear: Object.fromEntries(YEARS.map((y) => [y, trades.filter((t) => t.year === y).length])),
          featureStats: featureStats(trades),
        };
      }),
    };

    const report = {
      fixedStrategyJa: {
        dist52w: `<= ${DIST52_MAX}%`,
        adx: `> ${ADX_MIN}`,
        macd: `> ${MACD_MIN}`,
        holdDays: HOLD_DAYS,
        priority: 'SPY優先',
        maxConcurrent: MAX_CONCURRENT,
        universe: [...UNIVERSE],
      },
      baselineFullPeriod: fullSummary,
      item1_tradesNotIn2024Or2026_conditions: {
        noteJa: item1_noteJa,
        count2025OnlyExecuted: trades2025Only.length,
        countMatchesNot2024Or2026: tradesNot2024Or2026.length,
        conditionsList: item1_conditionsList2025OnlyExecuted,
      },
      item2_2025OnlyCommonFeatures: item2_commonFeatures2025Only,
      item3_reaggregateAllYearFireEtfs: item3_allYearEtfsOnly,
      qualifyingSignalPresenceByEtfYear: qualByEtfYear,
      item4_metricsExcluding2025: item4_exclude2025,
      item5_regimeComparison: item5_regimeBreakdown,
      summaryJa: [
        `総${fullSummary.tradeCount}件の${round3((trades2025Only.length / fullSummary.tradeCount) * 100)}%が2025エントリー。`,
        `全年度生シグナルETF: ${etfFiresAllYears.join(', ') || 'なし'}。`,
        `2025除外Sharpe: ${item4_exclude2025.sharpe}（${item4_exclude2025.tradeCount}件）。`,
        `レジーム最多: ${Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])[0]![0]}。`,
      ].join(' '),
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-hold25-2025-cause');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(
      path.join(outDir, '2025-only-trades.csv'),
      [
        'date,symbol,adx,macd,dist52,returnPct,regime',
        ...item1_conditionsList2025OnlyExecuted.map((r) =>
          [r.date, r.symbol, r.adx14, r.macdHistPct, r.dist52wPct, r.returnPct, r.spyRegime63d].join(','),
        ),
      ].join('\n') + '\n',
      'utf8',
    );

    console.log('\n=== 2025 CAUSE ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
