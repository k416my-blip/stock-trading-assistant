/**
 * Final fixed rule — per-ETF contribution & leave-one-out analysis
 * npx vitest run tests/unit/case4Hold25FinalEtfContributionAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const UNIVERSE = ['SCHD', 'SPY', 'VYM', 'DGRO', 'SPLG'] as const;
type Etf = (typeof UNIVERSE)[number];

const MAX_CONCURRENT = 3;
const HOLD_DAYS = 25;
const TAKE_PROFIT_PCT = 3;
const INITIAL_CAPITAL_USD = 10_000;
const SIGNAL_START = '2024-01-01';

const ADX_MIN = 25;
const MACD_MIN = 0.1;
const SHALLOW_ADX_MIN = 30;
const SHALLOW_MACD_MIN = 0.15;

const REGIME_UP_THRESH = 5;
const REGIME_DOWN_THRESH = -5;
const SIDEWAYS_DEEP_DIST = -5;

const PRIORITY_SPY_FIRST: Record<Etf, number> = {
  SPY: 6,
  DGRO: 4,
  VYM: 3,
  SPLG: 2,
  SCHD: 1,
};

type Regime = 'up' | 'sideways' | 'down';
type FourBucket = 'up' | 'sideways_shallow' | 'sideways_deep' | 'down' | 'unknown';

type OhlcvBar = { date: string; high: number; low: number; close: number };

type SignalCandidate = {
  date: string;
  year: string;
  symbol: Etf;
  signalIdx: number;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
  bucket: FourBucket;
};

type Signal = {
  date: string;
  symbol: Etf;
  returnPct: number;
  year: string;
};

type Metrics = {
  tradeCount: number;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  profitFactor: number | null;
  winRate: number | null;
  avgProfitPct: number | null;
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

function combos<T>(arr: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...tail] = arr;
  return [...combos(tail, k - 1).map((c) => [head!, ...c]), ...combos(tail, k)];
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

function buildSpyRegimeMap(spyBars: OhlcvBar[]): Map<string, Regime> {
  const closes = spyBars.map((b) => b.close);
  const lookback = 63;
  const out = new Map<string, Regime>();
  for (let i = lookback; i < spyBars.length; i++) {
    const ret63 = (closes[i]! / closes[i - lookback]! - 1) * 100;
    let regime: Regime = 'sideways';
    if (ret63 > REGIME_UP_THRESH) regime = 'up';
    else if (ret63 < REGIME_DOWN_THRESH) regime = 'down';
    out.set(spyBars[i]!.date, regime);
  }
  return out;
}

function classifyBucket(regime: Regime | 'unknown', dist52: number): FourBucket {
  if (regime === 'unknown') return 'unknown';
  if (regime === 'up') return 'up';
  if (regime === 'down') return 'down';
  return dist52 <= SIDEWAYS_DEEP_DIST ? 'sideways_deep' : 'sideways_shallow';
}

function passesFinalRule(s: { bucket: FourBucket; dist52wPct: number; adx14: number; macdHistPct: number }): boolean {
  if (s.bucket === 'unknown') return false;
  if (s.bucket === 'down' || s.bucket === 'sideways_deep') return s.dist52wPct <= -8;
  if (s.bucket === 'sideways_shallow') {
    return s.dist52wPct <= -2 && s.dist52wPct > SIDEWAYS_DEEP_DIST && s.adx14 > SHALLOW_ADX_MIN && s.macdHistPct > SHALLOW_MACD_MIN;
  }
  return s.dist52wPct <= -2;
}

function buildCandidates(bars: OhlcvBar[], symbol: Etf, regimeMap: Map<string, Regime>): SignalCandidate[] {
  const closes = bars.map((b) => b.close);
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1);
    let v = arr[0]!;
    for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
    return v;
  };
  const out: SignalCandidate[] = [];
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
    if (adx <= ADX_MIN || macd <= MACD_MIN) continue;
    const regime = regimeMap.get(date) ?? ('unknown' as const);
    const bucket = classifyBucket(regime, dist52);
    const row = {
      date,
      year: date.slice(0, 4),
      symbol,
      signalIdx: i,
      adx14: round3(adx),
      macdHistPct: round3(macd),
      dist52wPct: round3(dist52),
      bucket,
    };
    if (!passesFinalRule(row)) continue;
    out.push(row);
  }
  return out;
}

function simulateExit(bars: OhlcvBar[], signalIdx: number): number | null {
  const entryIdx = signalIdx + 1;
  const lastIdx = Math.min(signalIdx + HOLD_DAYS, bars.length - 1);
  if (entryIdx >= bars.length || lastIdx <= entryIdx) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;
  const targetPrice = entry * (1 + TAKE_PROFIT_PCT / 100);
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    if (bars[i]!.high >= targetPrice) return round3(TAKE_PROFIT_PCT);
  }
  return round3(((bars[lastIdx]!.close / entry - 1) * 100));
}

function runPortfolio(signals: Signal[]) {
  const byDate = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const dailyReturns: number[] = [];
  const executed: Signal[] = [];
  for (const d of [...byDate.keys()].sort()) {
    const taken = [...byDate.get(d)!]
      .sort((a, b) => PRIORITY_SPY_FIRST[b.symbol] - PRIORITY_SPY_FIRST[a.symbol])
      .slice(0, MAX_CONCURRENT);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    executed.push(...taken);
  }
  return { dailyReturns, executed };
}

function metricsFromDailyReturns(dailyReturns: number[], trades: Signal[]): Metrics {
  if (dailyReturns.length === 0) {
    return {
      tradeCount: 0,
      sharpe: null,
      maxDrawdownPct: null,
      profitFactor: null,
      winRate: null,
      avgProfitPct: null,
    };
  }
  const drWins = dailyReturns.filter((r) => r > 0);
  const drLosses = dailyReturns.filter((r) => r < 0);
  const tradeWins = trades.filter((t) => t.returnPct > 0);
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
    tradeCount: trades.length,
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      drLosses.length > 0
        ? round3(drWins.reduce((a, b) => a + b, 0) / Math.abs(drLosses.reduce((a, b) => a + b, 0)))
        : null,
    winRate: trades.length > 0 ? round3(tradeWins.length / trades.length) : null,
    avgProfitPct: trades.length > 0 ? round3(mean(trades.map((t) => t.returnPct))) : null,
  };
}

function evaluateUniverse(signals: Signal[], allowed: readonly Etf[]): Metrics {
  const set = new Set(allowed);
  const filtered = signals.filter((s) => set.has(s.symbol));
  const run = runPortfolio(filtered);
  return metricsFromDailyReturns(run.dailyReturns, run.executed);
}

function executedShareInFull(fullExecuted: Signal[]): Record<Etf, { count: number; pct: number }> {
  const total = fullExecuted.length;
  const out = {} as Record<Etf, { count: number; pct: number }>;
  for (const etf of UNIVERSE) {
    const count = fullExecuted.filter((t) => t.symbol === etf).length;
    out[etf] = { count, pct: total > 0 ? round3(count / total) : 0 };
  }
  return out;
}

describe('Case4 final rule ETF contribution analysis', () => {
  it('per-ETF solo, leave-one-out, and composition recommendation', async () => {
    const ohlcv = new Map<Etf, OhlcvBar[]>();
    for (const sym of UNIVERSE) {
      ohlcv.set(sym, await fetchYahooOhlcv(sym));
    }
    const regimeMap = buildSpyRegimeMap(ohlcv.get('SPY')!);

    const candidates: SignalCandidate[] = [];
    for (const sym of UNIVERSE) {
      candidates.push(...buildCandidates(ohlcv.get(sym)!, sym, regimeMap));
    }

    const allSignals: Signal[] = [];
    for (const c of candidates) {
      const ret = simulateExit(ohlcv.get(c.symbol)!, c.signalIdx);
      if (ret == null) continue;
      allSignals.push({ date: c.date, symbol: c.symbol, returnPct: ret, year: c.year });
    }

    const baseline5 = evaluateUniverse(allSignals, UNIVERSE);
    const fullRun = runPortfolio(allSignals.filter((s) => UNIVERSE.includes(s.symbol)));
    const shareInFull = executedShareInFull(fullRun.executed);

    const perEtfSolo = UNIVERSE.map((etf) => ({
      etf,
      solo: evaluateUniverse(allSignals, [etf]),
    }));

    const leaveOneOut = UNIVERSE.map((excluded) => {
      const remaining = UNIVERSE.filter((e) => e !== excluded);
      const m = evaluateUniverse(allSignals, remaining);
      const sharpeDelta =
        m.sharpe != null && baseline5.sharpe != null ? round3(m.sharpe - baseline5.sharpe) : null;
      return {
        labelJa: `${excluded}抜き`,
        excluded,
        remaining,
        metrics: m,
        sharpeDeltaVs5etf: sharpeDelta,
        roleJa:
          sharpeDelta != null && sharpeDelta > 0.05
            ? 'ノイズ源（除外でSharpe向上）'
            : sharpeDelta != null && sharpeDelta < -0.05
              ? 'Sharpe貢献（除外で低下）'
              : '中立',
      };
    });

    const combos4 = UNIVERSE.map((excluded) => {
      const symbols = UNIVERSE.filter((e) => e !== excluded);
      return {
        symbols,
        label: symbols.join('+'),
        ...evaluateUniverse(allSignals, symbols),
      };
    }).sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));

    const combos3 = combos(UNIVERSE, 3)
      .map((symbols) => ({
        symbols,
        label: symbols.join('+'),
        ...evaluateUniverse(allSignals, symbols),
      }))
      .sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));

    const sharpeContributors = [...leaveOneOut]
      .sort((a, b) => (a.sharpeDeltaVs5etf ?? 999) - (b.sharpeDeltaVs5etf ?? 999))
      .map((x) => ({
        etf: x.excluded,
        sharpeDeltaWhenExcluded: x.sharpeDeltaVs5etf,
        interpretationJa: x.roleJa,
      }));

    const noiseSources = sharpeContributors.filter((x) => (x.sharpeDeltaWhenExcluded ?? 0) > 0.02);
    const topContributors = sharpeContributors.filter((x) => (x.sharpeDeltaWhenExcluded ?? 0) < -0.02);

    const recommendation = {
      etf5: {
        symbols: [...UNIVERSE],
        labelJa: '現行5ETF',
        metrics: baseline5,
        noteJa: '件数最大・Sharpeバランス良好',
      },
      etf4: {
        symbols: combos4[0]!.symbols,
        labelJa: `推奨4ETF: ${combos4[0]!.label}`,
        metrics: {
          tradeCount: combos4[0]!.tradeCount,
          sharpe: combos4[0]!.sharpe,
          maxDrawdownPct: combos4[0]!.maxDrawdownPct,
          profitFactor: combos4[0]!.profitFactor,
          winRate: combos4[0]!.winRate,
          avgProfitPct: combos4[0]!.avgProfitPct,
        },
        excluded: UNIVERSE.find((e) => !combos4[0]!.symbols.includes(e)),
        noteJa: (() => {
          const ex = UNIVERSE.find((e) => !combos4[0]!.symbols.includes(e))!;
          const loo = leaveOneOut.find((x) => x.excluded === ex);
          return loo?.roleJa ?? '';
        })(),
      },
      etf3: {
        symbols: combos3[0]!.symbols,
        labelJa: `推奨3ETF: ${combos3[0]!.label}`,
        metrics: {
          tradeCount: combos3[0]!.tradeCount,
          sharpe: combos3[0]!.sharpe,
          maxDrawdownPct: combos3[0]!.maxDrawdownPct,
          profitFactor: combos3[0]!.profitFactor,
          winRate: combos3[0]!.winRate,
          avgProfitPct: combos3[0]!.avgProfitPct,
        },
        noteJa:
          (combos3[0]!.tradeCount ?? 0) >= 80
            ? 'Sharpe最大だが件数確認要'
            : 'Sharpeは高いが件数が大幅減 — 参考構成',
      },
      ranking4etf: combos4,
      ranking3etf: combos3.slice(0, 5),
    };

    const report = {
      fixedRuleJa: {
        entry: '4レジーム+浅押しADX/MACD（固定）',
        exit: '利確+3% / 損切りなし / 最大25日',
        operational: 'SPY優先 / 同時3',
      },
      baseline5etf: baseline5,
      executedShareInFullPortfolio: shareInFull,
      perEtfSolo,
      leaveOneOut,
      sharpeContributors,
      noiseSourcesJa: noiseSources.map((x) => `${x.etf}: 除外でSharpe +${x.sharpeDeltaWhenExcluded}`),
      topContributorsJa: topContributors.map((x) => `${x.etf}: 除外でSharpe ${x.sharpeDeltaWhenExcluded}`),
      recommendation,
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-final-etf-contribution');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csvRows = [
      'type,etf,trades,sharpe,maxDD,PF,winRate,avgProfit,note',
      ['baseline', '5ETF', baseline5.tradeCount, baseline5.sharpe ?? '', baseline5.maxDrawdownPct ?? '', baseline5.profitFactor ?? '', baseline5.winRate ?? '', baseline5.avgProfitPct ?? '', ''].join(','),
      ...perEtfSolo.map((r) =>
        ['solo', r.etf, r.solo.tradeCount, r.solo.sharpe ?? '', r.solo.maxDrawdownPct ?? '', r.solo.profitFactor ?? '', r.solo.winRate ?? '', r.solo.avgProfitPct ?? '', '単独運用'].join(','),
      ),
      ...leaveOneOut.map((r) =>
        [
          'leave1out',
          r.excluded,
          r.metrics.tradeCount,
          r.metrics.sharpe ?? '',
          r.metrics.maxDrawdownPct ?? '',
          r.metrics.profitFactor ?? '',
          r.metrics.winRate ?? '',
          r.metrics.avgProfitPct ?? '',
          r.roleJa,
        ].join(','),
      ),
    ];
    fs.writeFileSync(path.join(outDir, 'summary.csv'), `${csvRows.join('\n')}\n`, 'utf8');

    console.log('\n=== ETF CONTRIBUTION ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
