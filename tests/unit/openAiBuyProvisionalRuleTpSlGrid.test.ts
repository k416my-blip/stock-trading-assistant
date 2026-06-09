/**
 * buy — 暫定ルール通過案件の TP+SL 同時適用（+3〜+6% × -3%損切り）
 * npx vitest run tests/unit/openAiBuyProvisionalRuleTpSlGrid.test.ts
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

const STOP_LOSS_PCT = -3;
const MAX_HOLD_OFFSET = 20;
const TAKE_PROFIT_LEVELS = [3, 4, 5, 6] as const;

type OhlcBar = { date: string; high: number; low: number; close: number };

const MARKET_BY_SYMBOL = Object.fromEntries(
  SAMPLE_STOCKS.map((s) => [s.symbol, s.market as ProbeSymbol['market']]),
) as Record<string, ProbeSymbol['market']>;

function resolveMarket(symbol: string): ProbeSymbol['market'] {
  return MARKET_BY_SYMBOL[symbol] ?? (/^\d+$/.test(symbol) ? 'bursa' : 'us');
}

type TradeSim = {
  date: string;
  symbol: string;
  takeProfitPct: number;
  returnPct: number;
  holdDays: number;
  exitReason: 'takeProfit' | 'stopLoss' | 'maxHold';
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

function simulateTpSl(
  ohlc: OhlcBar[],
  daily: DailyBar[],
  signalIdx: number,
  takeProfitPct: number,
): TradeSim | null {
  const entryIdx = signalIdx + 1;
  if (entryIdx >= daily.length) return null;
  const entry = daily[entryIdx]!.close;
  if (entry <= 0) return null;

  const stopPrice = entry * (1 + STOP_LOSS_PCT / 100);
  const targetPrice = entry * (1 + takeProfitPct / 100);
  const lastIdx = Math.min(signalIdx + MAX_HOLD_OFFSET, daily.length - 1);
  if (lastIdx <= entryIdx) return null;

  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = ohlc[i]!;
    if (bar.low <= stopPrice) {
      return {
        date: daily[signalIdx]!.date,
        symbol: '',
        takeProfitPct,
        returnPct: STOP_LOSS_PCT,
        holdDays: i - entryIdx,
        exitReason: 'stopLoss',
        maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, i, entry),
      };
    }
    if (bar.high >= targetPrice) {
      return {
        date: daily[signalIdx]!.date,
        symbol: '',
        takeProfitPct,
        returnPct: takeProfitPct,
        holdDays: i - entryIdx,
        exitReason: 'takeProfit',
        maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, i, entry),
      };
    }
  }

  const exitIdx = lastIdx;
  const exit = daily[exitIdx]!.close;
  return {
    date: daily[signalIdx]!.date,
    symbol: '',
    takeProfitPct,
    returnPct: Math.round(((exit / entry - 1) * 100) * 10000) / 10000,
    holdDays: exitIdx - entryIdx,
    exitReason: 'maxHold',
    maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, exitIdx, entry),
  };
}

function summarize(trades: TradeSim[]) {
  const rets = trades.map((t) => t.returnPct);
  const dds = trades.map((t) => t.maxDrawdownPct);
  return {
    count: trades.length,
    avgPct: mean(rets),
    medianPct: median(rets),
    winRatePct: winRatePct(rets),
    sharpe: sharpeRatio(rets),
    maxDrawdownPct: dds.length ? Math.round(Math.min(...dds) * 100) / 100 : null,
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
    exitReasonBreakdown: {
      takeProfit: trades.filter((t) => t.exitReason === 'takeProfit').length,
      stopLoss: trades.filter((t) => t.exitReason === 'stopLoss').length,
      maxHold: trades.filter((t) => t.exitReason === 'maxHold').length,
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

describe('buy provisional rule TP+SL grid', () => {
  it(
    'writes +3〜+6% TP with -3% SL comparison JSON',
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
      type Sig = {
        date: string;
        symbol: string;
        signalIdx: number;
        ohlc: OhlcBar[];
        daily: DailyBar[];
      };
      const filtered: Sig[] = [];

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

        filtered.push({ date: o.date, symbol: o.symbol, signalIdx, ohlc, daily });
      }

      const byTp = TAKE_PROFIT_LEVELS.map((tp) => {
        const trades: TradeSim[] = [];
        for (const sig of filtered) {
          const sim = simulateTpSl(sig.ohlc, sig.daily, sig.signalIdx, tp);
          if (!sim) continue;
          trades.push({ ...sim, date: sig.date, symbol: sig.symbol });
        }
        return {
          takeProfitPct: tp,
          labelJa: `+${tp}%利確 & -3%損切り`,
          ...summarize(trades),
          trades,
        };
      });

      const rankedByAvg = [...byTp].sort((a, b) => (b.avgPct ?? -999) - (a.avgPct ?? -999));
      const best = rankedByAvg[0]!;

      const expectancyCurve = byTp.map((row) => ({
        takeProfitPct: row.takeProfitPct,
        avgPct: row.avgPct,
        medianPct: row.medianPct,
        winRatePct: row.winRatePct,
        sharpe: row.sharpe,
        takeProfitHitRatePct:
          row.count > 0
            ? Math.round((row.exitReasonBreakdown.takeProfit / row.count) * 1000) / 10
            : null,
      }));

      const report = {
        methodologyJa: {
          scope: 'OpenAI buy・暫定ルール通過案件のみ',
          provisionalRules: {
            volumeSurgeRatio: `< ${RULES.volumeMax}`,
            atrPct: `${RULES.atrMinPct}% <= ATR < ${RULES.atrMaxPct}%`,
            consecutiveBuy: `<= ${RULES.consecutiveBuyMax}回（銘柄内通算）`,
          },
          entry: 'シグナル翌営業日(idx+1)終値',
          rules: '各営業日: 安値が-3%到達→損切り（同日高値が利確目標でも損切り優先）、高値が利確目標到達→利確、未達は最大20営業日後終値',
          maxDrawdown: '保有期間中の終値ピーク比最大下落（各案件の最悪値）',
          sharpe: 'mean/std（取引単位、n≥2）',
        },
        filteredCount: filtered.length,
        comparison: byTp.map(({ trades: _t, ...rest }) => rest),
        expectancyCurve,
        optimalTakeProfit: {
          takeProfitPct: best.takeProfitPct,
          labelJa: best.labelJa,
          avgPct: best.avgPct,
          reasonJa: `+3〜+6%の中で平均リターン最大は+${best.takeProfitPct}%（${best.avgPct}%）`,
        },
        insightJa: [
          `暫定ルール通過: ${filtered.length}件`,
          `期待値最大: +${best.takeProfitPct}%利確+損切り（平均${best.avgPct}%・勝率${best.winRatePct}%）`,
          ...rankedByAvg.map(
            (r) =>
              `+${r.takeProfitPct}%: 平均${r.avgPct}% / 利確${r.exitReasonBreakdown.takeProfit}件 / 損切${r.exitReasonBreakdown.stopLoss}件 / 期限${r.exitReasonBreakdown.maxHold}件`,
          ),
        ],
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-buy-provisional-rule-tp-sl-grid.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== TP+SL GRID ===\n', JSON.stringify(report, null, 2));
    },
    120_000,
  );
});
