/**
 * 5ETF priority rules — SCHD / SPY / Sharpe + max concurrent 2–4
 * npx vitest run tests/unit/case4Hold25PriorityRulesAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const UNIVERSE = ['SCHD', 'SPY', 'VYM', 'DGRO', 'SPLG'] as const;
type Etf = (typeof UNIVERSE)[number];

const HOLD_DAYS = 25;
const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';
const YEARS = ['2024', '2025', '2026'] as const;

const ADX_MIN = 25;
const MACD_MIN = 0.1;
const DIST52_MAX = -3;

type PriorityRuleId = 'schd_first' | 'spy_first' | 'sharpe_first';

const PRIORITY_SCHD_FIRST: Record<Etf, number> = {
  SCHD: 6,
  DGRO: 4,
  VYM: 3,
  SPLG: 2,
  SPY: 1,
};

const PRIORITY_SPY_FIRST: Record<Etf, number> = {
  SPY: 6,
  SCHD: 1,
  DGRO: 4,
  VYM: 3,
  SPLG: 2,
};

/** 単体フル期間Sharpe順（事前計算・静的）VYM>DGRO>SPLG>SPY>SCHD */
const PRIORITY_SHARPE_FIRST: Record<Etf, number> = {
  VYM: 6,
  DGRO: 5,
  SPLG: 4,
  SPY: 3,
  SCHD: 2,
};

const RULES: Array<{ id: PriorityRuleId; labelJa: string; rank: Record<Etf, number> }> = [
  { id: 'schd_first', labelJa: 'SCHD優先（現行）', rank: PRIORITY_SCHD_FIRST },
  { id: 'spy_first', labelJa: 'SPY優先', rank: PRIORITY_SPY_FIRST },
  { id: 'sharpe_first', labelJa: 'Sharpe優先（単体Sharpe静的順）', rank: PRIORITY_SHARPE_FIRST },
];

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
type ExecutedTrade = Signal;

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

function toSignals(raw: RawBar[], yearFilter: string | null): Signal[] {
  return raw
    .filter(
      (r) =>
        r.adx14 > ADX_MIN &&
        r.macdHistPct > MACD_MIN &&
        r.dist52wPct <= DIST52_MAX &&
        (yearFilter == null || r.year === yearFilter),
    )
    .map((r) => ({ date: r.date, symbol: r.symbol, returnPct: r.returnPct, year: r.year }));
}

function sortDay(day: Signal[], rank: Record<Etf, number>): Signal[] {
  return [...day].sort((a, b) => rank[b.symbol] - rank[a.symbol]);
}

function runPortfolio(
  signals: Signal[],
  rank: Record<Etf, number>,
  maxConcurrent: number,
): { dailyReturns: number[]; dates: string[]; executed: ExecutedTrade[] } {
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
    const taken = sortDay(byDate.get(d)!, rank).slice(0, maxConcurrent);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    outDates.push(d);
    executed.push(...taken);
  }
  return { dailyReturns, dates: outDates, executed };
}

function metricsFromDaily(dailyReturns: number[], dates: string[]) {
  if (dailyReturns.length === 0) {
    return { sharpe: null as number | null, maxDrawdownPct: null as number | null, profitFactor: null as number | null };
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
  };
}

function summarizeRun(executed: ExecutedTrade[], dailyReturns: number[], dates: string[]) {
  const m = metricsFromDaily(dailyReturns, dates);
  const byYear = Object.fromEntries(YEARS.map((y) => [y, executed.filter((t) => t.year === y).length])) as Record<
    string,
    number
  >;
  const byEtf = Object.fromEntries(UNIVERSE.map((s) => [s, executed.filter((t) => t.symbol === s).length])) as Record<
    Etf,
    number
  >;
  return {
    tradeCount: executed.length,
    ...m,
    tradesByYear: byYear,
    tradesByEtf: byEtf,
  };
}

