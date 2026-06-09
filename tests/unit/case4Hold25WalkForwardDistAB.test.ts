/**
 * Walk-forward — dist candidates A vs B
 * npx vitest run tests/unit/case4Hold25WalkForwardDistAB.test.ts
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

const ADX_MIN = 25;
const MACD_MIN = 0.1;
const DIST_GRID = [-2, -3, -4, -5, -6, -7, -8] as const;

const CANDIDATES = {
  A: { label: 'A', distByYear: { '2024': -2, '2025': -8, '2026': -2 } },
  B: { label: 'B', distByYear: { '2024': -2, '2025': -7, '2026': -2 } },
} as const;

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
};

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

function baseSignals(raw: RawBar[]): Signal[] {
  return raw
    .filter((r) => r.adx14 > ADX_MIN && r.macdHistPct > MACD_MIN)
    .map((r) => ({
      date: r.date,
      symbol: r.symbol,
      returnPct: r.returnPct,
      year: r.year,
    }));
}

function filterPerYearFromRaw(allBase: Array<Signal & { dist52wPct: number }>, distByYear: Record<string, number>) {
  return allBase.filter((s) => s.dist52wPct <= (distByYear[s.year] ?? -999));
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
  const executed: Signal[] = [];
  for (const d of dates) {
    const taken = [...byDate.get(d)!]
      .sort((a, b) => PRIORITY_SPY_FIRST[b.symbol] - PRIORITY_SPY_FIRST[a.symbol])
      .slice(0, MAX_CONCURRENT);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    outDates.push(d);
    executed.push(...taken);
  }
  return { dailyReturns, dates: outDates, executed };
}

function metricsSubset(
  dailyReturns: number[],
  dates: string[],
  executed: Signal[],
  yearFilter: (y: string) => boolean,
) {
  const idxs = dates.map((d, i) => (yearFilter(d.slice(0, 4)) ? i : -1)).filter((i) => i >= 0);
  const dr = idxs.map((i) => dailyReturns[i]!);
  const dt = idxs.map((i) => dates[i]!);
  const trades = executed.filter((t) => yearFilter(t.year));

  if (dr.length === 0) {
    return {
      tradeCount: trades.length,
      sharpe: null as number | null,
      maxDrawdownPct: null as number | null,
      profitFactor: null as number | null,
      winRate: trades.length > 0 ? round3(trades.filter((t) => t.returnPct > 0).length / trades.length) : null,
      activeDays: 0,
    };
  }
  const wins = dr.filter((r) => r > 0);
  const losses = dr.filter((r) => r < 0);
  const mu = mean(dr);
  const sigma = std(dr);
  let equity = INITIAL_CAPITAL_USD;
  let peak = INITIAL_CAPITAL_USD;
  let maxDd = 0;
  for (const r of dr) {
    equity += (INITIAL_CAPITAL_USD * r) / 100;
    if (equity > peak) peak = equity;
    maxDd = Math.min(maxDd, equity / peak - 1);
  }
  return {
    tradeCount: trades.length,
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      losses.length > 0
        ? round3(wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)))
        : null,
    winRate: trades.length > 0 ? round3(trades.filter((t) => t.returnPct > 0).length / trades.length) : null,
    activeDays: dr.length,
  };
}

function metricsFixedDistYear(allBase: Array<Signal & { dist52wPct: number }>, distMax: number, year: string) {
  const sigs = allBase.filter((s) => s.year === year && s.dist52wPct <= distMax);
  const run = runPortfolio(sigs);
  const m = metricsSubset(run.dailyReturns, run.dates, run.executed, (y) => y === year);
  return m;
}

function pickBestDistOnTrainYear(allBase: Array<Signal & { dist52wPct: number }>, trainYear: string) {
  const ranked = DIST_GRID.map((distMax) => ({
    distMax,
    ...metricsFixedDistYear(allBase, distMax, trainYear),
  })).sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));
  return ranked[0]!;
}

describe('Case4 walk-forward dist A vs B', () => {
  it('writes fold1 2024->2025 and fold2 2024-25->2026 with train-only dist pick', async () => {
    const raw: RawBar[] = [];
    for (const sym of UNIVERSE) {
      raw.push(...buildRaw(await fetchYahooOhlcv(sym), sym));
    }
    const allBase = baseSignals(raw).map((s) => {
      const r = raw.find((x) => x.date === s.date && x.symbol === s.symbol)!;
      return { ...s, dist52wPct: r.dist52wPct };
    });

    type CandKey = keyof typeof CANDIDATES;
    const runs = Object.fromEntries(
      (Object.keys(CANDIDATES) as CandKey[]).map((key) => {
        const cfg = CANDIDATES[key];
        const sigs = filterPerYearFromRaw(allBase, cfg.distByYear);
        const run = runPortfolio(sigs);
        return [key, { cfg, run }] as const;
      }),
    ) as Record<CandKey, { cfg: (typeof CANDIDATES)[CandKey]; run: ReturnType<typeof runPortfolio> }>;

    const fold1 = (Object.keys(CANDIDATES) as CandKey[]).map((key) => {
      const { cfg, run } = runs[key]!;
      const train = metricsSubset(run.dailyReturns, run.dates, run.executed, (y) => y === '2024');
      const validate = metricsSubset(run.dailyReturns, run.dates, run.executed, (y) => y === '2025');
      return {
        candidate: key,
        distRule: cfg.distByYear,
        train2024: train,
        validate2025: validate,
        sharpeDecay: train.sharpe != null && validate.sharpe != null ? round3(validate.sharpe - train.sharpe) : null,
      };
    });

    const fold2 = (Object.keys(CANDIDATES) as CandKey[]).map((key) => {
      const { cfg, run } = runs[key]!;
      const train = metricsSubset(run.dailyReturns, run.dates, run.executed, (y) => y === '2024' || y === '2025');
      const validate = metricsSubset(run.dailyReturns, run.dates, run.executed, (y) => y === '2026');
      return {
        candidate: key,
        distRule: cfg.distByYear,
        train2024_2025: train,
        validate2026: validate,
        sharpeDecay:
          train.sharpe != null && validate.sharpe != null ? round3(validate.sharpe - train.sharpe) : null,
      };
    });

    const fullPeriod = (Object.keys(CANDIDATES) as CandKey[]).map((key) => {
      const { cfg, run } = runs[key]!;
      const train = metricsSubset(run.dailyReturns, run.dates, run.executed, () => true);
      return { candidate: key, distRule: cfg.distByYear, fullSample: train };
    });

    const train2024DistPick = pickBestDistOnTrainYear(allBase, '2024');
    const oos2025WithTrainPick = metricsFixedDistYear(allBase, train2024DistPick.distMax, '2025');
    const oos2025A = metricsFixedDistYear(allBase, -8, '2025');
    const oos2025B = metricsFixedDistYear(allBase, -7, '2025');

    const train2425Ranked = DIST_GRID.map((d) => {
      const sigs = allBase.filter((s) => (s.year === '2024' || s.year === '2025') && s.dist52wPct <= d);
      const run = runPortfolio(sigs);
      return {
        distMax: d,
        ...metricsSubset(run.dailyReturns, run.dates, run.executed, (y) => y === '2024' || y === '2025'),
      };
    }).sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));

    const oos2026TrainPick = metricsFixedDistYear(allBase, train2425Ranked[0]!.distMax, '2026');
    const oos2026A = fold2.find((f) => f.candidate === 'A')!.validate2026;
    const oos2026B = fold2.find((f) => f.candidate === 'B')!.validate2026;

    const report = {
      fixedStrategyJa: {
        universe: [...UNIVERSE],
        priority: 'SPY優先',
        maxConcurrent: MAX_CONCURRENT,
        holdDays: HOLD_DAYS,
        adx: `> ${ADX_MIN}`,
        macd: `> ${MACD_MIN}`,
      },
      candidates: CANDIDATES,
      walkForwardJa: '学習期間の指標はエントリー年で切り出し。検証期間は未来年のみ（ルックアヘッドなし）。',
      fold1_train2024_validate2025: fold1,
      fold2_train2024_2025_validate2026: fold2,
      fullPeriodInSample: fullPeriod,
      overfitCheck_fold1: {
        descriptionJa: '2024のみでdistを1つ選び（Sharpe最大）、2025 OOSとA/Bの2025専用distを比較',
        distPickedOn2024Only: train2024DistPick.distMax,
        train2024MetricsAtPick: train2024DistPick,
        oos2025_singleDistFrom2024Pick: oos2025WithTrainPick,
        oos2025_candidateA_dist8: oos2025A,
        oos2025_candidateB_dist7: oos2025B,
      },
      overfitCheck_fold2: {
        descriptionJa: '2024-25で単一distを選び、2026 OOSとA/B（2026=-2%）を比較',
        distPickedOn2024_2025: train2425Ranked[0]!.distMax,
        train2024_2025_top3: train2425Ranked.slice(0, 3),
        oos2026_singleDistFromTrain: oos2026TrainPick,
        oos2026_candidateA: oos2026A,
        oos2026_candidateB: oos2026B,
      },
      verdictJa: (() => {
        const a25 = fold1.find((f) => f.candidate === 'A')!.validate2025;
        const b25 = fold1.find((f) => f.candidate === 'B')!.validate2025;
        const a26 = fold2.find((f) => f.candidate === 'A')!.validate2026;
        const b26 = fold2.find((f) => f.candidate === 'B')!.validate2026;
        const parts: string[] = [];
        if ((a25.sharpe ?? 0) > 0.8 && (b25.sharpe ?? 0) > 0.8) parts.push('Fold1: A/Bとも2025 OOSでSharpe>0.8');
        else parts.push('Fold1: 2025 OOSでSharpe弱い — 2025 distの過剰最適化疑い');
        if ((a26.sharpe ?? -1) >= 0 && (b26.tradeCount ?? 0) >= 10) parts.push('Fold2: 2026 OOSは件数あり');
        if (train2024DistPick.distMax !== -8 && train2024DistPick.distMax !== -7)
          parts.push(`2024単独で選ぶdistは${train2024DistPick.distMax}%（A/Bの2025=-7/-8とは不一致）`);
        return parts.join('。');
      })(),
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-hold25-walkforward-ab');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'fold,candidate,phase,trades,sharpe,maxDD,PF,winRate',
      ...fold1.flatMap((f) => [
        ['1', f.candidate, 'train2024', f.train2024.tradeCount, f.train2024.sharpe ?? '', f.train2024.maxDrawdownPct ?? '', f.train2024.profitFactor ?? '', f.train2024.winRate ?? ''].join(','),
        ['1', f.candidate, 'val2025', f.validate2025.tradeCount, f.validate2025.sharpe ?? '', f.validate2025.maxDrawdownPct ?? '', f.validate2025.profitFactor ?? '', f.validate2025.winRate ?? ''].join(','),
      ]),
      ...fold2.flatMap((f) => [
        ['2', f.candidate, 'train2024_25', f.train2024_2025.tradeCount, f.train2024_2025.sharpe ?? '', f.train2024_2025.maxDrawdownPct ?? '', f.train2024_2025.profitFactor ?? '', f.train2024_2025.winRate ?? ''].join(','),
        ['2', f.candidate, 'val2026', f.validate2026.tradeCount, f.validate2026.sharpe ?? '', f.validate2026.maxDrawdownPct ?? '', f.validate2026.profitFactor ?? '', f.validate2026.winRate ?? ''].join(','),
      ]),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'walkforward.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== WALK-FORWARD AB ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
