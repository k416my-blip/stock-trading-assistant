/**
 * 1023.KL buy — ATR 1.85/1.90/1.95/2.00% 閾値比較
 * npx vitest run tests/unit/openAi1023AtrFineGrid.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const SYMBOL = '1023';
const YAHOO = '1023.KL';

const RULE = {
  volumeMax: 1.2,
  atrMaxPct: 2.5,
  consecutiveBuyMax: 8,
  takeProfitPct: 4,
  stopLossPct: -3,
  maxHoldOffset: 20,
};

const ATR_THRESHOLDS = [1.85, 1.9, 1.95, 2.0] as const;

type OhlcBar = { date: string; high: number; low: number; close: number };
type DailyBar = { date: string; close: number };

type BuyCase = {
  date: string;
  atrPct: number | null;
  returnPct: number | null;
  actualWin: boolean | null;
  maxDrawdownPct: number | null;
  rulePasses: boolean;
};

type Row = {
  atrMinPct: number;
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

function passesEntry(vol: number | null, atr: number | null, consec: number, atrMin: number): boolean {
  if (vol == null || vol >= RULE.volumeMax) return false;
  if (atr == null || atr < atrMin || atr >= RULE.atrMaxPct) return false;
  if (consec > RULE.consecutiveBuyMax) return false;
  return true;
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
): { returnPct: number; entryIdx: number; exitIdx: number } | null {
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
    if (bar.low <= stopPrice) return { returnPct: RULE.stopLossPct, entryIdx, exitIdx: i };
    if (bar.high >= targetPrice) return { returnPct: RULE.takeProfitPct, entryIdx, exitIdx: i };
  }
  return {
    returnPct: Math.round(((daily[lastIdx]!.close / entry - 1) * 100) * 10000) / 10000,
    entryIdx,
    exitIdx: lastIdx,
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

function buildRow(threshold: number, cases: BuyCase[]): Row {
  const evaluated = cases.filter((c) => c.returnPct != null);
  let TP = 0;
  let FP = 0;
  let FN = 0;
  let TN = 0;
  for (const c of evaluated) {
    const pred = c.rulePasses;
    const actual = c.actualWin!;
    if (pred && actual) TP += 1;
    else if (pred && !actual) FP += 1;
    else if (!pred && actual) FN += 1;
    else TN += 1;
  }
  const predictedPositive = evaluated.filter((c) => c.rulePasses);
  const precision = TP + FP > 0 ? round3(TP / (TP + FP)) : null;
  const recall = TP + FN > 0 ? round3(TP / (TP + FN)) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? round3((2 * precision * recall) / (precision + recall))
      : null;
  return {
    atrMinPct: threshold,
    count: predictedPositive.length,
    TP,
    FP,
    FN,
    TN,
    precision,
    recall,
    f1,
    expectancyPct: mean(predictedPositive.map((c) => c.returnPct!)),
    maxDrawdownPct:
      predictedPositive.length > 0
        ? Math.round(Math.min(...predictedPositive.map((c) => c.maxDrawdownPct ?? 0)) * 100) / 100
        : null,
  };
}

describe('1023.KL ATR fine grid', () => {
  it('writes ATR 1.85-2.00 comparison JSON', async () => {
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

    type Base = {
      date: string;
      vol: number | null;
      atrPct: number | null;
      consec: number;
      returnPct: number | null;
      actualWin: boolean | null;
      maxDrawdownPct: number | null;
    };
    const baseCases: Base[] = [];

    for (const o of symbolObs.filter((x) => x.openAiAction === 'buy')) {
      const vol = volMap.get(`${o.date}|${o.symbol}`) ?? null;
      const consec = consecByKey.get(`${o.date}|${o.symbol}`) ?? 0;
      const idx = daily.findIndex((b) => b.date === o.date);
      const atrPct = idx >= 0 ? computeAtrPctAt(ohlc, idx) : null;
      let returnPct: number | null = null;
      let maxDrawdownPct: number | null = null;
      if (idx >= 0) {
        const sim = simulateTpSl(ohlc, daily, idx);
        if (sim) {
          returnPct = sim.returnPct;
          maxDrawdownPct = pathMaxDrawdownPct(daily, sim.entryIdx, sim.exitIdx, daily[sim.entryIdx]!.close);
        }
      }
      baseCases.push({ date: o.date, vol, atrPct, consec, returnPct, actualWin: returnPct != null ? returnPct > 0 : null, maxDrawdownPct });
    }

    const comparisonTable = ATR_THRESHOLDS.map((t) => {
      const cases: BuyCase[] = baseCases.map((b) => ({
        date: b.date,
        atrPct: b.atrPct,
        returnPct: b.returnPct,
        actualWin: b.actualWin,
        maxDrawdownPct: b.maxDrawdownPct,
        rulePasses: passesEntry(b.vol, b.atrPct, b.consec, t),
      }));
      const row = buildRow(t, cases);
      const passed = cases.filter((c) => c.rulePasses);
      return {
        ...row,
        passedDates: passed.map((c) => ({
          date: c.date,
          atrPct: c.atrPct,
          tpSlReturnPct: c.returnPct,
          actualWin: c.actualWin,
        })),
        droppedFromPrev:
          t === ATR_THRESHOLDS[0]
            ? baseCases
                .filter((b) => passesEntry(b.vol, b.atrPct, b.consec, 1.5) && !passesEntry(b.vol, b.atrPct, b.consec, t))
                .map((b) => ({ date: b.date, atrPct: b.atrPct, actualWin: b.actualWin }))
            : undefined,
      };
    });

    const baseline15 = buildRow(
      1.5,
      baseCases.map((b) => ({
        date: b.date,
        atrPct: b.atrPct,
        returnPct: b.returnPct,
        actualWin: b.actualWin,
        maxDrawdownPct: b.maxDrawdownPct,
        rulePasses: passesEntry(b.vol, b.atrPct, b.consec, 1.5),
      })),
    );

    const report = {
      methodologyJa: {
        scope: '1023.KL・OpenAI buyのみ',
        sharedFilters: `出来高<${RULE.volumeMax}・ATR<${RULE.atrMaxPct}%・連続buy<=${RULE.consecutiveBuyMax}`,
        exit: '+4%利確 & -3%損切り',
        thresholds: ATR_THRESHOLDS,
      },
      buyCount: baseCases.length,
      baselineAtr15: baseline15,
      comparisonTable,
      insightJa: [
        `1023 buy: ${baseCases.length}件`,
        ...comparisonTable.map(
          (r) =>
            `ATR>=${r.atrMinPct}%: 件数${r.count} TP${r.TP} FP${r.FP} Prec${r.precision} Rec${r.recall} 期待値${r.expectancyPct}% MaxDD${r.maxDrawdownPct}%`,
        ),
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-1023-atr-fine-grid.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== ATR FINE GRID ===\n', JSON.stringify(report, null, 2));
  });
});
