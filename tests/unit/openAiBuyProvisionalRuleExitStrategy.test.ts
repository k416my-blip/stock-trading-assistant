/**
 * buy — 暫定ルール通過案件の出口戦略比較（固定9日 / TP / SL）
 * npx vitest run tests/unit/openAiBuyProvisionalRuleExitStrategy.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { SAMPLE_STOCKS } from '../../src/data/sampleStocks';
import { toYahooSymbol, type DailyBar, type ProbeSymbol } from '../helpers/buyAction30dAudit';

const RULES = {
  volumeMax: 1.2,
  atrMinPct: 1.5,
  atrMaxPct: 2.5,
  consecutiveBuyMax: 8,
};

const MAX_HOLD_OFFSET = 20;

type OhlcBar = { date: string; high: number; low: number; close: number };

type StrategyId = 'fixed_9d' | 'tp_1pct' | 'tp_2pct' | 'tp_3pct' | 'sl_3pct';

type StrategyDef = {
  id: StrategyId;
  labelJa: string;
  kind: 'fixed' | 'takeProfit' | 'stopLoss';
  day?: number;
  targetPct?: number;
};

const STRATEGIES: StrategyDef[] = [
  { id: 'fixed_9d', labelJa: '9営業日固定決済', kind: 'fixed', day: 9 },
  { id: 'tp_1pct', labelJa: '+1%到達で利確', kind: 'takeProfit', targetPct: 1 },
  { id: 'tp_2pct', labelJa: '+2%到達で利確', kind: 'takeProfit', targetPct: 2 },
  { id: 'tp_3pct', labelJa: '+3%到達で利確', kind: 'takeProfit', targetPct: 3 },
  { id: 'sl_3pct', labelJa: '-3%損切り', kind: 'stopLoss', targetPct: -3 },
];

const MARKET_BY_SYMBOL = Object.fromEntries(
  SAMPLE_STOCKS.map((s) => [s.symbol, s.market as ProbeSymbol['market']]),
) as Record<string, ProbeSymbol['market']>;

function resolveMarket(symbol: string): ProbeSymbol['market'] {
  return MARKET_BY_SYMBOL[symbol] ?? (/^\d+$/.test(symbol) ? 'bursa' : 'us');
}

type TradeSim = {
  date: string;
  symbol: string;
  strategyId: StrategyId;
  returnPct: number;
  holdDays: number;
  exitReason: 'fixed' | 'takeProfit' | 'stopLoss' | 'maxHold';
  maxDrawdownPct: number;
};

function median(vals: number[]): number | null {
  if (vals.length === 0) return null;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round(((s[m - 1]! + s[m]!) / 2) * 100) / 100 : Math.round(s[m]! * 100) / 100;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function sampleStd(vals: number[]): number | null {
  if (vals.length < 2) return null;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / (vals.length - 1));
}

function sharpeRatio(vals: number[]): number | null {
  if (vals.length < 2) return null;
  const m = mean(vals)!;
  const sd = sampleStd(vals);
  if (sd == null || sd === 0) return null;
  return Math.round((m / sd) * 1000) / 1000;
}

function winRatePct(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.filter((v) => v > 0).length / vals.length) * 1000) / 10;
}

function pathMaxDrawdownPct(bars: DailyBar[], entryIdx: number, exitIdx: number, entry: number): number {
  let peak = entry;
  let maxDd = 0;
  for (let i = entryIdx; i <= exitIdx; i++) {
    const c = bars[i]!.close;
    if (c > peak) peak = c;
    const dd = (c / peak - 1) * 100;
    if (dd < maxDd) maxDd = dd;
  }
  return Math.round(maxDd * 100) / 100;
}

function simulateStrategy(
  ohlc: OhlcBar[],
  daily: DailyBar[],
  signalIdx: number,
  strategy: StrategyDef,
): TradeSim | null {
  const entryIdx = signalIdx + 1;
  if (entryIdx >= daily.length) return null;
  const entry = daily[entryIdx]!.close;
  if (entry <= 0) return null;

  if (strategy.kind === 'fixed') {
    const exitIdx = signalIdx + strategy.day!;
    if (exitIdx >= daily.length) return null;
    const exit = daily[exitIdx]!.close;
    return {
      date: daily[signalIdx]!.date,
      symbol: '',
      strategyId: strategy.id,
      returnPct: Math.round(((exit / entry - 1) * 100) * 10000) / 10000,
      holdDays: exitIdx - entryIdx,
      exitReason: 'fixed',
      maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, exitIdx, entry),
    };
  }

  const lastIdx = Math.min(signalIdx + MAX_HOLD_OFFSET, daily.length - 1);
  if (lastIdx <= entryIdx) return null;

  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = ohlc[i]!;
    if (strategy.kind === 'takeProfit') {
      const target = entry * (1 + strategy.targetPct! / 100);
      if (bar.high >= target) {
        return {
          date: daily[signalIdx]!.date,
          symbol: '',
          strategyId: strategy.id,
          returnPct: strategy.targetPct!,
          holdDays: i - entryIdx,
          exitReason: 'takeProfit',
          maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, i, entry),
        };
      }
    }
    if (strategy.kind === 'stopLoss') {
      const stop = entry * (1 + strategy.targetPct! / 100);
      if (bar.low <= stop) {
        return {
          date: daily[signalIdx]!.date,
          symbol: '',
          strategyId: strategy.id,
          returnPct: strategy.targetPct!,
          holdDays: i - entryIdx,
          exitReason: 'stopLoss',
          maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, i, entry),
        };
      }
    }
  }

  const exitIdx = lastIdx;
  const exit = daily[exitIdx]!.close;
  return {
    date: daily[signalIdx]!.date,
    symbol: '',
    strategyId: strategy.id,
    returnPct: Math.round(((exit / entry - 1) * 100) * 10000) / 10000,
    holdDays: exitIdx - entryIdx,
    exitReason: 'maxHold',
    maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, exitIdx, entry),
  };
}

function summarizeStrategy(trades: TradeSim[]) {
  const rets = trades.map((t) => t.returnPct);
  const dds = trades.map((t) => t.maxDrawdownPct);
  return {
    count: trades.length,
    avgPct: mean(rets),
    medianPct: median(rets),
    winRatePct: winRatePct(rets),
    sharpe: sharpeRatio(rets),
    maxDrawdownPct: dds.length ? Math.round(Math.min(...dds) * 100) / 100 : null,
    avgPathMaxDrawdownPct: mean(dds),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
    exitReasonBreakdown: {
      takeProfit: trades.filter((t) => t.exitReason === 'takeProfit').length,
      stopLoss: trades.filter((t) => t.exitReason === 'stopLoss').length,
      maxHold: trades.filter((t) => t.exitReason === 'maxHold').length,
      fixed: trades.filter((t) => t.exitReason === 'fixed').length,
    },
  };
}

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2y`;
  const res = await fetch(url, { headers: { 'User-Agent': 'stock-trading-assistant-audit/1.0' } });
  if (!res.ok) throw new Error(`Yahoo ${yahooSymbol} HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{ high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }>;
        };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const bars: OhlcBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const h = q?.high?.[i];
    const l = q?.low?.[i];
    const c = q?.close?.[i];
    if (h == null || l == null || c == null || !Number.isFinite(c)) continue;
    bars.push({
      date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
      high: h,
      low: l,
      close: c,
    });
  }
  return bars;
}

function computeAtrPctAt(bars: OhlcBar[], idx: number, period = 14): number | null {
  if (idx < period) return null;
  const trs: number[] = [];
  for (let i = idx - period + 1; i <= idx; i++) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const pc = bars[i - 1]!.close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atr = trs.reduce((a, b) => a + b, 0) / period;
  const close = bars[idx]!.close;
  if (close <= 0) return null;
  return Math.round((atr / close) * 10000) / 100;
}

describe('buy provisional rule exit strategy comparison', () => {
  it(
    'writes exit strategy comparison JSON',
    async () => {
      const obs = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
      ) as Array<{ date: string; symbol: string; openAiAction: string }>;
      const reg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
      ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
      const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

      const buys = obs.filter((o) => o.openAiAction === 'buy').sort((a, b) => a.date.localeCompare(b.date));
      const consecMap = new Map<string, number>();
      const bySym = new Map<string, typeof buys>();
      for (const b of buys) {
        if (!bySym.has(b.symbol)) bySym.set(b.symbol, []);
        bySym.get(b.symbol)!.push(b);
      }
      for (const [sym, list] of bySym) {
        list.sort((a, b) => a.date.localeCompare(b.date));
        list.forEach((b, i) => consecMap.set(`${b.date}|${sym}`, i + 1));
      }

      const ohlcCache = new Map<string, OhlcBar[]>();
      type FilteredSignal = { date: string; symbol: string; volumeSurgeRatio: number; atrPct: number; consecutiveBuyNumber: number; signalIdx: number; ohlc: OhlcBar[]; daily: DailyBar[] };
      const filtered: FilteredSignal[] = [];

      for (const o of buys) {
        const vol = volMap.get(`${o.date}|${o.symbol}`);
        if (vol == null || vol >= RULES.volumeMax) continue;
        const consec = consecMap.get(`${o.date}|${o.symbol}`)!;
        if (consec > RULES.consecutiveBuyMax) continue;

        const yahoo = toYahooSymbol(o.symbol, resolveMarket(o.symbol));
        if (!ohlcCache.has(yahoo)) ohlcCache.set(yahoo, await fetchYahooOhlcv(yahoo));
        const ohlc = ohlcCache.get(yahoo)!;
        const daily: DailyBar[] = ohlc.map((b) => ({ date: b.date, close: b.close }));
        const signalIdx = daily.findIndex((b) => b.date === o.date);
        if (signalIdx < 0) continue;

        const atrPct = computeAtrPctAt(ohlc, signalIdx);
        if (atrPct == null) continue;
        if (atrPct < RULES.atrMinPct || atrPct >= RULES.atrMaxPct) continue;

        filtered.push({
          date: o.date,
          symbol: o.symbol,
          volumeSurgeRatio: vol,
          atrPct,
          consecutiveBuyNumber: consec,
          signalIdx,
          ohlc,
          daily,
        });
      }

      const tradesByStrategy = Object.fromEntries(
        STRATEGIES.map((s) => [s.id, [] as TradeSim[]]),
      ) as Record<StrategyId, TradeSim[]>;

      for (const sig of filtered) {
        for (const strategy of STRATEGIES) {
          const sim = simulateStrategy(sig.ohlc, sig.daily, sig.signalIdx, strategy);
          if (!sim) continue;
          tradesByStrategy[strategy.id].push({ ...sim, date: sig.date, symbol: sig.symbol });
        }
      }

      const strategyComparison = STRATEGIES.map((s) => ({
        id: s.id,
        labelJa: s.labelJa,
        ...summarizeStrategy(tradesByStrategy[s.id]),
        trades: tradesByStrategy[s.id],
      }));

      const rankedByAvg = [...strategyComparison].sort((a, b) => (b.avgPct ?? -999) - (a.avgPct ?? -999));
      const rankedBySharpe = [...strategyComparison].sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));
      const best = rankedByAvg[0]!;

      const report = {
        methodologyJa: {
          scope: 'OpenAI buy・暫定ルール通過案件のみ',
          provisionalRules: {
            volumeSurgeRatio: `< ${RULES.volumeMax}`,
            atrPct: `${RULES.atrMinPct}% <= ATR < ${RULES.atrMaxPct}%`,
            consecutiveBuy: `<= ${RULES.consecutiveBuyMax}回（銘柄内通算）`,
          },
          entry: 'シグナル翌営業日(idx+1)終値',
          fixedExit: 'シグナルから9営業日後(idx+9)終値',
          takeProfit: '日中高値が目標到達で指値約定（+1/+2/+3%）',
          stopLoss: '日中安値が-3%到達で損切り約定',
          conditionalMaxHold: `利確/損切り未達時は最大${MAX_HOLD_OFFSET}営業日後(idx+${MAX_HOLD_OFFSET})終値で決済`,
          maxDrawdown: '保有期間中の終値ピーク比最大下落（各案件）',
          sharpe: 'mean/std（取引単位、n≥2）',
        },
        filteredCount: filtered.length,
        strategyComparison,
        ranking: {
          byAvgReturn: rankedByAvg.map((s) => ({ id: s.id, labelJa: s.labelJa, avgPct: s.avgPct })),
          bySharpe: rankedBySharpe.map((s) => ({ id: s.id, labelJa: s.labelJa, sharpe: s.sharpe })),
        },
        bestExpectancy: {
          strategyId: best.id,
          labelJa: best.labelJa,
          avgPct: best.avgPct,
          sharpe: best.sharpe,
          reasonJa: `平均リターン${best.avgPct}%で最高（Sharpe ${best.sharpe}）`,
        },
        insightJa: [
          `暫定ルール通過: ${filtered.length}件`,
          `期待値最高: ${best.labelJa}（平均${best.avgPct}%・Sharpe${best.sharpe}）`,
          `2位: ${rankedByAvg[1]?.labelJa}（平均${rankedByAvg[1]?.avgPct}%）`,
        ],
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-buy-provisional-rule-exit-strategies.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== EXIT STRATEGY COMPARISON ===\n', JSON.stringify(report, null, 2));
    },
    120_000,
  );
});
