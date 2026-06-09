/**
 * 1023.KL — ベストルール + RSI14上限 総当たり（55-62）
 * npx vitest run tests/unit/openAi1023RsiCapGrid.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { computeRsi14At } from '../helpers/buyAction30dAudit';

const SYMBOL = '1023';
const YAHOO = '1023.KL';

const RULE = {
  volumeMax: 1.2,
  atrMinPct: 1.85,
  atrMaxPct: 2.5,
  consecutiveBuyMax: 8,
  takeProfitPct: 4,
  stopLossPct: -3,
  maxHoldOffset: 20,
};

const RSI_CAPS = [55, 56, 57, 58, 59, 60, 61, 62] as const;

type OhlcvBar = { date: string; high: number; low: number; close: number };

type BuyRow = {
  date: string;
  rsi14: number | null;
  volumeSurgeRatio: number | null;
  atrPct: number | null;
  consecutiveBuyNumber: number;
  returnPct: number | null;
  actualWin: boolean | null;
  maxDrawdownPct: number | null;
  passesBase: boolean;
};

type GridRow = {
  rsiMax: number;
  count: number;
  TP: number;
  FP: number;
  FN: number;
  TN: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  expectancyPct: number | null;
  maxDrawdownPct: number | null;
};

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function passesBase(vol: number | null, atr: number | null, consec: number): boolean {
  if (vol == null || vol >= RULE.volumeMax) return false;
  if (atr == null || atr < RULE.atrMinPct || atr >= RULE.atrMaxPct) return false;
  if (consec > RULE.consecutiveBuyMax) return false;
  return true;
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

function pathMaxDrawdownPct(bars: OhlcvBar[], entryIdx: number, exitIdx: number, entry: number): number {
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
  bars: OhlcvBar[],
  signalIdx: number,
): { returnPct: number; entryIdx: number; exitIdx: number } | null {
  const entryIdx = signalIdx + 1;
  if (entryIdx >= bars.length) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;
  const stopPrice = entry * (1 + RULE.stopLossPct / 100);
  const targetPrice = entry * (1 + RULE.takeProfitPct / 100);
  const lastIdx = Math.min(signalIdx + RULE.maxHoldOffset, bars.length - 1);
  if (lastIdx <= entryIdx) return null;
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const b = bars[i]!;
    if (b.low <= stopPrice) {
      return { returnPct: RULE.stopLossPct, entryIdx, exitIdx: i };
    }
    if (b.high >= targetPrice) {
      return { returnPct: RULE.takeProfitPct, entryIdx, exitIdx: i };
    }
  }
  return {
    returnPct: Math.round(((bars[lastIdx]!.close / entry - 1) * 100) * 10000) / 10000,
    entryIdx,
    exitIdx: lastIdx,
  };
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
          quote?: Array<{ high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }>;
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

function buildGridRow(rsiMax: number, rows: BuyRow[]): GridRow {
  const evaluated = rows.filter((r) => r.returnPct != null);
  let TP = 0;
  let FP = 0;
  let FN = 0;
  let TN = 0;

  for (const r of evaluated) {
    const pred = r.passesBase && r.rsi14 != null && r.rsi14 <= rsiMax;
    const actual = r.actualWin!;
    if (pred && actual) TP += 1;
    else if (pred && !actual) FP += 1;
    else if (!pred && actual) FN += 1;
    else TN += 1;
  }

  const predictedPositive = evaluated.filter(
    (r) => r.passesBase && r.rsi14 != null && r.rsi14 <= rsiMax,
  );
  const precision = TP + FP > 0 ? round3(TP / (TP + FP)) : null;
  const recall = TP + FN > 0 ? round3(TP / (TP + FN)) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? round3((2 * precision * recall) / (precision + recall))
      : null;

  return {
    rsiMax,
    count: predictedPositive.length,
    TP,
    FP,
    FN,
    TN,
    precision,
    recall,
    f1,
    expectancyPct: mean(predictedPositive.map((r) => r.returnPct!)),
    maxDrawdownPct:
      predictedPositive.length > 0
        ? Math.round(Math.min(...predictedPositive.map((r) => r.maxDrawdownPct ?? 0)) * 100) / 100
        : null,
  };
}

describe('1023.KL RSI cap grid', () => {
  it('writes RSI 55-62 grid ranking JSON', async () => {
    const obs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Array<{ date: string; symbol: string; openAiAction: string; rsi14: number }>;
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
    const buyRows: BuyRow[] = [];

    for (const o of symbolObs.filter((x) => x.openAiAction === 'buy')) {
      const vol = volMap.get(`${o.date}|${o.symbol}`) ?? null;
      const consec = consecByKey.get(`${o.date}|${o.symbol}`) ?? 0;
      const idx = bars.findIndex((b) => b.date === o.date);
      const atrPct = idx >= 0 ? computeAtrPctAt(bars, idx) : null;
      const rsi14 = idx >= 0 ? computeRsi14At(closes, idx) : o.rsi14;

      let returnPct: number | null = null;
      let maxDrawdownPct: number | null = null;
      if (idx >= 0) {
        const sim = simulateTpSl(bars, idx);
        if (sim) {
          returnPct = sim.returnPct;
          maxDrawdownPct = pathMaxDrawdownPct(bars, sim.entryIdx, sim.exitIdx, bars[sim.entryIdx]!.close);
        }
      }

      buyRows.push({
        date: o.date,
        rsi14,
        volumeSurgeRatio: vol,
        atrPct,
        consecutiveBuyNumber: consec,
        returnPct,
        actualWin: returnPct != null ? returnPct > 0 : null,
        maxDrawdownPct,
        passesBase: passesBase(vol, atrPct, consec),
      });
    }

    const baselineNoRsi = buildGridRow(999, buyRows);
    const grid = RSI_CAPS.map((cap) => buildGridRow(cap, buyRows));

    const rankedByExpectancy = [...grid].sort((a, b) => (b.expectancyPct ?? -999) - (a.expectancyPct ?? -999));
    const rankedByF1 = [...grid].sort((a, b) => (b.f1 ?? -999) - (a.f1 ?? -999));

    const report = {
      methodologyJa: {
        scope: '1023.KL・OpenAI buyのみ',
        fixedRule: {
          volume: `< ${RULE.volumeMax}`,
          atr: `${RULE.atrMinPct}% <= ATR < ${RULE.atrMaxPct}%`,
          consecutiveBuy: `<= ${RULE.consecutiveBuyMax}`,
          exit: `TP +${RULE.takeProfitPct}% / SL ${RULE.stopLossPct}%`,
        },
        variable: 'RSI14上限（<= cap）',
        universe: `buy ${buyRows.length}件`,
        baselineNoRsiCap: {
          label: 'RSI上限なし（ベストルールのみ）',
          ...baselineNoRsi,
        },
      },
      buyRows,
      grid,
      ranking: {
        byExpectancy: rankedByExpectancy,
        byF1: rankedByF1,
      },
      insightJa: [
        `ベースルールのみ: 件数${baselineNoRsi.count} TP${baselineNoRsi.TP} FP${baselineNoRsi.FP} 期待値${baselineNoRsi.expectancyPct}%`,
        `期待値1位: RSI<=${rankedByExpectancy[0]?.rsiMax} (${rankedByExpectancy[0]?.expectancyPct}%)`,
        `F1 1位: RSI<=${rankedByF1[0]?.rsiMax} (F1=${rankedByF1[0]?.f1})`,
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-1023-rsi-cap-grid.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== RSI CAP GRID ===\n', JSON.stringify(report, null, 2));
  });
});
