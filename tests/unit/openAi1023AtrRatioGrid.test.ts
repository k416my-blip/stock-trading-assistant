/**
 * 1023.KL専用 — ATR_ratio = ATR14 / ATR90 正規化ルール グリッド検証
 * 1023.KL + VYM（汎化確認）
 * npx vitest run tests/unit/openAi1023AtrRatioGrid.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const SYMBOLS = ['1023', 'VYM'] as const;
const YAHOO_BY_SYMBOL: Record<(typeof SYMBOLS)[number], string> = {
  '1023': '1023.KL',
  VYM: 'VYM',
};

const FIXED = {
  volumeMax: 1.2,
  consecutiveBuyMax: 8,
  atr90Lookback: 90,
  /** 旧ルール ATR%2.5 / 1.85 ≒ 1.35 — 上限も比率で統一 */
  atrRatioMax: 1.35,
  takeProfitPct: 4,
  stopLossPct: -3,
  maxHoldOffset: 20,
};

const ATR_RATIO_MIN_GRID = [0.8, 0.9, 1.0, 1.1, 1.2] as const;

type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };

type BuyRow = {
  date: string;
  symbol: string;
  volumeSurgeRatio: number | null;
  atrPct: number | null;
  atr90AvgPct: number | null;
  atrRatio: number | null;
  consecutiveBuyNumber: number;
  returnPct: number | null;
  actualWin: boolean | null;
  maxDrawdownPct: number | null;
};

type GridRow = {
  atrRatioMin: number;
  symbol: string;
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round2(vals.reduce((a, b) => a + b, 0) / vals.length);
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
  return round2((atr / close) * 100);
}

function computeAtr90AvgPct(bars: OhlcvBar[], idx: number): number | null {
  const start = idx - FIXED.atr90Lookback + 1;
  if (start < 14) return null;
  const samples: number[] = [];
  for (let i = start; i <= idx; i++) {
    const v = computeAtrPctAt(bars, i);
    if (v != null) samples.push(v);
  }
  if (samples.length < 60) return null;
  return round2(samples.reduce((a, b) => a + b, 0) / samples.length);
}

function computeAtrRatio(bars: OhlcvBar[], idx: number): { atrPct: number | null; atr90AvgPct: number | null; atrRatio: number | null } {
  const atrPct = computeAtrPctAt(bars, idx);
  const atr90AvgPct = computeAtr90AvgPct(bars, idx);
  if (atrPct == null || atr90AvgPct == null || atr90AvgPct <= 0) {
    return { atrPct, atr90AvgPct, atrRatio: null };
  }
  return { atrPct, atr90AvgPct, atrRatio: round3(atrPct / atr90AvgPct) };
}

