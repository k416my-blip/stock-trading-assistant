/**
 * 4ETF final validation — dependency check + operational confirmation
 * npx vitest run tests/unit/case4Hold25Etf4FinalValidation.test.ts
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
  month: string;
  year: string;
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
      const row = { bucket, dist52wPct: dist52, adx14: adx, macdHistPct: macd };
      if (!passesFinalRule(row)) continue;

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
      if (ret == null) ret = ((bars[lastIdx]!.close / entry - 1) * 100);
      out.push({
        date,
        month: date.slice(0, 7),
        year: date.slice(0, 4),
        symbol,
        returnPct: round3(ret),
      });
    }
  }
  return out;
}

function runPortfolio(signals: Signal[]) {
  const byDate = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const dailyReturns: number[] = [];
  const dates: string[] = [];
  const executed: Signal[] = [];
  for (const d of [...byDate.keys()].sort()) {
    const taken = [...byDate.get(d)!]
      .sort((a, b) => PRIORITY[b.symbol] - PRIORITY[a.symbol])
      .slice(0, MAX_CONCURRENT);
    dailyReturns.push(round3(mean(taken.map((t) => t.returnPct))));
    dates.push(d);
    executed.push(...taken);
  }
  return { dailyReturns, dates, executed };
}

function totalReturnFromDaily(dailyReturns: number[]): number {
  let equity = INITIAL_CAPITAL_USD;
  for (const r of dailyReturns) {
    equity += (INITIAL_CAPITAL_USD * r) / 100;
  }
  return round2(((equity / INITIAL_CAPITAL_USD - 1) * 100));
}

function metricsFromRun(run: ReturnType<typeof runPortfolio>): Metrics {
  const { dailyReturns, executed } = run;
  if (dailyReturns.length === 0) {
    return {
      tradeCount: 0,
      sharpe: null,
      maxDrawdownPct: null,
      profitFactor: null,
      winRate: null,
      totalReturnPct: null,
      avgProfitPct: null,
    };
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
    totalReturnPct: totalReturnFromDaily(dailyReturns),
    avgProfitPct: executed.length > 0 ? round3(mean(executed.map((t) => t.returnPct))) : null,
  };
}

function evaluate(signals: Signal[]): Metrics {
  return metricsFromRun(runPortfolio(signals));
}

function lossStreakStats(trades: Signal[]) {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  const streaks: number[] = [];
  let cur = 0;
  for (const t of sorted) {
    if (t.returnPct < 0) {
      cur++;
    } else {
      if (cur > 0) streaks.push(cur);
      cur = 0;
    }
  }
  if (cur > 0) streaks.push(cur);
  return {
    maxConsecutiveLosses: streaks.length ? Math.max(...streaks) : 0,
    avgConsecutiveLosses: streaks.length ? round3(mean(streaks)) : 0,
    lossStreakCount: streaks.length,
  };
}

describe('Case4 4ETF final validation', () => {
  it('yearly, ETF, exclude2025, streaks, monthly, final verdict', async () => {
    const ohlcv = new Map<Etf, OhlcvBar[]>();
    for (const sym of UNIVERSE) {
      ohlcv.set(sym, await fetchYahooOhlcv(sym));
    }
    const spyBars = await fetchYahooOhlcv('SPY');
    const regimeMap = buildSpyRegimeMap(spyBars);
    const allSignals = buildAllSignals(ohlcv, regimeMap);
    const fullRun = runPortfolio(allSignals);
    const fullMetrics = metricsFromRun(fullRun);

    const yearReturnProgression = ['2024', '2025', '2026'].map((y) => {
      const sigs = allSignals.filter((s) => s.year === y);
      const run = runPortfolio(sigs);
      const m = metricsFromRun(run);
      const sharePct = fullMetrics.tradeCount > 0 ? round3(m.tradeCount / fullMetrics.tradeCount) : 0;
      return { year: y, shareOfTradesPct: sharePct, ...m };
    });

    const etfSolo = UNIVERSE.map((etf) => ({
      etf,
      ...evaluate(allSignals.filter((s) => s.symbol === etf)),
    }));

    const executedShare = Object.fromEntries(
      UNIVERSE.map((etf) => {
        const count = fullRun.executed.filter((t) => t.symbol === etf).length;
        return [etf, { count, pct: fullMetrics.tradeCount > 0 ? round3(count / fullMetrics.tradeCount) : 0 }];
      }),
    );

    const leaveOneOut = UNIVERSE.map((excluded) => {
      const remaining = UNIVERSE.filter((e) => e !== excluded);
      const m = evaluate(allSignals.filter((s) => remaining.includes(s.symbol)));
      const sharpeDelta = m.sharpe != null && fullMetrics.sharpe != null ? round3(m.sharpe - fullMetrics.sharpe) : null;
      return {
        excluded,
        labelJa: `${excluded}抜き`,
        remaining,
        metrics: m,
        sharpeDeltaVsFull: sharpeDelta,
        roleJa:
          sharpeDelta != null && sharpeDelta > 0.05
            ? 'ノイズ源'
            : sharpeDelta != null && sharpeDelta < -0.05
              ? 'Sharpe貢献'
              : '中立',
      };
    });

    const exclude2025 = evaluate(allSignals.filter((s) => s.year !== '2025'));
    const exclude2025Compare = {
      full: fullMetrics,
      exclude2025,
      sharpeDelta: round3((exclude2025.sharpe ?? 0) - (fullMetrics.sharpe ?? 0)),
      tradeCountDelta: exclude2025.tradeCount - fullMetrics.tradeCount,
      y2025Share: yearReturnProgression.find((y) => y.year === '2025')!,
    };

    const streaks = lossStreakStats(fullRun.executed);

    const monthly = [...new Set(allSignals.map((s) => s.month))].sort().map((month) => {
      const sigs = allSignals.filter((s) => s.month === month);
      const run = runPortfolio(sigs);
      return { month, ...metricsFromRun(run) };
    });

    const monthlyPositive = monthly.filter((m) => (m.totalReturnPct ?? 0) > 0).length;
    const monthlyNegative = monthly.filter((m) => (m.totalReturnPct ?? 0) < 0).length;

    const dependencyJa = (() => {
      const lines: string[] = [];
      const y2025 = yearReturnProgression.find((y) => y.year === '2025')!;
      const y2024 = yearReturnProgression.find((y) => y.year === '2024')!;
      const y2026 = yearReturnProgression.find((y) => y.year === '2026')!;

      const pct2025 = y2025.shareOfTradesPct ?? 0;
      if (pct2025 > 0.65) {
        lines.push(`2025が全トレードの ${round3(pct2025 * 100)}% — 期間依存度は高め`);
      } else {
        lines.push(`2025シェア ${round3(pct2025 * 100)}% — 単一年度への偏りは中程度`);
      }

      if ((exclude2025.sharpe ?? 0) < (fullMetrics.sharpe ?? 0) - 0.3) {
        lines.push(`2025除外でSharpe ${exclude2025.sharpe}（-${round3((fullMetrics.sharpe ?? 0) - (exclude2025.sharpe ?? 0))}）— 2025寄与大`);
      } else if ((exclude2025.sharpe ?? 0) >= 1.0) {
        lines.push(`2025除外でもSharpe ${exclude2025.sharpe} — 2025なしでも戦略成立`);
      } else {
        lines.push(`2025除外Sharpe ${exclude2025.sharpe} — 2024+2026のみでは弱い`);
      }

      const contributors = leaveOneOut.filter((x) => x.roleJa === 'Sharpe貢献');
      const noise = leaveOneOut.filter((x) => x.roleJa === 'ノイズ源');
      if (contributors.length === 1) {
        lines.push(`Sharpe貢献は ${contributors[0]!.excluded} が中心（除外Δ${contributors[0]!.sharpeDeltaVsFull}）`);
      } else if (contributors.length > 1) {
        lines.push(`複数ETFが貢献: ${contributors.map((c) => c.excluded).join(', ')}`);
      }
      if (noise.length > 0) {
        lines.push(`ノイズ候補: ${noise.map((n) => n.excluded).join(', ')}`);
      } else {
        lines.push('特定ETF除外によるSharpe改善はなし — ETF分散は健全');
      }

      lines.push(
        `年別Sharpe: 2024=${y2024.sharpe} / 2025=${y2025.sharpe} / 2026=${y2026.sharpe}`,
      );

      return lines;
    })();

    const finalOperationalJa = (() => {
      const y2025Sharpe = yearReturnProgression.find((y) => y.year === '2025')!.sharpe ?? 0;
      const ex25Sharpe = exclude2025.sharpe ?? 0;
      const okEx25 = ex25Sharpe >= 1.0;
      const okFull = (fullMetrics.sharpe ?? 0) >= 1.5 && fullMetrics.tradeCount >= 90;
      const etfBalanced = leaveOneOut.filter((x) => x.roleJa === 'ノイズ源').length === 0;

      if (okFull && y2025Sharpe >= 1.2 && okEx25 && etfBalanced) {
        return {
          version: '4ETF確定版',
          universe: [...UNIVERSE],
          verdict: '最終運用版として採用可',
          summaryJa:
            'Sharpe改善は2025単年の偶然ではなく、ETF横断で再現。2025除外でもSharpe>=1.0。特定ETFノイズなし。',
        };
      }
      if (okFull && y2025Sharpe >= 1.2) {
        return {
          version: '4ETF確定版（条件付き）',
          universe: [...UNIVERSE],
          verdict: '採用可 — 2025依存を監視',
          summaryJa: 'フル期間・2025とも良好。2025除外時のSharpeを継続モニタリング推奨。',
        };
      }
      return {
        version: '要再検討',
        universe: [...UNIVERSE],
        verdict: '追加データ待ち',
        summaryJa: '指標が基準未達。運用確定には保留。',
      };
    })();

    const report = {
      fixedRuleJa: {
        universe: [...UNIVERSE],
        entry: '4レジーム + 浅押し ADX>30 MACD>0.15 + ベース ADX>25 MACD>0.10',
        exit: '利確+3% / 最大25日',
        concurrent: 3,
        priority: 'DGRO > VYM > SPLG > SCHD',
      },
      fullPeriod: fullMetrics,
      section1_yearReturnProgression: yearReturnProgression,
      section2_etfContribution: {
        executedShareInFull: executedShare,
        perEtfSolo: etfSolo,
        leaveOneOut,
      },
      section3_exclude2025: exclude2025Compare,
      section4_consecutiveLosses: streaks,
      section5_monthly: {
        months: monthly,
        summary: {
          totalMonths: monthly.length,
          positiveMonths: monthlyPositive,
          negativeMonths: monthlyNegative,
          winMonthRate: monthly.length > 0 ? round3(monthlyPositive / monthly.length) : null,
        },
      },
      dependencyAnalysisJa: dependencyJa,
      finalOperational: finalOperationalJa,
    };

    const outDir = path.join(process.cwd(), 'scripts', 'case4-etf4-final-validation');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'section,key,trades,sharpe,maxDD,PF,winRate,totalReturnPct',
      ['full', 'all', fullMetrics.tradeCount, fullMetrics.sharpe ?? '', fullMetrics.maxDrawdownPct ?? '', fullMetrics.profitFactor ?? '', fullMetrics.winRate ?? '', fullMetrics.totalReturnPct ?? ''].join(','),
      ...yearReturnProgression.map((y) =>
        ['year', y.year, y.tradeCount, y.sharpe ?? '', y.maxDrawdownPct ?? '', y.profitFactor ?? '', y.winRate ?? '', y.totalReturnPct ?? ''].join(','),
      ),
      ...etfSolo.map((e) =>
        ['etf_solo', e.etf, e.tradeCount, e.sharpe ?? '', e.maxDrawdownPct ?? '', e.profitFactor ?? '', e.winRate ?? '', e.totalReturnPct ?? ''].join(','),
      ),
      ['exclude2025', '2024+2026', exclude2025.tradeCount, exclude2025.sharpe ?? '', exclude2025.maxDrawdownPct ?? '', exclude2025.profitFactor ?? '', exclude2025.winRate ?? '', exclude2025.totalReturnPct ?? ''].join(','),
      ...monthly.map((m) =>
        ['month', m.month, m.tradeCount, m.sharpe ?? '', m.maxDrawdownPct ?? '', m.profitFactor ?? '', m.winRate ?? '', m.totalReturnPct ?? ''].join(','),
      ),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'summary.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== 4ETF FINAL VALIDATION ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
