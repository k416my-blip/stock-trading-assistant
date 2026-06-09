/**
 * 1023.KL TP8 vs FP2 — エントリー前5日/10日 特徴量比較
 * npx vitest run tests/unit/openAi1023TpFpPreEntryCompare.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { computeRsi14At } from '../helpers/buyAction30dAudit';

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

type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };

type MetricSnapshot = {
  rsi14: number | null;
  atrPct: number | null;
  volumeSurgeRatio: number | null;
  pctFrom52wLow: number | null;
  prevDayChangePct: number | null;
  change5dPct: number | null;
  change10dPct: number | null;
};

type CaseDetail = {
  date: string;
  outcome: 'TP' | 'FP';
  signalBarIdx: number;
  pre5d: MetricSnapshot;
  pre10d: MetricSnapshot;
};

const METRIC_KEYS = [
  'rsi14',
  'atrPct',
  'volumeSurgeRatio',
  'pctFrom52wLow',
  'prevDayChangePct',
  'change5dPct',
  'change10dPct',
] as const;

const METRIC_LABELS: Record<(typeof METRIC_KEYS)[number], string> = {
  rsi14: 'RSI14',
  atrPct: 'ATR(%)',
  volumeSurgeRatio: '出来高倍率',
  pctFrom52wLow: '52週安値距離(%)',
  prevDayChangePct: '前日騰落率(%)',
  change5dPct: '5日騰落率(%)',
  change10dPct: '10日騰落率(%)',
};

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function avgNullable(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v != null);
  return mean(nums);
}

function computeAtrPctAt(bars: OhlcvBar[], idx: number, period = 14): number | null {
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

function pctFrom52wLowAt(bars: OhlcvBar[], idx: number, lookback = 252): number | null {
  const start = Math.max(0, idx - lookback + 1);
  const window = bars.slice(start, idx + 1);
  if (window.length < 20) return null;
  const low52 = Math.min(...window.map((b) => b.low));
  if (low52 <= 0) return null;
  return Math.round((bars[idx]!.close / low52 - 1) * 10000) / 100;
}

function volumeSurgeAt(bars: OhlcvBar[], idx: number): number | null {
  if (idx < 9) return null;
  const volumes = bars.slice(0, idx + 1).map((b) => b.volume);
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior <= 0) return null;
  return Math.round((recent / prior) * 100) / 100;
}

function metricsAtBar(bars: OhlcvBar[], closes: number[], idx: number): MetricSnapshot {
  if (idx < 0 || idx >= bars.length) {
    return {
      rsi14: null,
      atrPct: null,
      volumeSurgeRatio: null,
      pctFrom52wLow: null,
      prevDayChangePct: null,
      change5dPct: null,
      change10dPct: null,
    };
  }
  const prevDayChangePct =
    idx >= 1 && bars[idx - 1]!.close > 0
      ? Math.round(((bars[idx]!.close / bars[idx - 1]!.close - 1) * 100) * 100) / 100
      : null;
  const change5dPct =
    idx >= 5 && bars[idx - 5]!.close > 0
      ? Math.round(((bars[idx]!.close / bars[idx - 5]!.close - 1) * 100) * 100) / 100
      : null;
  const change10dPct =
    idx >= 10 && bars[idx - 10]!.close > 0
      ? Math.round(((bars[idx]!.close / bars[idx - 10]!.close - 1) * 100) * 100) / 100
      : null;
  return {
    rsi14: computeRsi14At(closes, idx),
    atrPct: computeAtrPctAt(bars, idx),
    volumeSurgeRatio: volumeSurgeAt(bars, idx),
    pctFrom52wLow: pctFrom52wLowAt(bars, idx),
    prevDayChangePct,
    change5dPct,
    change10dPct,
  };
}

function windowAverageSnapshot(bars: OhlcvBar[], closes: number[], endIdx: number, windowDays: number): MetricSnapshot {
  const startIdx = endIdx - windowDays + 1;
  if (startIdx < 0) {
    return metricsAtBar(bars, closes, -1);
  }
  const snaps: MetricSnapshot[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    snaps.push(metricsAtBar(bars, closes, i));
  }
  const avg = (key: keyof MetricSnapshot) => avgNullable(snaps.map((s) => s[key]));
  const cumWindow =
    bars[startIdx]!.close > 0
      ? Math.round(((bars[endIdx]!.close / bars[startIdx]!.close - 1) * 100) * 100) / 100
      : null;
  const cum5 =
    endIdx >= 5 && bars[endIdx - 5]!.close > 0
      ? Math.round(((bars[endIdx]!.close / bars[endIdx - 5]!.close - 1) * 100) * 100) / 100
      : null;
  const cum10 =
    endIdx >= 10 && bars[endIdx - 10]!.close > 0
      ? Math.round(((bars[endIdx]!.close / bars[endIdx - 10]!.close - 1) * 100) * 100) / 100
      : null;
  return {
    rsi14: avg('rsi14'),
    atrPct: avg('atrPct'),
    volumeSurgeRatio: avg('volumeSurgeRatio'),
    pctFrom52wLow: avg('pctFrom52wLow'),
    prevDayChangePct: avg('prevDayChangePct'),
    change5dPct: windowDays === 5 ? cumWindow : cum5,
    change10dPct: windowDays === 10 ? cumWindow : cum10,
  };
}

function simulateTpSl(bars: OhlcvBar[], signalIdx: number): number | null {
  const entryIdx = signalIdx + 1;
  if (entryIdx >= bars.length) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;
  const stopPrice = entry * (1 + RULE.stopLossPct / 100);
  const targetPrice = entry * (1 + RULE.takeProfitPct / 100);
  const lastIdx = Math.min(signalIdx + RULE.maxHoldOffset, bars.length - 1);
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const b = bars[i]!;
    if (b.low <= stopPrice) return RULE.stopLossPct;
    if (b.high >= targetPrice) return RULE.takeProfitPct;
  }
  return Math.round(((bars[lastIdx]!.close / entry - 1) * 100) * 10000) / 10000;
}

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcvBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2y`;
  const res = await fetch(url, { headers: { 'User-Agent': 'stock-trading-assistant-audit/1.0' } });
  if (!res.ok) throw new Error(`Yahoo ${yahooSymbol} HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
            volume?: (number | null)[];
          }>;
        };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const bars: OhlcvBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const h = q?.high?.[i];
    const l = q?.low?.[i];
    const c = q?.close?.[i];
    const v = q?.volume?.[i];
    if (h == null || l == null || c == null || v == null || !Number.isFinite(c)) continue;
    bars.push({
      date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
      high: h,
      low: l,
      close: c,
      volume: v,
    });
  }
  return bars;
}

function compareHorizon(cases: CaseDetail[], horizon: 'pre5d' | 'pre10d') {
  const tp = cases.filter((c) => c.outcome === 'TP');
  const fp = cases.filter((c) => c.outcome === 'FP');
  const rows = METRIC_KEYS.map((key) => {
    const tpAvg = avgNullable(tp.map((c) => c[horizon][key]));
    const fpAvg = avgNullable(fp.map((c) => c[horizon][key]));
    const delta =
      tpAvg != null && fpAvg != null ? Math.round((fpAvg - tpAvg) * 100) / 100 : null;
    return {
      metric: key,
      labelJa: METRIC_LABELS[key],
      tpAvg,
      fpAvg,
      deltaFpMinusTp: delta,
      absDelta: delta != null ? Math.abs(delta) : 0,
    };
  });
  const ranking = [...rows].sort((a, b) => b.absDelta - a.absDelta);
  return { horizon, tpCount: tp.length, fpCount: fp.length, comparison: rows, deltaRanking: ranking };
}

describe('1023 TP vs FP pre-entry compare', () => {
  it('writes pre5/pre10 comparison JSON', async () => {
    const obs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Array<{ date: string; symbol: string; openAiAction: string }>;
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

    const bars = await fetchYahooOhlcv(YAHOO);
    const closes = bars.map((b) => b.close);

    const cases: CaseDetail[] = [];

    for (const o of symbolObs.filter((x) => x.openAiAction === 'buy')) {
      const vol = volMap.get(`${o.date}|${o.symbol}`) ?? null;
      const consec = consecByKey.get(`${o.date}|${o.symbol}`) ?? 0;
      const idx = bars.findIndex((b) => b.date === o.date);
      if (idx < 0) continue;
      const atrPct = computeAtrPctAt(bars, idx);
      if (vol == null || vol >= RULE.volumeMax) continue;
      if (atrPct == null || atrPct < RULE.atrMinPct || atrPct >= RULE.atrMaxPct) continue;
      if (consec > RULE.consecutiveBuyMax) continue;

      const simRet = simulateTpSl(bars, idx);
      if (simRet == null) continue;

      const preEndIdx = idx;

      cases.push({
        date: o.date,
        outcome: simRet > 0 ? 'TP' : 'FP',
        signalBarIdx: idx,
        pre5d: windowAverageSnapshot(bars, closes, preEndIdx, 5),
        pre10d: windowAverageSnapshot(bars, closes, preEndIdx, 10),
      });
    }

    cases.sort((a, b) => a.date.localeCompare(b.date));

    const pre5 = compareHorizon(cases, 'pre5d');
    const pre10 = compareHorizon(cases, 'pre10d');

    const report = {
      methodologyJa: {
        scope: '1023.KL・ルール通過10件（TP8・FP2）',
        entry: 'シグナル日翌営業日終値',
        pre5dDefinition:
          'シグナル日を含む直前5営業日の RSI/ATR/出来高/安値距離/前日騰落率の平均。5日騰落率=5日間累積、10日騰落率=10日前比',
        pre10dDefinition: 'シグナル日を含む直前10営業日の同様集計',
        fpTp: 'TP=+4%TP/-3%SL勝ち、FP=負け',
      },
      cases,
      pre5dComparison: pre5,
      pre10dComparison: pre10,
      insightJa: [
        `TP${pre5.tpCount} FP${pre5.fpCount}`,
        `前5日 差分Top: ${pre5.deltaRanking.slice(0, 3).map((r) => `${r.labelJa}(Δ${r.deltaFpMinusTp})`).join(', ')}`,
        `前10日 差分Top: ${pre10.deltaRanking.slice(0, 3).map((r) => `${r.labelJa}(Δ${r.deltaFpMinusTp})`).join(', ')}`,
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-1023-tp-fp-pre-entry-compare.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== TP FP PRE-ENTRY ===\n', JSON.stringify(report, null, 2));
  });
});