function analyzeCoFire(signals: Signal[], rank: Record<Etf, number>, maxConcurrent: number) {
  const byDate = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const multiDays = [...byDate.entries()].filter(([, arr]) => arr.length >= 2);
  const adoptionOrder = [...UNIVERSE].sort((a, b) => rank[b] - rank[a]);

  let spyCoFireDays = 0;
  let spyTakenOnCoFire = 0;
  let spyDroppedOnCoFire = 0;
  const droppedWhenCoFire = Object.fromEntries(UNIVERSE.map((s) => [s, 0])) as Record<Etf, number>;
  const takenWhenCoFire = Object.fromEntries(UNIVERSE.map((s) => [s, 0])) as Record<Etf, number>;

  for (const [, day] of multiDays) {
    const sorted = sortDay(day, rank);
    const taken = new Set(sorted.slice(0, maxConcurrent).map((s) => s.symbol));
    const dropped = sorted.slice(maxConcurrent);
    for (const t of sorted.slice(0, maxConcurrent)) takenWhenCoFire[t.symbol]++;
    for (const d of dropped) droppedWhenCoFire[d.symbol]++;
    if (day.some((s) => s.symbol === 'SPY')) {
      spyCoFireDays++;
      if (taken.has('SPY')) spyTakenOnCoFire++;
      else spyDroppedOnCoFire++;
    }
  }

  return {
    adoptionOrderHighToLow: adoptionOrder,
    multiFireDays: multiDays.length,
    maxConcurrent,
    takenWhenCoFire,
    droppedWhenCoFire,
    spyAnalysis: {
      rawSignalDays: [...byDate.values()].filter((d) => d.some((s) => s.symbol === 'SPY')).length,
      coFireDaysWithSpy: spyCoFireDays,
      takenOnCoFire: spyTakenOnCoFire,
      droppedOnCoFire: spyDroppedOnCoFire,
      pctDroppedWhenCoFire: spyCoFireDays > 0 ? round3((spyDroppedOnCoFire / spyCoFireDays) * 100) : null,
    },
  };
}

function standaloneSharpe(raw: RawBar[], sym: Etf): number | null {
  const sigs = toSignals(raw.filter((r) => r.symbol === sym), null);
  const run = runPortfolio(sigs, { [sym]: 1 } as Record<Etf, number>, 1);
  return metricsFromDaily(run.dailyReturns, run.dates).sharpe;
}

