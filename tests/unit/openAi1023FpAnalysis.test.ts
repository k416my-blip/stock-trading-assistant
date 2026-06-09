/**
 * 1023.KL — ルール通過10件の FP=2 特定・TP8件との特徴量比較
 * npx vitest run tests/unit/openAi1023FpAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const SYMBOL = '1023';
const YAHOO = '1023.KL';

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
type DailyBar = { date: string; close: number };

type CaseRow = {
  date: string;
  symbol: string;
  outcome: 'TP' | 'FP';
  volumeSurgeRatio: number;
  atrPct: number;
  consecutiveBuyNumber: number;
  return5d: number | null;
  return10d: number | null;
  return20d: number | null;
  tpSlReturnPct: number;
  exitReason: 'takeProfit' | 'stopLoss' | 'maxHold';
  rsi14: number;
  pctFrom52wLow: number;
  prevDayChangePct: number;
};

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function compareMetric(label: string, tpVals: number[], fpVals: number[]) {
  return {
    metric: label,
    tpAvg: mean(tpVals),
    fpAvg: mean(fpVals),
    tpMin: tpVals.length ? Math.min(...tpVals) : null,
    tpMax: tpVals.length ? Math.max(...tpVals) : null,
    fpMin: fpVals.length ? Math.min(...fpVals) : null,
    fpMax: fpVals.length ? Math.max(...fpVals) : null,
    deltaFpMinusTp:
      mean(fpVals) != null && mean(tpVals) != null
        ? Math.round((mean(fpVals)! - mean(tpVals)!) * 100) / 100
        : null,
  };
}

function forwardReturnPct(bars: DailyBar[], idx: number, day: number): number | null {
  if (idx < 0 || idx + day >= bars.length) return null;
  const entry = bars[idx + 1]!.close;
  const exit = bars[idx + day]!.close;
  if (entry <= 0) return null;
  return Math.round(((exit / entry - 1) * 100) * 10000) / 10000;
}

function simulateTpSl(
  ohlc: OhlcBar[],
  daily: DailyBar[],
  signalIdx: number,
): { returnPct: number; exitReason: 'takeProfit' | 'stopLoss' | 'maxHold' } | null {
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
    if (bar.low <= stopPrice) return { returnPct: RULE.stopLossPct, exitReason: 'stopLoss' };
    if (bar.high >= targetPrice) return { returnPct: RULE.takeProfitPct, exitReason: 'takeProfit' };
  }
  const exit = daily[lastIdx]!.close;
  return {
    returnPct: Math.round(((exit / entry - 1) * 100) * 10000) / 10000,
    exitReason: 'maxHold',
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

function prevDayChangePct(bars: OhlcBar[], idx: number): number | null {
  if (idx < 1) return null;
  const prev = bars[idx - 1]!.close;
  const cur = bars[idx]!.close;
  if (prev <= 0) return null;
  return Math.round(((cur / prev - 1) * 100) * 100) / 100;
}

function passesRule(vol: number | null, atr: number | null, consec: number): boolean {
  if (vol == null || vol >= RULE.volumeMax) return false;
  if (atr == null || atr < RULE.atrMinPct || atr >= RULE.atrMaxPct) return false;
  if (consec > RULE.consecutiveBuyMax) return false;
  return true;
}

describe('1023.KL FP analysis', () => {
  it('writes FP=2 vs TP=8 comparison JSON', async () => {
    const obs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Array<{
      date: string;
      symbol: string;
      rsi14: number;
      openAiAction: string;
      return5d: number | null;
      return10d: number | null;
      return20d: number | null;
    }>;
    const reg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
    ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
    const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

    const symbolObs = obs.filter((o) => o.symbol === SYMBOL);
    const consecByKey = new Map<string, number>();
    symbolObs.sort((a, b) => a.date.localeCompare(b.date));
    let streak = 0;
    for (const row of symbolObs) {
      if (row.openAiAction === 'buy') {
        streak += 1;
        consecByKey.set(`${row.date}|${SYMBOL}`, streak);
      } else {
        streak = 0;
        consecByKey.set(`${row.date}|${SYMBOL}`, 0);
      }
    }

    const ohlc = await fetchYahooOhlcv(YAHOO);
    const daily: DailyBar[] = ohlc.map((b) => ({ date: b.date, close: b.close }));
    const obsByKey = new Map(symbolObs.map((o) => [`${o.date}|${o.symbol}`, o] as const));

    const rulePassCases: CaseRow[] = [];

    for (const o of symbolObs.filter((x) => x.openAiAction === 'buy')) {
      const vol = volMap.get(`${o.date}|${o.symbol}`) ?? null;
      const consec = consecByKey.get(`${o.date}|${o.symbol}`) ?? 0;
      const idx = daily.findIndex((b) => b.date === o.date);
      if (idx < 0) continue;
      const atrPct = computeAtrPctAt(ohlc, idx);
      if (!passesRule(vol, atrPct, consec)) continue;

      const sim = simulateTpSl(ohlc, daily, idx);
      if (!sim) continue;

      const pctLow = pctFrom52wLowAt(ohlc, idx);
      const prevChg = prevDayChangePct(ohlc, idx);

      rulePassCases.push({
        date: o.date,
        symbol: o.symbol,
        outcome: sim.returnPct > 0 ? 'TP' : 'FP',
        volumeSurgeRatio: vol!,
        atrPct: atrPct!,
        consecutiveBuyNumber: consec,
        return5d: o.return5d ?? forwardReturnPct(daily, idx, 5),
        return10d: o.return10d ?? forwardReturnPct(daily, idx, 10),
        return20d: o.return20d ?? forwardReturnPct(daily, idx, 20),
        tpSlReturnPct: sim.returnPct,
        exitReason: sim.exitReason,
        rsi14: o.rsi14,
        pctFrom52wLow: pctLow ?? 0,
        prevDayChangePct: prevChg ?? 0,
      });
    }

    rulePassCases.sort((a, b) => a.date.localeCompare(b.date));

    const tpCases = rulePassCases.filter((c) => c.outcome === 'TP');
    const fpCases = rulePassCases.filter((c) => c.outcome === 'FP');

    const featureComparison = [
      compareMetric(
        'RSI14',
        tpCases.map((c) => c.rsi14),
        fpCases.map((c) => c.rsi14),
      ),
      compareMetric(
        'ATR(%)',
        tpCases.map((c) => c.atrPct),
        fpCases.map((c) => c.atrPct),
      ),
      compareMetric(
        '出来高倍率',
        tpCases.map((c) => c.volumeSurgeRatio),
        fpCases.map((c) => c.volumeSurgeRatio),
      ),
      compareMetric(
        '連続buy回数',
        tpCases.map((c) => c.consecutiveBuyNumber),
        fpCases.map((c) => c.consecutiveBuyNumber),
      ),
      compareMetric(
        '52週安値距離(%)',
        tpCases.map((c) => c.pctFrom52wLow),
        fpCases.map((c) => c.pctFrom52wLow),
      ),
      compareMetric(
        '前日騰落率(%)',
        tpCases.map((c) => c.prevDayChangePct),
        fpCases.map((c) => c.prevDayChangePct),
      ),
    ];

    const report = {
      methodologyJa: {
        scope: '1023.KL（CIMB）限定・OpenAI buy・ルール通過10件',
        rule: RULE,
        tp: 'ルール通過 & +4%TP/-3%SLシミュレーション > 0',
        fp: 'ルール通過 & シミュレーション <= 0',
      },
      rulePassCount: rulePassCases.length,
      fpCount: fpCases.length,
      tpCount: tpCases.length,
      fpCases: fpCases.map(({ outcome: _o, ...rest }) => rest),
      tpCases: tpCases.map(({ outcome: _o, ...rest }) => rest),
      featureComparison,
      insightJa: [
        `ルール通過: ${rulePassCases.length}件 (TP=${tpCases.length} FP=${fpCases.length})`,
        fpCases.length > 0
          ? `FP: ${fpCases.map((c) => `${c.date}(TP/SL=${c.tpSlReturnPct}% ${c.exitReason})`).join(', ')}`
          : null,
        featureComparison
          .filter((f) => f.deltaFpMinusTp != null && Math.abs(f.deltaFpMinusTp) > 0.5)
          .map((f) => `${f.metric}: FP平均${f.fpAvg} vs TP平均${f.tpAvg} (差${f.deltaFpMinusTp})`)
          .join(' / ') || '特徴量差は限定的',
      ].filter(Boolean),
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-1023-fp-analysis.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== 1023 FP ===\n', JSON.stringify(report, null, 2));
  });
});
