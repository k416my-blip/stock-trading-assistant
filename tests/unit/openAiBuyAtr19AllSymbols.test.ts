/**
 * 全銘柄 buy — ATR>=1.5% vs ATR>=1.9% 比較（+4%TP/-3%SL）
 * npx vitest run tests/unit/openAiBuyAtr19AllSymbols.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { SAMPLE_STOCKS } from '../../src/data/sampleStocks';
import { toYahooSymbol, type DailyBar, type ProbeSymbol } from '../helpers/buyAction30dAudit';

const RULE = {
  volumeMax: 1.2,
  atrMaxPct: 2.5,
  consecutiveBuyMax: 8,
  takeProfitPct: 4,
  stopLossPct: -3,
  maxHoldOffset: 20,
};

const ATR_MIN_VARIANTS = {
  current: { id: 'atr_15', labelJa: '現行ルール ATR>=1.5%', atrMinPct: 1.5 },
  new: { id: 'atr_19', labelJa: '新ルール ATR>=1.9%', atrMinPct: 1.9 },
} as const;

type OhlcBar = { date: string; high: number; low: number; close: number };

type BuyEval = {
  date: string;
  symbol: string;
  yahooSymbol: string;
  volumeSurgeRatio: number | null;
  atrPct: number | null;
  consecutiveBuyNumber: number;
  returnPct: number | null;
  actualWin: boolean | null;
  maxDrawdownPct: number | null;
  rulePasses15: boolean;
  rulePasses19: boolean;
};

type ConfusionResult = {
  ruleId: string;
  labelJa: string;
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
  simEvaluatedCount: number;
  simSkippedCount: number;
};

const MARKET_BY_SYMBOL = Object.fromEntries(
  SAMPLE_STOCKS.map((s) => [s.symbol, s.market as ProbeSymbol['market']]),
) as Record<string, ProbeSymbol['market']>;

function resolveMarket(symbol: string): ProbeSymbol['market'] {
  return MARKET_BY_SYMBOL[symbol] ?? (/^\d+$/.test(symbol) ? 'bursa' : 'us');
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function passesEntry(
  vol: number | null,
  atr: number | null,
  consec: number,
  atrMin: number,
): boolean {
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
): { returnPct: number; exitIdx: number; entryIdx: number } | null {
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
    if (bar.low <= stopPrice) {
      return { returnPct: RULE.stopLossPct, exitIdx: i, entryIdx };
    }
    if (bar.high >= targetPrice) {
      return { returnPct: RULE.takeProfitPct, exitIdx: i, entryIdx };
    }
  }
  return {
    returnPct: Math.round(((daily[lastIdx]!.close / entry - 1) * 100) * 10000) / 10000,
    exitIdx: lastIdx,
    entryIdx,
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

function buildConfusion(rows: BuyEval[], ruleKey: 'rulePasses15' | 'rulePasses19', atrMin: number): ConfusionResult {
  const evaluated = rows.filter((r) => r.returnPct != null);
  const skipped = rows.length - evaluated.length;

  let TP = 0;
  let FP = 0;
  let FN = 0;
  let TN = 0;

  for (const r of evaluated) {
    const pred = r[ruleKey];
    const actual = r.actualWin!;
    if (pred && actual) TP += 1;
    else if (pred && !actual) FP += 1;
    else if (!pred && actual) FN += 1;
    else TN += 1;
  }

  const predictedPositive = evaluated.filter((r) => r[ruleKey]);
  const precision = TP + FP > 0 ? round3(TP / (TP + FP)) : null;
  const recall = TP + FN > 0 ? round3(TP / (TP + FN)) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? round3((2 * precision * recall) / (precision + recall))
      : null;

  const variant = atrMin === 1.5 ? ATR_MIN_VARIANTS.current : ATR_MIN_VARIANTS.new;

  return {
    ruleId: variant.id,
    labelJa: variant.labelJa,
    atrMinPct: atrMin,
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
    simEvaluatedCount: evaluated.length,
    simSkippedCount: skipped,
  };
}

function symbolBreakdown(rows: BuyEval[], ruleKey: 'rulePasses15' | 'rulePasses19', atrMin: number) {
  const symbols = [...new Set(rows.map((r) => r.symbol))].sort();
  return symbols.map((sym) => {
    const symRows = rows.filter((r) => r.symbol === sym);
    const c = buildConfusion(symRows, ruleKey, atrMin);
    return { symbol: sym, yahooSymbol: symRows[0]?.yahooSymbol ?? '', ...c };
  });
}

describe('buy ATR 1.9% all symbols', () => {
  it(
    'writes ATR 1.5 vs 1.9 comparison JSON',
    async () => {
      const obs = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
      ) as Array<{ date: string; symbol: string; openAiAction: string }>;
      const reg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
      ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
      const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

      const allObs = obs.sort((a, b) => a.date.localeCompare(b.date));
      const consecByKey = new Map<string, number>();
      const bySym = new Map<string, typeof allObs>();
      for (const o of allObs) {
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
      const buyRows: BuyEval[] = [];

      for (const o of allObs.filter((x) => x.openAiAction === 'buy')) {
        const vol = volMap.get(`${o.date}|${o.symbol}`) ?? null;
        const consec = consecByKey.get(`${o.date}|${o.symbol}`) ?? 0;
        const yahoo = toYahooSymbol(o.symbol, resolveMarket(o.symbol));
        if (!ohlcCache.has(yahoo)) ohlcCache.set(yahoo, await fetchYahooOhlcv(yahoo));
        const ohlc = ohlcCache.get(yahoo)!;
        const daily: DailyBar[] = ohlc.map((b) => ({ date: b.date, close: b.close }));
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

        buyRows.push({
          date: o.date,
          symbol: o.symbol,
          yahooSymbol: yahoo,
          volumeSurgeRatio: vol,
          atrPct,
          consecutiveBuyNumber: consec,
          returnPct,
          actualWin: returnPct != null ? returnPct > 0 : null,
          maxDrawdownPct,
          rulePasses15: passesEntry(vol, atrPct, consec, 1.5),
          rulePasses19: passesEntry(vol, atrPct, consec, 1.9),
        });
      }

      const overall = {
        current: buildConfusion(buyRows, 'rulePasses15', 1.5),
        newRule: buildConfusion(buyRows, 'rulePasses19', 1.9),
      };

      const delta = {
        count: (overall.newRule.count ?? 0) - (overall.current.count ?? 0),
        TP: overall.newRule.TP - overall.current.TP,
        FP: overall.newRule.FP - overall.current.FP,
        FN: overall.newRule.FN - overall.current.FN,
        expectancyPct:
          overall.newRule.expectancyPct != null && overall.current.expectancyPct != null
            ? Math.round((overall.newRule.expectancyPct - overall.current.expectancyPct) * 100) / 100
            : null,
      };

      const report = {
        methodologyJa: {
          scope: '304観測・OpenAI buyのみ（24件）',
          sharedFilters: `出来高<${RULE.volumeMax}・ATR<${RULE.atrMaxPct}%・連続buy<=${RULE.consecutiveBuyMax}`,
          exit: '+4%利確 & -3%損切り（未達20営業日）',
          comparison: 'ATR下限 1.5% vs 1.9%',
          confusion: '全buyを評価対象（シミュレーション可能件のみ）',
        },
        buyTotal: buyRows.length,
        overallComparison: overall,
        deltaNewMinusCurrent: delta,
        bySymbol: {
          current: symbolBreakdown(buyRows, 'rulePasses15', 1.5),
          newRule: symbolBreakdown(buyRows, 'rulePasses19', 1.9),
        },
        insightJa: [
          `buy合計: ${buyRows.length}件 (シミュレーション可能: ${overall.current.simEvaluatedCount})`,
          `現行: 件数${overall.current.count} TP${overall.current.TP} FP${overall.current.FP} 期待値${overall.current.expectancyPct}%`,
          `新ルール: 件数${overall.newRule.count} TP${overall.newRule.TP} FP${overall.newRule.FP} 期待値${overall.newRule.expectancyPct}%`,
          `FP削減: ${overall.current.FP}→${overall.newRule.FP} (Δ${delta.FP})`,
        ],
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-buy-atr19-all-symbols.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== ATR 1.9 ALL SYMBOLS ===\n', JSON.stringify(report, null, 2));
    },
    300_000,
  );
});
