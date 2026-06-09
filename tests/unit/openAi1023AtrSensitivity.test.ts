/**
 * 1023.KL — ルール通過10件のATR閾値感度分析
 * npx vitest run tests/unit/openAi1023AtrSensitivity.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const SYMBOL = '1023';
const YAHOO = '1023.KL';

const BASE_RULE = {
  volumeMax: 1.2,
  atrMaxPct: 2.5,
  consecutiveBuyMax: 8,
  takeProfitPct: 4,
  stopLossPct: -3,
  maxHoldOffset: 20,
};

const ATR_THRESHOLDS = [1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1] as const;

type OhlcBar = { date: string; high: number; low: number; close: number };
type DailyBar = { date: string; close: number };

type RulePassCase = {
  date: string;
  atrPct: number;
  tpSlReturnPct: number;
  actualWin: boolean;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function simulateTpSl(
  ohlc: OhlcBar[],
  daily: DailyBar[],
  signalIdx: number,
): { returnPct: number } | null {
  const entryIdx = signalIdx + 1;
  if (entryIdx >= daily.length) return null;
  const entry = daily[entryIdx]!.close;
  if (entry <= 0) return null;
  const stopPrice = entry * (1 + BASE_RULE.stopLossPct / 100);
  const targetPrice = entry * (1 + BASE_RULE.takeProfitPct / 100);
  const lastIdx = Math.min(signalIdx + BASE_RULE.maxHoldOffset, daily.length - 1);
  if (lastIdx <= entryIdx) return null;
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = ohlc[i]!;
    if (bar.low <= stopPrice) return { returnPct: BASE_RULE.stopLossPct };
    if (bar.high >= targetPrice) return { returnPct: BASE_RULE.takeProfitPct };
  }
  return {
    returnPct: Math.round(((daily[lastIdx]!.close / entry - 1) * 100) * 10000) / 10000,
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

function passesBaseRule(vol: number | null, atr: number | null, consec: number): boolean {
  if (vol == null || vol >= BASE_RULE.volumeMax) return false;
  if (atr == null || atr < 1.5 || atr >= BASE_RULE.atrMaxPct) return false;
  if (consec > BASE_RULE.consecutiveBuyMax) return false;
  return true;
}

function sensitivityRow(threshold: number, universe: RulePassCase[]) {
  const subset = universe.filter((c) => c.atrPct >= threshold && c.atrPct < BASE_RULE.atrMaxPct);
  const TP = subset.filter((c) => c.actualWin).length;
  const FP = subset.filter((c) => !c.actualWin).length;
  const FN = universe.filter((c) => c.actualWin && !(c.atrPct >= threshold && c.atrPct < BASE_RULE.atrMaxPct)).length;
  const TN = universe.filter((c) => !c.actualWin && !(c.atrPct >= threshold && c.atrPct < BASE_RULE.atrMaxPct)).length;
  const precision = TP + FP > 0 ? round3(TP / (TP + FP)) : null;
  const recall = TP + FN > 0 ? round3(TP / (TP + FN)) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? round3((2 * precision * recall) / (precision + recall))
      : null;
  const expectancyPct = mean(subset.map((c) => c.tpSlReturnPct));

  return {
    atrMinPct: threshold,
    count: subset.length,
    TP,
    FP,
    FN,
    TN,
    precision,
    recall,
    f1,
    expectancyPct,
    droppedDates: universe
      .filter((c) => !(c.atrPct >= threshold && c.atrPct < BASE_RULE.atrMaxPct))
      .map((c) => ({ date: c.date, atrPct: c.atrPct, actualWin: c.actualWin })),
  };
}

describe('1023.KL ATR threshold sensitivity', () => {
  it('writes ATR sensitivity JSON for 10 rule-pass cases', async () => {
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

    const ohlc = await fetchYahooOhlcv(YAHOO);
    const daily: DailyBar[] = ohlc.map((b) => ({ date: b.date, close: b.close }));

    const universe: RulePassCase[] = [];
    for (const o of symbolObs.filter((x) => x.openAiAction === 'buy')) {
      const vol = volMap.get(`${o.date}|${o.symbol}`) ?? null;
      const consec = consecByKey.get(`${o.date}|${o.symbol}`) ?? 0;
      const idx = daily.findIndex((b) => b.date === o.date);
      if (idx < 0) continue;
      const atrPct = computeAtrPctAt(ohlc, idx);
      if (!passesBaseRule(vol, atrPct, consec)) continue;
      const sim = simulateTpSl(ohlc, daily, idx);
      if (!sim || atrPct == null) continue;
      universe.push({
        date: o.date,
        atrPct,
        tpSlReturnPct: sim.returnPct,
        actualWin: sim.returnPct > 0,
      });
    }

    universe.sort((a, b) => a.date.localeCompare(b.date));

    const sensitivityTable = ATR_THRESHOLDS.map((t) => sensitivityRow(t, universe));
    const bestByExpectancy = [...sensitivityTable].sort(
      (a, b) => (b.expectancyPct ?? -999) - (a.expectancyPct ?? -999),
    )[0]!;
    const bestPerfect = sensitivityTable.find((r) => r.FP === 0 && r.TP > 0);

    const report = {
      methodologyJa: {
        scope: '1023.KL・現行ルール通過10件を母集団',
        fixedFilters: 'OpenAI buy・出来高<1.2・連続buy<=8・ATR<2.5%',
        exit: '+4%利確 & -3%損切り',
        varying: 'ATR下限のみ（1.5〜2.1）',
        recall: 'TP / (TP+FN) — 母集団10件中の実際の勝ち案件の捕捉率',
        precision: 'TP / (TP+FP)',
        expectancyPct: '閾値通過案件の平均TP/SLリターン',
      },
      universeCount: universe.length,
      universeCases: universe,
      sensitivityTable,
      optimalThreshold: {
        byExpectancy: bestByExpectancy,
        firstZeroFp: bestPerfect ?? null,
      },
      insightJa: [
        `母集団: ${universe.length}件 (TP=${universe.filter((c) => c.actualWin).length} FP=${universe.filter((c) => !c.actualWin).length})`,
        bestPerfect
          ? `FP=0初回: ATR>=${bestPerfect.atrMinPct}% (件数${bestPerfect.count}・期待値${bestPerfect.expectancyPct}%)`
          : null,
        `期待値最大: ATR>=${bestByExpectancy.atrMinPct}% (${bestByExpectancy.expectancyPct}%)`,
      ].filter(Boolean),
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-1023-atr-sensitivity.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== ATR SENSITIVITY ===\n', JSON.stringify(report, null, 2));
  });
});
