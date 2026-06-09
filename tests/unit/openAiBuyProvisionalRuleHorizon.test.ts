/**
 * buy — 暫定ルール通過案件の延長ホライズン集計（5-60営業日）
 * npx vitest run tests/unit/openAiBuyProvisionalRuleHorizon.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { SAMPLE_STOCKS } from '../../src/data/sampleStocks';
import { toYahooSymbol, type DailyBar, type ProbeSymbol } from '../helpers/buyAction30dAudit';

const RULES = {
  volumeMax: 1.2,
  low52MinPct: 5,
  atrMinPct: 1.5,
  atrMaxPct: 2.5,
  consecutiveBuyMax: 8,
};

const HORIZONS = [5, 10, 20, 30, 40, 60] as const;

type OhlcBar = { date: string; high: number; low: number; close: number };

const MARKET_BY_SYMBOL = Object.fromEntries(
  SAMPLE_STOCKS.map((s) => [s.symbol, s.market as ProbeSymbol['market']]),
) as Record<string, ProbeSymbol['market']>;

function resolveMarket(symbol: string): ProbeSymbol['market'] {
  return MARKET_BY_SYMBOL[symbol] ?? (/^\d+$/.test(symbol) ? 'bursa' : 'us');
}

type FilteredCase = {
  date: string;
  symbol: string;
  volumeSurgeRatio: number;
  pctFrom52wLow: number;
  atrPct: number;
  consecutiveBuyNumber: number;
  returns: Record<(typeof HORIZONS)[number], number | null>;
  maxDrawdownAlongPath: Record<(typeof HORIZONS)[number], number | null>;
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

function forwardReturnPct(bars: DailyBar[], idx: number, horizon: number): number | null {
  if (idx < 0 || idx + horizon >= bars.length) return null;
  const entry = bars[idx + 1]!.close;
  const exit = bars[idx + horizon]!.close;
  if (entry <= 0) return null;
  return Math.round(((exit / entry - 1) * 100) * 10000) / 10000;
}

function pathMaxDrawdownPct(bars: DailyBar[], idx: number, horizon: number): number | null {
  if (idx < 0 || idx + horizon >= bars.length) return null;
  const entry = bars[idx + 1]!.close;
  if (entry <= 0) return null;
  let peak = entry;
  let maxDd = 0;
  for (let i = idx + 1; i <= idx + horizon; i++) {
    const c = bars[i]!.close;
    if (c > peak) peak = c;
    const dd = (c / peak - 1) * 100;
    if (dd < maxDd) maxDd = dd;
  }
  return Math.round(maxDd * 100) / 100;
}

function horizonStats(cases: FilteredCase[], h: (typeof HORIZONS)[number]) {
  const rets = cases.map((c) => c.returns[h]).filter((v): v is number => v != null);
  const dds = cases.map((c) => c.maxDrawdownAlongPath[h]).filter((v): v is number => v != null);
  return {
    countWithReturn: rets.length,
    avgPct: mean(rets),
    medianPct: median(rets),
    winRatePct: winRatePct(rets),
    sharpe: sharpeRatio(rets),
    maxProfitPct: rets.length ? Math.round(Math.max(...rets) * 100) / 100 : null,
    maxDrawdownPct: dds.length ? Math.round(Math.min(...dds) * 100) / 100 : null,
    worstReturnPct: rets.length ? Math.round(Math.min(...rets) * 100) / 100 : null,
    avgPathMaxDrawdownPct: mean(dds),
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

function pctFrom52wLowAt(bars: OhlcBar[], idx: number, lookback = 252): number | null {
  const start = Math.max(0, idx - lookback + 1);
  const window = bars.slice(start, idx + 1);
  if (window.length < 20) return null;
  const low52 = Math.min(...window.map((b) => b.low));
  if (low52 <= 0) return null;
  return Math.round((bars[idx]!.close / low52 - 1) * 10000) / 100;
}

describe('buy provisional rule extended horizons', () => {
  it(
    'writes filtered cases horizon JSON',
    async () => {
      const obs = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
      ) as Array<{
        date: string;
        symbol: string;
        openAiAction: string;
        return5d: number | null;
        return10d: number | null;
        return20d: number | null;
      }>;
      const obsReturnMap = new Map(
        obs.map((o) => [`${o.date}|${o.symbol}`, o] as const),
      );
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
      const filtered: FilteredCase[] = [];

      for (const o of buys) {
        const vol = volMap.get(`${o.date}|${o.symbol}`);
        if (vol == null || vol >= RULES.volumeMax) continue;
        const consec = consecMap.get(`${o.date}|${o.symbol}`)!;
        if (consec > RULES.consecutiveBuyMax) continue;

        const yahoo = toYahooSymbol(o.symbol, resolveMarket(o.symbol));
        if (!ohlcCache.has(yahoo)) ohlcCache.set(yahoo, await fetchYahooOhlcv(yahoo));
        const ohlc = ohlcCache.get(yahoo)!;
        const daily: DailyBar[] = ohlc.map((b) => ({ date: b.date, close: b.close }));
        const idx = daily.findIndex((b) => b.date === o.date);
        if (idx < 0) continue;

        const ohlcIdx = idx;

        const pctLow = pctFrom52wLowAt(ohlc, ohlcIdx);
        const atrPct = computeAtrPctAt(ohlc, ohlcIdx);
        if (pctLow == null || atrPct == null) continue;
        if (pctLow < RULES.low52MinPct) continue;
        if (atrPct < RULES.atrMinPct || atrPct >= RULES.atrMaxPct) continue;

        const obsRow = obsReturnMap.get(`${o.date}|${o.symbol}`);
        const returns = {} as FilteredCase['returns'];
        const maxDrawdownAlongPath = {} as FilteredCase['maxDrawdownAlongPath'];
        for (const h of HORIZONS) {
          if (h === 5 && obsRow?.return5d != null) returns[h] = Math.round(obsRow.return5d * 10000) / 10000;
          else if (h === 10 && obsRow?.return10d != null) returns[h] = Math.round(obsRow.return10d * 10000) / 10000;
          else if (h === 20 && obsRow?.return20d != null) returns[h] = Math.round(obsRow.return20d * 10000) / 10000;
          else returns[h] = forwardReturnPct(daily, idx, h);
          maxDrawdownAlongPath[h] = pathMaxDrawdownPct(daily, idx, h);
        }

        filtered.push({
          date: o.date,
          symbol: o.symbol,
          volumeSurgeRatio: vol,
          pctFrom52wLow: pctLow,
          atrPct,
          consecutiveBuyNumber: consec,
          returns,
          maxDrawdownAlongPath,
        });
      }

      const horizonSummary = Object.fromEntries(HORIZONS.map((h) => [`${h}d`, horizonStats(filtered, h)]));

      const report = {
        methodologyJa: {
          scope: 'OpenAI buy・暫定ルール通過案件のみ',
          provisionalRules: {
            volumeSurgeRatio: `< ${RULES.volumeMax}`,
            pctFrom52wLow: `>= ${RULES.low52MinPct}%`,
            atrPct: `${RULES.atrMinPct}% <= ATR < ${RULES.atrMaxPct}%`,
            consecutiveBuy: `<= ${RULES.consecutiveBuyMax}回（銘柄内通算）`,
          },
          returnDefinition: 'シグナル翌営業日終値エントリー→N営業日後終値（5/10/20dは304観測JSON、30-60dはYahoo 2y）',
          yahooSymbol: '1023.KL（Bursa Malaysia・CIMB）',
          dataCutoffJa: 'Yahoo 1023.KL 最終足: 2026-05-29。30/40/60営業日後は未到来のため null',
          symbolNoteJa:
            '銘柄1023はBursa Malaysia。過去分析で1023.HKを誤用していた場合、52週安値距離が過小評価され件数が6件に見えていた',
          maxDrawdown: 'ホールド期間中の終値ピーク比最大下落（各案件）',
          maxProfit: '当該ホライズンの終値リターン最大値',
        },
        filteredCount: filtered.length,
        filteredCases: filtered,
        horizonSummary,
        insightJa: [
          `暫定ルール通過: ${filtered.length}件（1023.KL・2026-04-21〜04-30）`,
          `10d平均: ${horizonSummary['10d']?.avgPct}%・勝率${horizonSummary['10d']?.winRatePct}% (n=${horizonSummary['10d']?.countWithReturn})`,
          `20d平均: ${horizonSummary['20d']?.avgPct}%・勝率${horizonSummary['20d']?.winRatePct}% (n=${horizonSummary['20d']?.countWithReturn})`,
          '30/40/60d: Yahoo最終足2026-05-29時点で未確定',
        ].filter(Boolean),
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-buy-provisional-rule-horizons.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== PROVISIONAL RULE HORIZONS ===\n', JSON.stringify(report, null, 2));
    },
    120_000,
  );
});
