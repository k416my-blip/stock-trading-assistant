/**
 * SPY noise verification — priority rule vs SPY quality (追加検証のみ)
 * npx vitest run tests/unit/case4Hold25SpyNoiseVerification.test.ts
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

type PriorityMode = 'spy_first' | 'equal';

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

function sortSignals(day: Signal[], mode: PriorityMode): Signal[] {
  if (mode === 'spy_first') {
    return [...day].sort((a, b) => PRIORITY_SPY_FIRST[b.symbol] - PRIORITY_SPY_FIRST[a.symbol]);
  }
  return [...day].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function runPortfolio(signals: Signal[], priorityMode: PriorityMode = 'spy_first') {
  const byDate = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const dailyReturns: number[] = [];
  const executed: Signal[] = [];
  for (const d of [...byDate.keys()].sort()) {
    const taken = sortSignals(byDate.get(d)!, priorityMode).slice(0, MAX_CONCURRENT);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    executed.push(...taken);
  }
  return { dailyReturns, executed };
}

function metricsFromDailyReturns(dailyReturns: number[], trades: Signal[]): Metrics {
  if (dailyReturns.length === 0) {
    return { tradeCount: 0, sharpe: null, maxDrawdownPct: null, profitFactor: null, winRate: null };
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
  };
}

function evaluate(signals: Signal[], allowed: readonly Etf[], priorityMode: PriorityMode = 'spy_first'): Metrics {
  const set = new Set(allowed);
  const filtered = signals.filter((s) => set.has(s.symbol));
  const run = runPortfolio(filtered, priorityMode);
  return metricsFromDailyReturns(run.dailyReturns, run.executed);
}

function compareSelectionDiff(allSignals: Signal[]) {
  const byDate = new Map<string, Signal[]>();
  for (const s of allSignals) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  let daysWithDiff = 0;
  let spySlotsSpyFirst = 0;
  let spySlotsEqual = 0;
  for (const [, day] of byDate) {
    if (day.length <= MAX_CONCURRENT) continue;
    const spyFirst = sortSignals(day, 'spy_first').slice(0, MAX_CONCURRENT);
    const equal = sortSignals(day, 'equal').slice(0, MAX_CONCURRENT);
    const spyFirstSet = new Set(spyFirst.map((s) => s.symbol));
    const equalSet = new Set(equal.map((s) => s.symbol));
    if ([...spyFirstSet].some((x) => !equalSet.has(x)) || [...equalSet].some((x) => !spyFirstSet.has(x))) {
      daysWithDiff++;
    }
    if (spyFirstSet.has('SPY')) spySlotsSpyFirst++;
    if (equalSet.has('SPY')) spySlotsEqual++;
  }
  return { daysWithDiff, spySlotsSpyFirst, spySlotsEqual };
}

describe('Case4 SPY noise verification', () => {
  it('isolates SPY quality vs SPY-first priority rule', async () => {
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

    const baseline = {
      id: 'current_5etf_spy_first',
      labelJa: '現行: 5ETF + SPY優先',
      ...evaluate(allSignals, UNIVERSE, 'spy_first'),
    };

    const test1 = {
      id: '5etf_equal_priority',
      labelJa: '① 5ETF + SPY優先なし（平等・アルファベット順）',
      ...evaluate(allSignals, UNIVERSE, 'equal'),
    };

    const test2 = {
      id: 'spy_solo',
      labelJa: '② SPY単独',
      ...evaluate(allSignals, ['SPY'], 'equal'),
    };

    const pairPartners: Etf[] = ['SCHD', 'VYM', 'DGRO', 'SPLG'];
    const test3 = pairPartners.map((partner) => ({
      id: `pair_${partner}_SPY`,
      labelJa: `③ ${partner}+SPY`,
      partner,
      ...evaluate(allSignals, [partner, 'SPY'], 'equal'),
    }));

    const test4 = {
      id: '4etf_no_spy',
      labelJa: '④ SCHD+VYM+DGRO+SPLG（SPYなし）',
      ...evaluate(allSignals, ['SCHD', 'VYM', 'DGRO', 'SPLG'], 'equal'),
    };

    const selectionDiff = compareSelectionDiff(allSignals.filter((s) => UNIVERSE.includes(s.symbol)));

    const sharpeDeltaPriority = round3((test1.sharpe ?? 0) - (baseline.sharpe ?? 0));
    const sharpeDeltaNoSpy = round3((test4.sharpe ?? 0) - (baseline.sharpe ?? 0));

    const verdictJa = (() => {
      const spySoloOk = (test2.sharpe ?? 0) >= 1.0;
      const priorityHurts = sharpeDeltaPriority > 0.05;
      const priorityHelps = sharpeDeltaPriority < -0.05;
      const noSpyBetter = sharpeDeltaNoSpy > 0.05;
      const pairsAvgSharpe = mean(test3.map((p) => p.sharpe ?? 0));
      const partnerSoloSharpe = mean(
        pairPartners.map((p) => evaluate(allSignals, [p], 'equal').sharpe ?? 0),
      );

      const lines: string[] = [];

      if (priorityHurts && spySoloOk) {
        lines.push(
          '判定: **SPY優先ルールが主因**。SPY単独Sharpeは1.0以上だが、5ETF平等化でSharpeが改善 → 同日競合時にSPYが枠を占有し高Sharpe ETFを排除している。',
        );
      } else if (priorityHurts && !spySoloOk) {
        lines.push('判定: **SPYそのもの＋優先ルールの両方が悪化要因**。');
      } else if (!priorityHurts && noSpyBetter && spySoloOk) {
        lines.push(
          '判定: **SPY優先ルールは主因ではない**。SPY単独は良好だが、4ETF（SPYなし）の方がSharpe高 → ポートフォリオ分散上SPY追加の限界効用が低い。',
        );
      } else if (!priorityHurts && !noSpyBetter && spySoloOk) {
        lines.push('判定: **SPYは問題なし**。現行SPY優先も許容範囲。');
      } else if (!spySoloOk && noSpyBetter) {
        lines.push('判定: **SPYそのものが弱い**。単独Sharpe低く、除外で改善。');
      } else {
        lines.push('判定: **混在**。優先ルールとSPY品質の両面を確認。');
      }

      lines.push(
        `根拠: 現行Sharpe ${baseline.sharpe} → 平等化 ${test1.sharpe} (Δ${sharpeDeltaPriority}), SPY単独 ${test2.sharpe}, SPYなし4ETF ${test4.sharpe} (Δ${sharpeDeltaNoSpy}).`,
      );
      lines.push(
        `ペア平均Sharpe ${round3(pairsAvgSharpe)} vs パートナー単独平均 ${round3(partnerSoloSharpe)} — SPYペアは単独比で${pairsAvgSharpe < partnerSoloSharpe ? '低下' : '同等以上'}。`,
      );
      lines.push(
        `同日3超過日 ${selectionDiff.daysWithDiff}日 — SPY優先枠 ${selectionDiff.spySlotsSpyFirst} vs 平等枠 ${selectionDiff.spySlotsEqual}。`,
      );

      return lines;
    })();

    const report = {
      noteJa: '現行ルールは変更なし。追加検証のみ。エントリー/出口/同時3は全シナリオ共通。',
      equalPriorityTieBreakJa: '平等時はシンボル名アルファベット順で同時3を選択',
      baseline,
      test1_noSpyPriority: test1,
      test2_spySolo: test2,
      test3_spyPairs: test3,
      test4_noSpy4etf: test4,
      selectionDiffOnConcurrentDays: selectionDiff,
      comparisonTable: [baseline, test1, test2, ...test3, test4],
      verdictJa,
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-spy-noise-verification');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'id,label,trades,sharpe,maxDD,PF,winRate',
      ...report.comparisonTable.map((r) =>
        [r.id, `"${r.labelJa}"`, r.tradeCount, r.sharpe ?? '', r.maxDrawdownPct ?? '', r.profitFactor ?? '', r.winRate ?? ''].join(','),
      ),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'summary.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== SPY NOISE VERIFICATION ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
