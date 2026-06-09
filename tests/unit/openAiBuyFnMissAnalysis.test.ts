/**
 * buy FN=2 — ルール取り逃し案件の特定・条件分解
 * npx vitest run tests/unit/openAiBuyFnMissAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { SAMPLE_STOCKS } from '../../src/data/sampleStocks';
import { toYahooSymbol, type DailyBar, type ProbeSymbol } from '../helpers/buyAction30dAudit';

const RULE = {
  volumeMax: 1.2,
  atrMinPct: 1.5,
  atrMaxPct: 2.5,
  consecutiveBuyMax: 8,
  takeProfitPct: 4,
  stopLossPct: -3,
  maxHoldOffset: 20,
};

type OhlcBar = { date: string; high: number; low: number; close: number };

const MARKET_BY_SYMBOL = Object.fromEntries(
  SAMPLE_STOCKS.map((s) => [s.symbol, s.market as ProbeSymbol['market']]),
) as Record<string, ProbeSymbol['market']>;

function resolveMarket(symbol: string): ProbeSymbol['market'] {
  return MARKET_BY_SYMBOL[symbol] ?? (/^\d+$/.test(symbol) ? 'bursa' : 'us');
}

function failReasons(vol: number | null, atr: number | null, consec: number) {
  const reasons: string[] = [];
  if (vol == null) reasons.push('出来高:データ欠損');
  else if (vol >= RULE.volumeMax) reasons.push(`出来高:${vol}>=${RULE.volumeMax}`);
  if (atr == null) reasons.push('ATR:データ欠損');
  else if (atr < RULE.atrMinPct) reasons.push(`ATR:${atr}%<${RULE.atrMinPct}%`);
  else if (atr >= RULE.atrMaxPct) reasons.push(`ATR:${atr}%>=${RULE.atrMaxPct}%`);
  if (consec > RULE.consecutiveBuyMax) reasons.push(`連続buy:${consec}>${RULE.consecutiveBuyMax}`);
  return {
    volumeFail: vol == null || vol >= RULE.volumeMax,
    atrFail: atr == null || atr < RULE.atrMinPct || atr >= RULE.atrMaxPct,
    consecutiveBuyFail: consec > RULE.consecutiveBuyMax,
    reasons,
    primaryCause:
      vol != null && vol >= RULE.volumeMax
        ? 'volume'
        : atr != null && (atr < RULE.atrMinPct || atr >= RULE.atrMaxPct)
          ? 'atr'
          : consec > RULE.consecutiveBuyMax
            ? 'consecutiveBuy'
            : vol == null
              ? 'volume'
              : atr == null
                ? 'atr'
                : 'unknown',
  };
}

function forwardReturnPct(bars: DailyBar[], idx: number, day: number): number | null {
  if (idx < 0 || idx + day >= bars.length) return null;
  const entry = bars[idx + 1]!.close;
  const exit = bars[idx + day]!.close;
  if (entry <= 0) return null;
  return Math.round(((exit / entry - 1) * 100) * 10000) / 10000;
}

function simulateTpSl(ohlc: OhlcBar[], daily: DailyBar[], signalIdx: number): number | null {
  const entryIdx = signalIdx + 1;
  if (entryIdx >= daily.length) return null;
  const entry = daily[entryIdx]!.close;
  if (entry <= 0) return null;
  const stopPrice = entry * (1 + RULE.stopLossPct / 100);
  const targetPrice = entry * (1 + RULE.takeProfitPct / 100);
  const lastIdx = Math.min(signalIdx + RULE.maxHoldOffset, daily.length - 1);
  if (lastIdx <= entryIdx) return null;
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = ohlc[i]!;
    if (bar.low <= stopPrice) return RULE.stopLossPct;
    if (bar.high >= targetPrice) return RULE.takeProfitPct;
  }
  return Math.round(((daily[lastIdx]!.close / entry - 1) * 100) * 10000) / 10000;
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

describe('buy FN miss analysis', () => {
  it('writes FN=2 detail JSON', async () => {
    const obs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Array<{
      date: string;
      symbol: string;
      openAiAction: string;
      return10d: number | null;
      return20d: number | null;
    }>;
    const reg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
    ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
    const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

    const consecByKey = new Map<string, number>();
    const bySym = new Map<string, typeof obs>();
    for (const o of obs) {
      if (!bySym.has(o.symbol)) bySym.set(o.symbol, []);
      bySym.get(o.symbol)!.push(o);
    }
    for (const [sym, list] of bySym) {
      list.sort((a, b) => a.date.localeCompare(b.date));
      let streak = 0;
      for (const row of list) {
        if (row.openAiAction === 'buy') {
          streak += 1;
          consecByKey.set(`${row.date}|${sym}`, streak);
        } else {
          streak = 0;
          consecByKey.set(`${row.date}|${sym}`, 0);
        }
      }
    }

    const ohlcCache = new Map<string, OhlcBar[]>();
    const fnRows: Array<Record<string, unknown>> = [];

    for (const o of obs.filter((x) => x.openAiAction === 'buy')) {
      const vol = volMap.get(`${o.date}|${o.symbol}`) ?? null;
      const consec = consecByKey.get(`${o.date}|${o.symbol}`) ?? 0;
      const yahoo = toYahooSymbol(o.symbol, resolveMarket(o.symbol));
      if (!ohlcCache.has(yahoo)) ohlcCache.set(yahoo, await fetchYahooOhlcv(yahoo));
      const ohlc = ohlcCache.get(yahoo)!;
      const daily: DailyBar[] = ohlc.map((b) => ({ date: b.date, close: b.close }));
      const idx = daily.findIndex((b) => b.date === o.date);
      const atrPct = idx >= 0 ? computeAtrPctAt(ohlc, idx) : null;
      const fail = failReasons(vol, atrPct, consec);
      const rulePasses = !fail.volumeFail && !fail.atrFail && !fail.consecutiveBuyFail;
      const simReturn = idx >= 0 ? simulateTpSl(ohlc, daily, idx) : null;
      const actualWin = simReturn != null && simReturn > 0;

      if (!rulePasses && actualWin) {
        fnRows.push({
          date: o.date,
          symbol: o.symbol,
          volumeSurgeRatio: vol,
          atrPct,
          consecutiveBuyNumber: consec,
          return10d: o.return10d,
          return20d: o.return20d,
          return10dYahoo: idx >= 0 ? forwardReturnPct(daily, idx, 10) : null,
          return20dYahoo: idx >= 0 ? forwardReturnPct(daily, idx, 20) : null,
          tpSlReturnPct: simReturn,
          ruleDropAnalysis: fail,
        });
      }
    }

    const breakdown = {
      volumeOnly: fnRows.filter((r) => {
        const a = r.ruleDropAnalysis as { volumeFail: boolean; atrFail: boolean; consecutiveBuyFail: boolean };
        return a.volumeFail && !a.atrFail && !a.consecutiveBuyFail;
      }).length,
      atrOnly: fnRows.filter((r) => {
        const a = r.ruleDropAnalysis as { volumeFail: boolean; atrFail: boolean; consecutiveBuyFail: boolean };
        return !a.volumeFail && a.atrFail && !a.consecutiveBuyFail;
      }).length,
      consecutiveBuyOnly: fnRows.filter((r) => {
        const a = r.ruleDropAnalysis as { volumeFail: boolean; atrFail: boolean; consecutiveBuyFail: boolean };
        return !a.volumeFail && !a.atrFail && a.consecutiveBuyFail;
      }).length,
      multiple: fnRows.filter((r) => {
        const a = r.ruleDropAnalysis as { volumeFail: boolean; atrFail: boolean; consecutiveBuyFail: boolean };
        return [a.volumeFail, a.atrFail, a.consecutiveBuyFail].filter(Boolean).length > 1;
      }).length,
    };

    const report = {
      methodologyJa: {
        fnDefinition: 'OpenAI buy・ルール不通過・+4%TP/-3%SLシミュレーションで勝ち（actualWin）',
        rule: RULE,
      },
      fnCount: fnRows.length,
      fnCases: fnRows,
      ruleDropBreakdown: breakdown,
      insightJa: fnRows.map(
        (r) =>
          `${r.date} ${r.symbol}: 主因=${(r.ruleDropAnalysis as { primaryCause: string }).primaryCause} (${(r.ruleDropAnalysis as { reasons: string[] }).reasons.join(', ')})`,
      ),
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-buy-fn-miss-analysis.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== FN MISS ===\n', JSON.stringify(report, null, 2));
  });
});