function passesRatioRule(
  vol: number | null,
  atrRatio: number | null,
  consec: number,
  atrRatioMin: number,
): boolean {
  if (vol == null || vol >= FIXED.volumeMax) return false;
  if (atrRatio == null || atrRatio < atrRatioMin || atrRatio >= FIXED.atrRatioMax) return false;
  if (consec > FIXED.consecutiveBuyMax) return false;
  return true;
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
  return round2(maxDd);
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
    returnPct: round2(((bars[lastIdx]!.close / entry - 1) * 100)),
    entryIdx,
    exitIdx: lastIdx,
  };
}

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcvBar[]> {
  const period1 = Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&period1=${period1}&period2=${period2}`;
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

function volumeSurgeAt(bars: OhlcvBar[], idx: number): number | null {
  if (idx < 9) return null;
  const volumes = bars.slice(0, idx + 1).map((b) => b.volume);
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior <= 0) return null;
  return round2(recent / prior);
}

function buildGridRow(atrRatioMin: number, symbol: string, rows: BuyRow[]): GridRow {
  const evaluated = rows.filter((r) => r.returnPct != null);
  let TP = 0;
  let FP = 0;
  let FN = 0;
  let TN = 0;

  for (const r of evaluated) {
    const pred = passesRatioRule(r.volumeSurgeRatio, r.atrRatio, r.consecutiveBuyNumber, atrRatioMin);
    const actual = r.actualWin!;
    if (pred && actual) TP += 1;
    else if (pred && !actual) FP += 1;
    else if (!pred && actual) FN += 1;
    else TN += 1;
  }

  const predictedPositive = evaluated.filter((r) =>
    passesRatioRule(r.volumeSurgeRatio, r.atrRatio, r.consecutiveBuyNumber, atrRatioMin),
  );
  const precision = TP + FP > 0 ? round3(TP / (TP + FP)) : null;
  const recall = TP + FN > 0 ? round3(TP / (TP + FN)) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? round3((2 * precision * recall) / (precision + recall))
      : null;

  return {
    atrRatioMin,
    symbol,
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
        ? round2(Math.min(...predictedPositive.map((r) => r.maxDrawdownPct ?? 0)))
        : null,
  };
}

/** 旧固定ATR%ルール（比較用） */
function passesLegacyFixedAtr(
  vol: number | null,
  atrPct: number | null,
  consec: number,
): boolean {
  if (vol == null || vol >= FIXED.volumeMax) return false;
  if (atrPct == null || atrPct < 1.85 || atrPct >= 2.5) return false;
  if (consec > FIXED.consecutiveBuyMax) return false;
  return true;
}

function buildLegacyRow(symbol: string, rows: BuyRow[]): GridRow {
  const evaluated = rows.filter((r) => r.returnPct != null);
  let TP = 0;
  let FP = 0;
  let FN = 0;
  let TN = 0;
  for (const r of evaluated) {
    const pred = passesLegacyFixedAtr(r.volumeSurgeRatio, r.atrPct, r.consecutiveBuyNumber);
    const actual = r.actualWin!;
    if (pred && actual) TP += 1;
    else if (pred && !actual) FP += 1;
    else if (!pred && actual) FN += 1;
    else TN += 1;
  }
  const predictedPositive = evaluated.filter((r) =>
    passesLegacyFixedAtr(r.volumeSurgeRatio, r.atrPct, r.consecutiveBuyNumber),
  );
  const precision = TP + FP > 0 ? round3(TP / (TP + FP)) : null;
  const recall = TP + FN > 0 ? round3(TP / (TP + FN)) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? round3((2 * precision * recall) / (precision + recall))
      : null;
  return {
    atrRatioMin: -1,
    symbol,
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
        ? round2(Math.min(...predictedPositive.map((r) => r.maxDrawdownPct ?? 0)))
        : null,
  };
}

describe('1023.KL ATR ratio grid', () => {
  it('writes ATR_ratio grid JSON for 1023.KL and VYM', async () => {
    const obs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Array<{ date: string; symbol: string; openAiAction: string }>;
    const reg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
    ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
    const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

    const buyRowsBySymbol = new Map<string, BuyRow[]>();
    const ohlcCache = new Map<string, OhlcvBar[]>();

    for (const sym of SYMBOLS) {
      const yahoo = YAHOO_BY_SYMBOL[sym];
      ohlcCache.set(yahoo, await fetchYahooOhlcv(yahoo));
    }

    for (const sym of SYMBOLS) {
      const symbolObs = obs.filter((o) => o.symbol === sym);
      symbolObs.sort((a, b) => a.date.localeCompare(b.date));
      const consecByKey = new Map<string, number>();
      let streak = 0;
      for (const row of symbolObs) {
        if (row.openAiAction === 'buy') {
          streak += 1;
          consecByKey.set(`${row.date}|${sym}`, streak);
        } else {
          streak = 0;
          consecByKey.set(`${row.date}|${sym}`, 0);
        }
      }

      const bars = ohlcCache.get(YAHOO_BY_SYMBOL[sym])!;
      const rows: BuyRow[] = [];

      for (const o of symbolObs.filter((x) => x.openAiAction === 'buy')) {
        const idx = bars.findIndex((b) => b.date === o.date);
        const { atrPct, atr90AvgPct, atrRatio } = idx >= 0 ? computeAtrRatio(bars, idx) : { atrPct: null, atr90AvgPct: null, atrRatio: null };
        const vol = volMap.get(`${o.date}|${sym}`) ?? (idx >= 0 ? volumeSurgeAt(bars, idx) : null);
        const consec = consecByKey.get(`${o.date}|${sym}`) ?? 0;

        let returnPct: number | null = null;
        let maxDrawdownPct: number | null = null;
        if (idx >= 0) {
          const sim = simulateTpSl(bars, idx);
          if (sim) {
            returnPct = sim.returnPct;
            maxDrawdownPct = pathMaxDrawdownPct(bars, sim.entryIdx, sim.exitIdx, bars[sim.entryIdx]!.close);
          }
        }

        rows.push({
          date: o.date,
          symbol: sym,
          volumeSurgeRatio: vol,
          atrPct,
          atr90AvgPct,
          atrRatio,
          consecutiveBuyNumber: consec,
          returnPct,
          actualWin: returnPct != null ? returnPct > 0 : null,
          maxDrawdownPct,
        });
      }

      buyRowsBySymbol.set(sym, rows);
    }

    const grid1023 = ATR_RATIO_MIN_GRID.map((t) => buildGridRow(t, '1023', buyRowsBySymbol.get('1023')!));
    const gridVym = ATR_RATIO_MIN_GRID.map((t) => buildGridRow(t, 'VYM', buyRowsBySymbol.get('VYM')!));
    const legacy1023 = buildLegacyRow('1023', buyRowsBySymbol.get('1023')!);
    const legacyVym = buildLegacyRow('VYM', buyRowsBySymbol.get('VYM')!);

    const best1023F1 = [...grid1023].sort((a, b) => (b.f1 ?? -1) - (a.f1 ?? -1))[0]!;
    const bestVymF1 = [...gridVym].sort((a, b) => (b.f1 ?? -1) - (a.f1 ?? -1))[0]!;

    const report = {
      methodologyJa: {
        scope: '1023.KL専用ルール設計 — 1023.KL + VYM（汎化確認）',
        atrRatioDefinition: 'ATR_ratio = ATR14%(当日) / 直近90営業日ATR14%平均',
        fixedFilters: {
          volume: `< ${FIXED.volumeMax}`,
          consecutiveBuy: `<= ${FIXED.consecutiveBuyMax}`,
          atrRatioMax: `< ${FIXED.atrRatioMax}（旧ATR2.5%/1.85%相当）`,
          exit: `TP +${FIXED.takeProfitPct}% / SL ${FIXED.stopLossPct}%`,
        },
        variable: 'ATR_ratio下限（>= threshold）',
        grid: ATR_RATIO_MIN_GRID,
        legacyBaseline: '旧: ATR 1.85%〜2.5% 固定',
      },
      buyCaseDetails: {
        '1023': buyRowsBySymbol.get('1023'),
        VYM: buyRowsBySymbol.get('VYM'),
      },
      gridBySymbol: {
        '1023.KL': grid1023,
        VYM: gridVym,
      },
      legacyFixedAtrBaseline: {
        '1023.KL': legacy1023,
        VYM: legacyVym,
      },
      comparisonTable: ATR_RATIO_MIN_GRID.map((t) => ({
        atrRatioMin: t,
        '1023.KL': grid1023.find((g) => g.atrRatioMin === t)!,
        VYM: gridVym.find((g) => g.atrRatioMin === t)!,
      })),
      generalization: {
        legacy: {
          '1023.KL': { f1: legacy1023.f1, rulePass: legacy1023.count, FP: legacy1023.FP, FN: legacy1023.FN },
          VYM: { f1: legacyVym.f1, rulePass: legacyVym.count, FP: legacyVym.FP, FN: legacyVym.FN },
        },
        bestRatio1023: best1023F1,
        bestRatioVym: bestVymF1,
        improvedVymVsLegacy:
          (bestVymF1.f1 ?? 0) > (legacyVym.f1 ?? 0) || bestVymF1.count > legacyVym.count,
        improved1023Maintained: (best1023F1.f1 ?? 0) >= (legacy1023.f1 ?? 0),
      },
      insightJa: [
        `旧固定ATR 1023: F1=${legacy1023.f1} 通過${legacy1023.count} FP${legacy1023.FP}`,
        `旧固定ATR VYM: F1=${legacyVym.f1 ?? '—'} 通過${legacyVym.count} FN${legacyVym.FN}`,
        `比率ルール1023 F1最大: >=${best1023F1.atrRatioMin} (F1=${best1023F1.f1}, 通過${best1023F1.count})`,
        `比率ルールVYM F1最大: >=${bestVymF1.atrRatioMin} (F1=${bestVymF1.f1 ?? '—'}, 通過${bestVymF1.count}, FP${bestVymF1.FP})`,
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-1023-atr-ratio-grid.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== ATR RATIO GRID ===\n', JSON.stringify(report, null, 2));
  }, 120_000);
});