describe('Case4 hold25 priority rules analysis', () => {
  it('compares SCHD/SPY/Sharpe priority and max concurrent 2-4', async () => {
    const raw: RawBar[] = [];
    for (const sym of UNIVERSE) {
      raw.push(...buildRaw(await fetchYahooOhlcv(sym), sym));
    }
    const allSignals = toSignals(raw, null);

    const standaloneSharpeByEtf = Object.fromEntries(
      UNIVERSE.map((s) => [s, standaloneSharpe(raw, s)]),
    ) as Record<Etf, number | null>;

    const item1_coFireByRule = Object.fromEntries(
      RULES.map((rule) => [
        rule.id,
        {
          labelJa: rule.labelJa,
          rankScores: rule.rank,
          ...analyzeCoFire(allSignals, rule.rank, 2),
        },
      ]),
    );

    const item2_priorityComparison = RULES.map((rule) => {
      const run = runPortfolio(allSignals, rule.rank, 2);
      return {
        ruleId: rule.id,
        labelJa: rule.labelJa,
        maxConcurrent: 2,
        ...summarizeRun(run.executed, run.dailyReturns, run.dates),
      };
    });

    const schdRun = runPortfolio(allSignals, PRIORITY_SCHD_FIRST, 2);
    const rawSpySignals = allSignals.filter((s) => s.symbol === 'SPY').length;
    const item3_spyLowExecutionReason = {
      executedSpyTrades: schdRun.executed.filter((t) => t.symbol === 'SPY').length,
      rawSpyQualifyingSignals: rawSpySignals,
      executionRatePct: round3((schdRun.executed.filter((t) => t.symbol === 'SPY').length / rawSpySignals) * 100),
      coFire: item1_coFireByRule.schd_first!.spyAnalysis,
      explanationJa: [
        `SPYは生シグナル${rawSpySignals}件に対し実行${schdRun.executed.filter((t) => t.symbol === 'SPY').length}件（採用率${round3((schdRun.executed.filter((t) => t.symbol === 'SPY').length / rawSpySignals) * 100)}%）。`,
        `優先順位でSPYは最低（score=1）のため、同日にSCHD/DGRO/VYM/SPLGが並ぶと同時2枠から脱落。`,
        `SCHD優先時: SPYが同時発火した${item1_coFireByRule.schd_first!.spyAnalysis.coFireDaysWithSpy}日のうち${item1_coFireByRule.schd_first!.spyAnalysis.droppedOnCoFire}日で不採用（${item1_coFireByRule.schd_first!.spyAnalysis.pctDroppedWhenCoFire}%）。`,
      ].join(' '),
    };

    const item4_spyAdoptionScenarios = [
      ...RULES.filter((r) => r.id === 'schd_first' || r.id === 'spy_first').map((rule) => {
        const run = runPortfolio(allSignals, rule.rank, 2);
        return {
          scenario: rule.labelJa,
          ...summarizeRun(run.executed, run.dailyReturns, run.dates),
          deltaVsSchdFirst: null as Record<string, number | null> | null,
        };
      }),
      ...[2, 3, 4].map((mc) => {
        const run = runPortfolio(allSignals, PRIORITY_SPY_FIRST, mc);
        return {
          scenario: `SPY優先 + 同時${mc}`,
          ...summarizeRun(run.executed, run.dailyReturns, run.dates),
          deltaVsSchdFirst: null,
        };
      }),
    ];

    const schdBase = item2_priorityComparison.find((x) => x.ruleId === 'schd_first')!;
    for (const row of item4_spyAdoptionScenarios) {
      row.deltaVsSchdFirst = {
        tradeCount: row.tradeCount - schdBase.tradeCount,
        sharpe: row.sharpe != null && schdBase.sharpe != null ? round3(row.sharpe - schdBase.sharpe) : null,
        maxDrawdownPct:
          row.maxDrawdownPct != null && schdBase.maxDrawdownPct != null
            ? round2(row.maxDrawdownPct - schdBase.maxDrawdownPct)
            : null,
      };
    }

    const item5_maxConcurrentGrid = [2, 3, 4].flatMap((mc) =>
      RULES.map((rule) => {
        const run = runPortfolio(allSignals, rule.rank, mc);
        return {
          priorityRule: rule.id,
          labelJa: rule.labelJa,
          maxConcurrent: mc,
          ...summarizeRun(run.executed, run.dailyReturns, run.dates),
        };
      }),
    );

    const recommendationJa = (() => {
      const bestSharpe = [...item2_priorityComparison].sort((a, b) => (b.sharpe ?? -1) - (a.sharpe ?? -1))[0]!;
      const spyFirst = item2_priorityComparison.find((x) => x.ruleId === 'spy_first')!;
      const mc3schd = item5_maxConcurrentGrid.find((x) => x.priorityRule === 'schd_first' && x.maxConcurrent === 3)!;
      return [
        `現行SCHD優先: ${schdBase.tradeCount}件 SPY${schdBase.tradesByEtf.SPY}件 Sharpe${schdBase.sharpe} MaxDD${schdBase.maxDrawdownPct}%。`,
        `SPY優先: ${spyFirst.tradeCount}件 SPY${spyFirst.tradesByEtf.SPY}件 Sharpe${spyFirst.sharpe} MaxDD${spyFirst.maxDrawdownPct}%（SPY+${spyFirst.tradesByEtf.SPY - schdBase.tradesByEtf.SPY}件）。`,
        `Sharpe優先: ${item2_priorityComparison.find((x) => x.ruleId === 'sharpe_first')!.tradeCount}件 Sharpe${item2_priorityComparison.find((x) => x.ruleId === 'sharpe_first')!.sharpe}。`,
        `同時3（SCHD優先）: ${mc3schd.tradeCount}件 Sharpe${mc3schd.sharpe} — 件数増の代替手段。`,
        `2枠比較でSharpe最高: ${bestSharpe.labelJa}（${bestSharpe.sharpe}）。`,
      ].join(' ');
    })();

    const report = {
      strategyJa: {
        universe: [...UNIVERSE],
        dist52w: `<= ${DIST52_MAX}%`,
        adx: `> ${ADX_MIN}`,
        macd: `> ${MACD_MIN}`,
        holdDays: HOLD_DAYS,
      },
      standaloneSharpeByEtfUsedForSharpeRule: standaloneSharpeByEtf,
      item1_sameDayAdoptionOrder: item1_coFireByRule,
      item2_threePriorityRules_max2: item2_priorityComparison,
      item3_whySpyOnly7: item3_spyLowExecutionReason,
      item4_increaseSpyAdoption: item4_spyAdoptionScenarios,
      item5_maxConcurrent2to4: item5_maxConcurrentGrid,
      recommendationJa,
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-hold25-priority-rules');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'section,priority,maxC,trades,sharpe,maxDD,PF,t24,t25,t26,SCHD,SPY,VYM,DGRO,SPLG',
      ...item2_priorityComparison.map((r) =>
        [
          'priority',
          r.ruleId,
          2,
          r.tradeCount,
          r.sharpe ?? '',
          r.maxDrawdownPct ?? '',
          r.profitFactor ?? '',
          r.tradesByYear['2024'],
          r.tradesByYear['2025'],
          r.tradesByYear['2026'],
          ...UNIVERSE.map((s) => r.tradesByEtf[s]),
        ].join(','),
      ),
      ...item5_maxConcurrentGrid.map((r) =>
        [
          'maxC',
          r.priorityRule,
          r.maxConcurrent,
          r.tradeCount,
          r.sharpe ?? '',
          r.maxDrawdownPct ?? '',
          r.profitFactor ?? '',
          r.tradesByYear['2024'],
          r.tradesByYear['2025'],
          r.tradesByYear['2026'],
          ...UNIVERSE.map((s) => r.tradesByEtf[s]),
        ].join(','),
      ),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'comparison.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== PRIORITY RULES ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
