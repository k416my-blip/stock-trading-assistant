/**
 * 1023.KL — ベストルール 出来高上限総当たり（ATR固定）
 * npx vitest run tests/unit/openAi1023VolumeCapGrid.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const SYMBOL = '1023';
const YAHOO = '1023.KL';

const FIXED = {
  atrMinPct: 1.85,
  atrMaxPct: 2.5,
  consecutiveBuyMax: 8,
  takeProfitPct: 4,
  stopLossPct: -3,
  maxHoldOffset: 20,
};

const VOLUME_CAPS = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5] as const;

type OhlcvBar = { date: string; high: number; low: number; close: number };

type BuyRow = {
  date: string;
  volumeSurgeRatio: number | null;
  atrPct: number | null;
  consecutiveBuyNumber: number;
  returnPct: number | null;
  actualWin: boolean | null;
  maxDrawdownPct: number | null;
};

type GridRow = {
  volumeMax: number;
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

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function passesRule(vol: number | null, atr: number | null, consec: number, volumeMax: number): boolean {
  if (vol == null || vol >= volumeMax) return false;
  if (atr == null || atr < FIXED.atrMinPct || atr >= FIXED.atrMaxPct) return false;
  if (consec > FIXED.consecutiveBuyMax) return false;
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
  const stopPrice = entry * (1 + FIXED.stopLossPct / 100);
  const targetPrice = entry * (1 + FIXED.takeProfitPct / 100);
  const lastIdx = Math.min(signalIdx + FIXED.maxHoldOffset, bars.length - 1);
  if (lastIdx <= entryIdx) return null;
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const b = bars[i]!;
    if (b.low <= stopPrice) return { returnPct: FIXED.stopLossPct, entryIdx, exitIdx: i };
    if (b.high >= targetPrice) return { returnPct: FIXED.takeProfitPct, entryIdx, exitIdx: i };
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

function buildGridRow(volumeMax: number, rows: BuyRow[]): GridRow {
  const evaluated = rows.filter((r) => r.returnPct != null);
  let TP = 0;
  let FP = 0;
  let FN = 0;
  let TN = 0;

  for (const r of evaluated) {
    const pred = passesRule(r.volumeSurgeRatio, r.atrPct, r.consecutiveBuyNumber, volumeMax);
    const actual = r.actualWin!;
    if (pred && actual) TP += 1;
    else if (pred && !actual) FP += 1;
    else if (!pred && actual) FN += 1;
    else TN += 1;
  }

  const predictedPositive = evaluated.filter((r) =>
    passesRule(r.volumeSurgeRatio, r.atrPct, r.consecutiveBuyNumber, volumeMax),
  );
  const precision = TP + FP > 0 ? round3(TP / (TP + FP)) : null;
  const recall = TP + FN > 0 ? round3(TP / (TP + FN)) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? round3((2 * precision * recall) / (precision + recall))
      : null;

  return {
    volumeMax,
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

describe('1023.KL volume cap grid', () => {
  it('writes volume 0.8-1.5 grid JSON', async () => {
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
    const buyRows: BuyRow[] = [];

    for (const o of symbolObs.filter((x) => x.openAiAction === 'buy')) {
      const vol = volMap.get(`${o.date}|${o.symbol}`) ?? null;
      const consec = consecByKey.get(`${o.date}|${o.symbol}`) ?? 0;
      const idx = bars.findIndex((b) => b.date === o.date);
      const atrPct = idx >= 0 ? computeAtrPctAt(bars, idx) : null;

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
        volumeSurgeRatio: vol,
        atrPct,
        consecutiveBuyNumber: consec,
        returnPct,
        actualWin: returnPct != null ? returnPct > 0 : null,
        maxDrawdownPct,
      });
    }

    const grid = VOLUME_CAPS.map((cap) => buildGridRow(cap, buyRows));
    const current = grid.find((g) => g.volumeMax === 1.2)!;
    const bestF1 = [...grid].sort((a, b) => (b.f1 ?? -1) - (a.f1 ?? -1))[0]!;
    const bestExpectancy = [...grid].sort((a, b) => (b.expectancyPct ?? -999) - (a.expectancyPct ?? -999))[0]!;

    const report = {
      methodologyJa: {
        scope: '1023.KL・OpenAI buy 21件',
        fixed: {
          atr: `${FIXED.atrMinPct}% <= ATR < ${FIXED.atrMaxPct}%`,
          consecutiveBuy: `<= ${FIXED.consecutiveBuyMax}`,
          exit: `TP +${FIXED.takeProfitPct}% / SL ${FIXED.stopLossPct}%`,
        },
        variable: '出来高上限（< volumeMax）',
        universe: `buy ${buyRows.length}件（sim評価 ${buyRows.filter((r) => r.returnPct != null).length}件）`,
      },
      grid,
      currentBestRuleVolume12: current,
      ranking: {
        byF1: bestF1,
        byExpectancy: bestExpectancy,
      },
      insightJa: [
        `現行 volume<1.2: 件数${current.count} TP${current.TP} FP${current.FP} F1=${current.f1} 期待値${current.expectancyPct}%`,
        `F1最大: volume<${bestF1.volumeMax} (F1=${bestF1.f1}, 件数${bestF1.count})`,
        `期待値最大: volume<${bestExpectancy.volumeMax} (${bestExpectancy.expectancyPct}%)`,
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-1023-volume-cap-grid.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== VOLUME CAP GRID ===\n', JSON.stringify(report, null, 2));
  });
});
