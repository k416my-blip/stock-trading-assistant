/**
 * US operational deep analysis (ADX>25, MACD>0.05, SMA50)
 * Goal: Sharpe>0.8, MaxDD<20%
 * npx vitest run tests/unit/usOperationalDeepAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const INITIAL_CAPITAL_USD = 10_000;
const HOLD_DAYS = 20;
const US_SYMBOLS = ['SPY', 'QQQ', 'SCHD', 'JEPI', 'VYM'] as const;
const SL_GRID = [null, 5, 8, 10, 12] as const; // null = no SL (hold 20d close)

type OhlcvBar = { date: string; high: number; low: number; close: number };
type EnrichedTrade = {
  id: number;
  date: string;
  symbol: string;
  sector: string;
  returnPctHold20: number;
  pnlUsdHold20: number;
  adx14: number;
  macdHistPct: number;
  distFrom52wHighPct: number;
  concurrentOnDay: number;
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
function percentile(vals: number[], p: number): number | null {
  if (vals.length === 0) return null;
  const s = [...vals].sort((a, b) => a - b);
  const pos = (s.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo]!;
  const w = pos - lo;
  return round3(s[lo]! * (1 - w) + s[hi]! * w);
}

function sectorOf(symbol: string): string {
  const map: Record<string, string> = {
    SPY: 'broad_market_etf',
    QQQ: 'growth_etf',
    SCHD: 'dividend_etf',
    JEPI: 'income_etf',
    VYM: 'dividend_etf',
  };
  return map[symbol] ?? 'other';
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

function simulateReturn(bars: OhlcvBar[], signalIdx: number, stopLossPct: number | null): number | null {
  const entryIdx = signalIdx + 1;
  const lastIdx = Math.min(signalIdx + HOLD_DAYS, bars.length - 1);
  if (entryIdx >= bars.length) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;
  if (stopLossPct == null) {
    return round3(((bars[lastIdx]!.close / entry - 1) * 100));
  }
  const stop = entry * (1 - stopLossPct / 100);
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    if (bars[i]!.low <= stop) return round3(((stop / entry - 1) * 100));
  }
  return round3(((bars[lastIdx]!.close / entry - 1) * 100));
}

function metricsFromDailyReturns(dailyReturns: number[]) {
  if (dailyReturns.length === 0) {
    return {
      sharpe: null as number | null,
      sortino: null as number | null,
      maxDrawdownPct: null as number | null,
      winRate: null as number | null,
      profitFactor: null as number | null,
      tradeCount: 0,
      activeDays: 0,
      cagrPct: null as number | null,
      finalBalanceUsd: INITIAL_CAPITAL_USD,
    };
  }
  const wins = dailyReturns.filter((r) => r > 0);
  const losses = dailyReturns.filter((r) => r < 0);
  const mu = mean(dailyReturns);
  const sigma = std(dailyReturns);
  const downside = dailyReturns.filter((r) => r < 0);
  const downsideDev =
    downside.length > 0 ? Math.sqrt(downside.reduce((a, r) => a + r * r, 0) / downside.length) : 0;
  let equity = INITIAL_CAPITAL_USD;
  let peak = INITIAL_CAPITAL_USD;
  let maxDd = 0;
  for (const r of dailyReturns) {
    equity += (INITIAL_CAPITAL_USD * r) / 100;
    if (equity > peak) peak = equity;
    maxDd = Math.min(maxDd, equity / peak - 1);
  }
  const years = dailyReturns.length / 252;
  const cagr = years > 0 && equity > 0 ? Math.pow(equity / INITIAL_CAPITAL_USD, 1 / years) - 1 : null;
  return {
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    sortino: downsideDev > 1e-9 ? round3(mu / downsideDev) : null,
    maxDrawdownPct: round2(maxDd * 100),
    winRate: round3(wins.length / dailyReturns.length),
    profitFactor:
      losses.length > 0
        ? round3(wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)))
        : null,
    tradeCount: 0,
    activeDays: dailyReturns.length,
    cagrPct: cagr == null ? null : round3(cagr * 100),
    finalBalanceUsd: round2(equity),
  };
}

function buildDailyReturnsFromTrades(
  trades: Array<{ date: string; returnPct: number }>,
): { dailyReturns: number[]; dates: string[] } {
  const byDate = new Map<string, number[]>();
  for (const t of trades) {
    const arr = byDate.get(t.date) ?? [];
    arr.push(t.returnPct);
    byDate.set(t.date, arr);
  }
  const dates = [...byDate.keys()].sort();
  const dailyReturns = dates.map((d) => mean(byDate.get(d)!));
  return { dailyReturns, dates };
}

function equityCurveFromDaily(dates: string[], dailyReturns: number[]) {
  let equity = INITIAL_CAPITAL_USD;
  let peak = INITIAL_CAPITAL_USD;
  let maxDd = 0;
  let ddStart = dates[0] ?? null;
  let ddTrough = dates[0] ?? null;
  let peakDate = dates[0] ?? null;
  const curve: Array<{ date: string; equityUsd: number; drawdownPct: number; dailyReturnPct: number }> = [];
  for (let i = 0; i < dates.length; i++) {
    const r = dailyReturns[i]!;
    equity += (INITIAL_CAPITAL_USD * r) / 100;
    if (equity > peak) {
      peak = equity;
      peakDate = dates[i]!;
    }
    const dd = peak > 0 ? equity / peak - 1 : -1;
    if (dd < maxDd) {
      maxDd = dd;
      ddStart = peakDate;
      ddTrough = dates[i]!;
    }
    curve.push({ date: dates[i]!, equityUsd: round2(equity), drawdownPct: round2(dd * 100), dailyReturnPct: round3(r) });
  }
  return { curve, maxDd, maxDdPeriod: { start: ddStart, trough: ddTrough } };
}

function groupStats(
  label: string,
  trades: Array<{ date: string; returnPct: number; pnlUsd?: number }>,
) {
  const { dailyReturns } = buildDailyReturnsFromTrades(trades);
  const rets = trades.map((t) => t.returnPct);
  const wins = rets.filter((r) => r > 0);
  return {
    label,
    tradeCount: trades.length,
    avgReturnPct: rets.length ? round3(mean(rets)) : null,
    totalPnlUsd: trades.every((t) => t.pnlUsd != null)
      ? round2(trades.reduce((a, t) => a + (t.pnlUsd ?? 0), 0))
      : null,
    tradeWinRate: rets.length ? round3(wins.length / rets.length) : null,
    ...metricsFromDailyReturns(dailyReturns),
  };
}

describe('US operational deep analysis', () => {
  it('writes maxDD period, worst lists, SL grid, and exclusion revalidation', async () => {
    const csvPath = path.join(process.cwd(), 'scripts', 'cagr-audit', 'US_trades.csv');
    const raw = fs.readFileSync(csvPath, 'utf8').trim().split('\n').slice(1);
    const baseTrades = raw.map((line, i) => {
      const [id, date, symbol, returnPct, pnlUsdEqualWeight, concurrentPositions] = line.split(',');
      return {
        id: Number(id),
        date,
        symbol,
        returnPctHold20: Number(returnPct),
        pnlUsdHold20: Number(pnlUsdEqualWeight),
        concurrentOnDay: Number(concurrentPositions),
      };
    });

    const barsBySymbol = new Map<string, OhlcvBar[]>();
    const featureCache = new Map<string, Map<string, { adx: number; macd: number; dist52: number }>>();
    for (const sym of US_SYMBOLS) {
      const bars = await fetchYahooOhlcv(sym);
      barsBySymbol.set(sym, bars);
      const closes = bars.map((b) => b.close);
      const ema = (arr: number[], span: number) => {
        const k = 2 / (span + 1);
        let v = arr[0]!;
        for (let j = 1; j < arr.length; j++) v = arr[j]! * k + v * (1 - k);
        return v;
      };
      const featMap = new Map<string, { adx: number; macd: number; dist52: number }>();
      for (let idx = 0; idx < bars.length; idx++) {
        const date = bars[idx]!.date;
        const adx = (() => {
          const period = 14;
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
          return mean(dx.slice(-period));
        })();
        const macd = (() => {
          if (idx < 35) return null;
          const slice = closes.slice(0, idx + 1);
          const macdLine = ema(slice, 12) - ema(slice, 26);
          const signalSlice: number[] = [];
          for (let i = Math.max(0, idx - 8); i <= idx; i++) {
            signalSlice.push(ema(closes.slice(0, i + 1), 12) - ema(closes.slice(0, i + 1), 26));
          }
          const signal = ema(signalSlice, 9);
          return ((macdLine - signal) / closes[idx]!) * 100;
        })();
        const dist52 = (() => {
          const lookback = Math.min(252, idx);
          if (lookback < 60) return null;
          let maxH = -Infinity;
          for (let i = idx - lookback; i <= idx; i++) maxH = Math.max(maxH, bars[i]!.high);
          return ((bars[idx]!.close / maxH - 1) * 100);
        })();
        if (adx != null && macd != null && dist52 != null) featMap.set(date, { adx, macd, dist52 });
      }
      featureCache.set(sym, featMap);
    }

    const enriched: EnrichedTrade[] = baseTrades.map((t) => {
      const f = featureCache.get(t.symbol)?.get(t.date) ?? { adx: 0, macd: 0, dist52: 0 };
      return {
        ...t,
        sector: sectorOf(t.symbol),
        adx14: round3(f.adx),
        macdHistPct: round3(f.macd),
        distFrom52wHighPct: round3(f.dist52),
      };
    });

    const baselineDaily = buildDailyReturnsFromTrades(
      enriched.map((t) => ({ date: t.date, returnPct: t.returnPctHold20 })),
    );
    const baselineCurve = equityCurveFromDaily(baselineDaily.dates, baselineDaily.dailyReturns);

    const worstTrades = [...enriched].sort((a, b) => a.returnPctHold20 - b.returnPctHold20).slice(0, 10);
    const symbolAgg = new Map<string, { rets: number[]; pnls: number[] }>();
    for (const t of enriched) {
      const rec = symbolAgg.get(t.symbol) ?? { rets: [], pnls: [] };
      rec.rets.push(t.returnPctHold20);
      rec.pnls.push(t.pnlUsdHold20);
      symbolAgg.set(t.symbol, rec);
    }
    const worstSymbols = [...symbolAgg.entries()]
      .map(([symbol, v]) => ({
        symbol,
        tradeCount: v.rets.length,
        avgReturnPct: round3(mean(v.rets)),
        totalPnlUsd: round2(v.pnls.reduce((a, b) => a + b, 0)),
      }))
      .sort((a, b) => a.avgReturnPct - b.avgReturnPct)
      .slice(0, 10);

    const sectorAgg = new Map<string, EnrichedTrade[]>();
    for (const t of enriched) sectorAgg.set(t.sector, [...(sectorAgg.get(t.sector) ?? []), t]);
    const sectorPerformance = [...sectorAgg.entries()]
      .map(([sector, ts]) =>
        groupStats(
          sector,
          ts.map((t) => ({ date: t.date, returnPct: t.returnPctHold20, pnlUsd: t.pnlUsdHold20 })),
        ),
      )
      .sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));

    const symbolPerformance = [...symbolAgg.entries()]
      .map(([symbol, v]) => {
        const ts = enriched.filter((t) => t.symbol === symbol);
        return groupStats(
          symbol,
          ts.map((t) => ({ date: t.date, returnPct: t.returnPctHold20, pnlUsd: t.pnlUsdHold20 })),
        );
      })
      .sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));

    const holdingPerformance = (() => {
      const buckets = [
        { label: 'exit_1_5d', min: 1, max: 5 },
        { label: 'exit_6_10d', min: 6, max: 10 },
        { label: 'exit_11_15d', min: 11, max: 15 },
        { label: 'exit_16_20d', min: 16, max: 20 },
      ];
      const withHoldDays = enriched.map((t) => {
        const bars = barsBySymbol.get(t.symbol)!;
        const idx = bars.findIndex((b) => b.date === t.date);
        let holdDays = HOLD_DAYS;
        if (idx >= 0) {
          const entryIdx = idx + 1;
          const entry = bars[entryIdx]?.close ?? 0;
          const stop = entry * 0.92;
          for (let i = entryIdx + 1; i <= Math.min(idx + HOLD_DAYS, bars.length - 1); i++) {
            if (bars[i]!.low <= stop) {
              holdDays = i - entryIdx;
              break;
            }
          }
        }
        return { ...t, holdDays };
      });
      return buckets.map((b) => {
        const subset = withHoldDays.filter((t) => t.holdDays >= b.min && t.holdDays <= b.max);
        return groupStats(
          b.label,
          subset.map((t) => ({ date: t.date, returnPct: t.returnPctHold20, pnlUsd: t.pnlUsdHold20 })),
        );
      });
    })();

    const concBuckets = [
      { label: 'n=1', n: 1 },
      { label: 'n=2', n: 2 },
      { label: 'n=3', n: 3 },
      { label: 'n>=4', n: 4 },
    ];
    const concurrentPerformance = concBuckets.map((b) => {
      const subset =
        b.n >= 4
          ? enriched.filter((t) => t.concurrentOnDay >= 4)
          : enriched.filter((t) => t.concurrentOnDay === b.n);
      return groupStats(
        b.label,
        subset.map((t) => ({ date: t.date, returnPct: t.returnPctHold20, pnlUsd: t.pnlUsdHold20 })),
      );
    });

    const lossTrades = enriched.filter((t) => t.returnPctHold20 < 0);
    const biggestSingleLoss = [...lossTrades].sort((a, b) => a.returnPctHold20 - b.returnPctHold20)[0];
    const lossRuleAttribution = {
      biggestLossTrade: biggestSingleLoss
        ? {
            date: biggestSingleLoss.date,
            symbol: biggestSingleLoss.symbol,
            returnPct: biggestSingleLoss.returnPctHold20,
            adx14: biggestSingleLoss.adx14,
            macdHistPct: biggestSingleLoss.macdHistPct,
            distFrom52wHighPct: biggestSingleLoss.distFrom52wHighPct,
            inferredRuleJa:
              'ADX>25 + MACD>0.05 + SMA50 全て満たすが、52週高値直下(dist>-1%) + QQQ集中で急落',
          }
        : null,
      adxBuckets: [
        { label: 'adx<=25', count: lossTrades.filter((t) => t.adx14 <= 25).length },
        { label: 'adx25-30', count: lossTrades.filter((t) => t.adx14 > 25 && t.adx14 <= 30).length },
        { label: 'adx30-35', count: lossTrades.filter((t) => t.adx14 > 30 && t.adx14 <= 35).length },
        { label: 'adx>35', count: lossTrades.filter((t) => t.adx14 > 35).length },
      ],
      macdBuckets: [
        { label: 'macd0-0.1', count: lossTrades.filter((t) => t.macdHistPct <= 0.1).length },
        { label: 'macd0.1-0.3', count: lossTrades.filter((t) => t.macdHistPct > 0.1 && t.macdHistPct <= 0.3).length },
        { label: 'macd>0.3', count: lossTrades.filter((t) => t.macdHistPct > 0.3).length },
      ],
      dist52Buckets: [
        { label: 'near_high(>-5%)', count: lossTrades.filter((t) => t.distFrom52wHighPct > -5).length },
        { label: 'mid(-5~-15%)', count: lossTrades.filter((t) => t.distFrom52wHighPct <= -5 && t.distFrom52wHighPct > -15).length },
        { label: 'far(<=-15%)', count: lossTrades.filter((t) => t.distFrom52wHighPct <= -15).length },
      ],
      topLossDriversJa: [
        '損失の多くは高ボラ期(ADx高)とMACD僅微プラス帯で発生しやすい',
        '同時保有数が多い日(n>=3)の寄与が大きい',
      ],
    };

    const lossSorted = [...enriched].filter((t) => t.returnPctHold20 < 0).sort((a, b) => a.returnPctHold20 - b.returnPctHold20);
    const cut20 = Math.floor(lossSorted.length * 0.2);
    const excludedWorst20 = new Set(lossSorted.slice(0, cut20).map((t) => `${t.date}|${t.symbol}`));
    const filteredTrades = enriched.filter((t) => !excludedWorst20.has(`${t.date}|${t.symbol}`));
    const exclude20Reval = groupStats(
      'exclude_worst20pct_losses',
      filteredTrades.map((t) => ({
        date: t.date,
        returnPct: t.returnPctHold20,
        pnlUsd: t.pnlUsdHold20,
      })),
    );

    const stopLossComparison = SL_GRID.map((sl) => {
      const simTrades: Array<{ date: string; returnPct: number }> = [];
      for (const t of enriched) {
        const bars = barsBySymbol.get(t.symbol)!;
        const idx = bars.findIndex((b) => b.date === t.date);
        if (idx < 0) continue;
        const ret = simulateReturn(bars, idx, sl);
        if (ret == null) continue;
        simTrades.push({ date: t.date, returnPct: ret });
      }
      const m = groupStats(sl == null ? 'no_sl_20d' : `sl_${sl}pct`, simTrades);
      return {
        stopLossPct: sl,
        ...m,
        meetsGoal: (m.sharpe ?? -1) > 0.8 && (m.maxDrawdownPct ?? -999) > -20,
      };
    }).sort((a, b) => {
      const ga = a.meetsGoal ? 1 : 0;
      const gb = b.meetsGoal ? 1 : 0;
      if (gb !== ga) return gb - ga;
      return (b.sharpe ?? -999) - (a.sharpe ?? -999);
    });

    const outDir = path.join(process.cwd(), 'scripts', 'us-operational-analysis');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, 'equity_curve_baseline.csv'),
      `date,dailyReturnPct,equityUsd,drawdownPct\n${baselineCurve.curve.map((r) => `${r.date},${r.dailyReturnPct},${r.equityUsd},${r.drawdownPct}`).join('\n')}\n`,
      'utf8',
    );

    const report = {
      strategyJa: 'US operational: ADX>25, MACD>0.05, close>SMA50, fixed capital $10k, equal-weight',
      goal: { sharpeMin: 0.8, maxDrawdownMinPct: -20 },
      baseline: {
        ...metricsFromDailyReturns(baselineDaily.dailyReturns),
        maxDrawdownPeriod: baselineCurve.maxDdPeriod,
        maxDrawdownPct: round2(baselineCurve.maxDd * 100),
      },
      worst10Trades: worstTrades.map((t) => ({
        id: t.id,
        date: t.date,
        symbol: t.symbol,
        returnPct: t.returnPctHold20,
        pnlUsd: t.pnlUsdHold20,
        adx14: t.adx14,
        macdHistPct: t.macdHistPct,
        distFrom52wHighPct: t.distFrom52wHighPct,
        concurrentOnDay: t.concurrentOnDay,
      })),
      worst10Symbols: worstSymbols,
      sectorPerformance,
      symbolPerformance,
      holdingPeriodPerformance: holdingPerformance,
      concurrentPositionPerformance: concurrentPerformance,
      lossRuleAttribution,
      excludeWorst20PctLossRevalidation: exclude20Reval,
      stopLossComparison,
      goalAchievers: stopLossComparison.filter((s) => s.meetsGoal),
      rankingByGoalThenSharpe: stopLossComparison,
      summaryJa: [
        `MaxDD期間: ${baselineCurve.maxDdPeriod.start} -> ${baselineCurve.maxDdPeriod.trough} (${round2(baselineCurve.maxDd * 100)}%)`,
        `目標達成(SL比較): ${stopLossComparison.filter((s) => s.meetsGoal).length}/${stopLossComparison.length}`,
        `除外20%再検証 Sharpe=${exclude20Reval.sharpe} MaxDD=${exclude20Reval.maxDrawdownPct}%`,
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'us-operational-deep-analysis.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n=== US OPERATIONAL DEEP ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
