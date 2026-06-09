/**
 * 4ETF capital allocation optimization — equal / inv-vol / risk parity / min-DD / Kelly
 * npx vitest run tests/unit/case4Etf4CapitalAllocationOptimization.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const UNIVERSE = ['SCHD', 'VYM', 'DGRO', 'SPLG'] as const;
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

const INV_VOL_LOOKBACK = 20;
const RISK_PARITY_LOOKBACK = 63;
const KELLY_LOOKBACK = 60;
const KELLY_CAP = 0.25;

const PRIORITY: Record<Etf, number> = {
  DGRO: 4,
  VYM: 3,
  SPLG: 2,
  SCHD: 1,
};

type Regime = 'up' | 'sideways' | 'down';
type FourBucket = 'up' | 'sideways_shallow' | 'sideways_deep' | 'down' | 'unknown';

type OhlcvBar = { date: string; high: number; low: number; close: number };

type Signal = {
  date: string;
  symbol: Etf;
  returnPct: number;
};

type Metrics = {
  tradeCount: number;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  profitFactor: number | null;
  winRate: number | null;
  totalReturnPct: number | null;
};

type AllocationId =
  | 'equal'
  | 'inv_vol'
  | 'risk_parity'
  | 'min_maxdd'
  | 'kelly_capped';

type SymbolVolMaps = {
  vol20: Map<string, number>;
  vol63: Map<string, number>;
  kelly: Map<string, number>;
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

function buildSymbolVolMaps(bars: OhlcvBar[], symbol: Etf): SymbolVolMaps {
  const closes = bars.map((b) => b.close);
  const dailyRet: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    dailyRet.push((closes[i]! / closes[i - 1]! - 1) * 100);
  }
  const vol20 = new Map<string, number>();
  const vol63 = new Map<string, number>();
  const kelly = new Map<string, number>();

  for (let i = 1; i < bars.length; i++) {
    const date = bars[i]!.date;
    const r20 = dailyRet.slice(Math.max(0, i - INV_VOL_LOOKBACK), i);
    const r63 = dailyRet.slice(Math.max(0, i - RISK_PARITY_LOOKBACK), i);
    const rK = dailyRet.slice(Math.max(0, i - KELLY_LOOKBACK), i);
    if (r20.length >= 10) vol20.set(date, Math.max(std(r20), 0.05));
    if (r63.length >= 20) vol63.set(date, Math.max(std(r63), 0.05));
    if (rK.length >= 20) {
      const mu = mean(rK);
      const varDaily = std(rK) ** 2;
      const k = varDaily > 1e-9 ? Math.max(0, mu / varDaily) : 0;
      kelly.set(date, Math.min(KELLY_CAP, k));
    }
  }
  return { vol20, vol63, kelly };
}

function buildAllSignals(ohlcv: Map<Etf, OhlcvBar[]>, regimeMap: Map<string, Regime>): Signal[] {
  const out: Signal[] = [];
  for (const symbol of UNIVERSE) {
    const bars = ohlcv.get(symbol)!;
    const closes = bars.map((b) => b.close);
    const ema = (arr: number[], span: number) => {
      const k = 2 / (span + 1);
      let v = arr[0]!;
      for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
      return v;
    };
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
      if (!passesFinalRule({ bucket, dist52wPct: dist52, adx14: adx, macdHistPct: macd })) continue;

      const entryIdx = i + 1;
      const lastIdx = Math.min(i + HOLD_DAYS, bars.length - 1);
      if (entryIdx >= bars.length || lastIdx <= entryIdx) continue;
      const entry = bars[entryIdx]!.close;
      if (entry <= 0) continue;
      const target = entry * (1 + TAKE_PROFIT_PCT / 100);
      let ret: number | null = null;
      for (let k = entryIdx + 1; k <= lastIdx; k++) {
        if (bars[k]!.high >= target) {
          ret = TAKE_PROFIT_PCT;
          break;
        }
      }
      if (ret == null) ret = (bars[lastIdx]!.close / entry - 1) * 100;
      out.push({ date, symbol, returnPct: round3(ret) });
    }
  }
  return out;
}

function getVol(m: SymbolVolMaps, date: string, kind: 'vol20' | 'vol63'): number {
  const map = kind === 'vol20' ? m.vol20 : m.vol63;
  return map.get(date) ?? 1;
}

function rawWeight(
  t: Signal,
  id: AllocationId,
  volMaps: Record<Etf, SymbolVolMaps>,
  staticWeights?: Record<Etf, number>,
): number {
  switch (id) {
    case 'equal':
      return 1;
    case 'inv_vol':
      return 1 / getVol(volMaps[t.symbol], t.date, 'vol20');
    case 'risk_parity': {
      const v = getVol(volMaps[t.symbol], t.date, 'vol63');
      return 1 / (v * v);
    }
    case 'min_maxdd':
      return staticWeights?.[t.symbol] ?? 1;
    case 'kelly_capped':
      return volMaps[t.symbol].kelly.get(t.date) ?? 0.01;
    default:
      return 1;
  }
}

function weightedDailyReturn(taken: Signal[], id: AllocationId, volMaps: Record<Etf, SymbolVolMaps>, staticWeights?: Record<Etf, number>): number {
  const raw = taken.map((t) => rawWeight(t, id, volMaps, staticWeights));
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum <= 0) return round3(mean(taken.map((t) => t.returnPct)));
  return round3(taken.reduce((acc, t, i) => acc + (raw[i]! / sum) * t.returnPct, 0));
}

function runPortfolio(
  signals: Signal[],
  id: AllocationId,
  volMaps: Record<Etf, SymbolVolMaps>,
  staticWeights?: Record<Etf, number>,
) {
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
      .sort((a, b) => PRIORITY[b.symbol] - PRIORITY[a.symbol])
      .slice(0, MAX_CONCURRENT);
    dailyReturns.push(weightedDailyReturn(taken, id, volMaps, staticWeights));
    executed.push(...taken);
  }
  return { dailyReturns, executed };
}

function metricsFromRun(run: ReturnType<typeof runPortfolio>): Metrics {
  const { dailyReturns, executed } = run;
  if (dailyReturns.length === 0) {
    return { tradeCount: 0, sharpe: null, maxDrawdownPct: null, profitFactor: null, winRate: null, totalReturnPct: null };
  }
  const drWins = dailyReturns.filter((r) => r > 0);
  const drLosses = dailyReturns.filter((r) => r < 0);
  const tradeWins = executed.filter((t) => t.returnPct > 0);
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
    tradeCount: executed.length,
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      drLosses.length > 0
        ? round3(drWins.reduce((a, b) => a + b, 0) / Math.abs(drLosses.reduce((a, b) => a + b, 0)))
        : null,
    winRate: executed.length > 0 ? round3(tradeWins.length / executed.length) : null,
    totalReturnPct: round2(((equity / INITIAL_CAPITAL_USD - 1) * 100)),
  };
}

function optimizeMinMaxDdWeights(signals: Signal[], volMaps: Record<Etf, SymbolVolMaps>): Record<Etf, number> {
  let best: { weights: Record<Etf, number>; maxDd: number; sharpe: number } | null = null;
  const step = 10;
  for (let a = 0; a <= step; a++) {
    for (let b = 0; b <= step - a; b++) {
      for (let c = 0; c <= step - a - b; c++) {
        const d = step - a - b - c;
        const weights: Record<Etf, number> = {
          SCHD: a / step,
          VYM: b / step,
          DGRO: c / step,
          SPLG: d / step,
        };
        if (Object.values(weights).every((w) => w === 0)) continue;
        const m = metricsFromRun(runPortfolio(signals, 'min_maxdd', volMaps, weights));
        if (m.maxDrawdownPct == null || m.sharpe == null) continue;
        if (
          !best ||
          m.maxDrawdownPct > best.maxDd ||
          (m.maxDrawdownPct === best.maxDd && m.sharpe > best.sharpe)
        ) {
          best = { weights, maxDd: m.maxDrawdownPct, sharpe: m.sharpe };
        }
      }
    }
  }
  return best?.weights ?? { SCHD: 0.25, VYM: 0.25, DGRO: 0.25, SPLG: 0.25 };
}

function rankScore(m: Metrics, baseline: Metrics): number {
  const sharpeOk = (m.sharpe ?? 0) >= (baseline.sharpe ?? 0) * 0.95 ? 2 : (m.sharpe ?? 0) >= (baseline.sharpe ?? 0) * 0.9 ? 1 : 0;
  const ddBetter = (m.maxDrawdownPct ?? -999) >= (baseline.maxDrawdownPct ?? -999) ? 2 : 0;
  const pfBetter = (m.profitFactor ?? 0) >= (baseline.profitFactor ?? 0) ? 1 : 0;
  return sharpeOk + ddBetter + pfBetter + ((m.sharpe ?? 0) * 0.5);
}

describe('Case4 4ETF capital allocation optimization', () => {
  it('compares 5 allocation methods and recommends final weights', async () => {
    const ohlcv = new Map<Etf, OhlcvBar[]>();
    for (const sym of UNIVERSE) {
      ohlcv.set(sym, await fetchYahooOhlcv(sym));
    }
    const regimeMap = buildSpyRegimeMap(await fetchYahooOhlcv('SPY'));
    const allSignals = buildAllSignals(ohlcv, regimeMap);

    const volMaps = Object.fromEntries(UNIVERSE.map((s) => [s, buildSymbolVolMaps(ohlcv.get(s)!, s)])) as Record<
      Etf,
      SymbolVolMaps
    >;

    const minDdWeights = optimizeMinMaxDdWeights(allSignals, volMaps);

    const methods: Array<{ id: AllocationId; labelJa: string; staticWeights?: Record<Etf, number> }> = [
      { id: 'equal', labelJa: '1. 均等配分' },
      { id: 'inv_vol', labelJa: '2. ボラティリティ逆数配分（20日）' },
      { id: 'risk_parity', labelJa: '3. リスクパリティ（63日・逆分散）' },
      { id: 'min_maxdd', labelJa: '4. 最大DD最小化配分（静的ウェイト最適化）', staticWeights: minDdWeights },
      { id: 'kelly_capped', labelJa: `5. Kelly制限版（上限${KELLY_CAP * 100}%）` },
    ];

    const results = methods.map((meth) => {
      const run = runPortfolio(allSignals, meth.id, volMaps, meth.staticWeights);
      const metrics = metricsFromRun(run);
      return { ...meth, metrics };
    });

    const baseline = results.find((r) => r.id === 'equal')!;
    const ranked = [...results]
      .map((r) => ({
        ...r,
        score: rankScore(r.metrics, baseline.metrics),
        vsBaseline: {
          sharpeDelta: round3((r.metrics.sharpe ?? 0) - (baseline.metrics.sharpe ?? 0)),
          maxDdDelta: round2((r.metrics.maxDrawdownPct ?? 0) - (baseline.metrics.maxDrawdownPct ?? 0)),
          pfDelta: round3((r.metrics.profitFactor ?? 0) - (baseline.metrics.profitFactor ?? 0)),
          totalReturnDelta: round2((r.metrics.totalReturnPct ?? 0) - (baseline.metrics.totalReturnPct ?? 0)),
        },
      }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0]!;
    const recommendation = (() => {
      const sharpeMaintained = (best.metrics.sharpe ?? 0) >= (baseline.metrics.sharpe ?? 0) * 0.98;
      const ddImproved = (best.metrics.maxDrawdownPct ?? -999) >= (baseline.metrics.maxDrawdownPct ?? -999);
      const pfImproved = (best.metrics.profitFactor ?? 0) >= (baseline.metrics.profitFactor ?? 0);

      if (best.id === 'equal' || (!ddImproved && !pfImproved)) {
        return {
          method: 'equal',
          labelJa: '均等配分（現行維持）',
          reasonJa: '代替配分はSharpe/MaxDD/PFの総合改善が不十分 — シンプルな均等配分を推奨',
          weightsJa: '同日採用N銘柄へ 100/N % 均等配分',
        };
      }
      return {
        method: best.id,
        labelJa: best.labelJa,
        reasonJa: `Sharpe${sharpeMaintained ? '維持' : 'やや低下'} / MaxDD${ddImproved ? '改善' : '同等'} / PF${pfImproved ? '改善' : '同等'}`,
        weightsJa:
          best.id === 'min_maxdd'
            ? `静的シンボルウェイト: SCHD ${minDdWeights.SCHD} / VYM ${minDdWeights.VYM} / DGRO ${minDdWeights.DGRO} / SPLG ${minDdWeights.SPLG}（当日採用銘柄内で正規化）`
            : best.id === 'inv_vol'
              ? '各銘柄 1/σ20 を当日採用銘柄内で正規化'
              : best.id === 'risk_parity'
                ? '各銘柄 1/σ63² を当日採用銘柄内で正規化'
                : best.id === 'kelly_capped'
                  ? `Kelly(60日) を ${KELLY_CAP * 100}% 上限で当日正規化`
                  : '100/N 均等',
        optimizedStaticWeights: best.id === 'min_maxdd' ? minDdWeights : undefined,
      };
    })();

    const report = {
      capitalModelJa: {
        baseCapitalUsd: INITIAL_CAPITAL_USD,
        compounding: false,
        dailyExposure: '100%（当日ウェイト合計=1）',
        strategy: '4ETF確定版・エントリー/出口固定',
      },
      minMaxDdOptimizedWeights: minDdWeights,
      baseline: baseline.metrics,
      results: ranked,
      comparisonTable: ranked.map((r) => ({
        method: r.id,
        labelJa: r.labelJa,
        ...r.metrics,
        vsBaseline: r.vsBaseline,
        score: r.score,
      })),
      recommendation,
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-etf4-capital-allocation');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'method,label,trades,sharpe,maxDD,PF,winRate,totalReturnPct,sharpeDelta,maxDdDelta',
      ...ranked.map((r) =>
        [
          r.id,
          `"${r.labelJa}"`,
          r.metrics.tradeCount,
          r.metrics.sharpe ?? '',
          r.metrics.maxDrawdownPct ?? '',
          r.metrics.profitFactor ?? '',
          r.metrics.winRate ?? '',
          r.metrics.totalReturnPct ?? '',
          r.vsBaseline.sharpeDelta,
          r.vsBaseline.maxDdDelta,
        ].join(','),
      ),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'comparison.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== CAPITAL ALLOCATION ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
