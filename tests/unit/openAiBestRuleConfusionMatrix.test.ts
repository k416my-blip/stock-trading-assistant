/**
 * 最良ルール — buy/hold/sell コホート別混同行列（+4%TP / -3%SL）
 * npx vitest run tests/unit/openAiBestRuleConfusionMatrix.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { SAMPLE_STOCKS } from '../../src/data/sampleStocks';
import { toYahooSymbol, type DailyBar, type ProbeSymbol } from '../helpers/buyAction30dAudit';
import type { AiSecondEvaluatorAction } from '../../src/types/aiSecondEvaluator';

const BEST_RULE = {
  volumeMax: 1.2,
  atrMinPct: 1.5,
  atrMaxPct: 2.5,
  consecutiveBuyMax: 8,
  takeProfitPct: 4,
  stopLossPct: -3,
  maxHoldOffset: 20,
};

type OhlcBar = { date: string; high: number; low: number; close: number };

type ObsRow = {
  date: string;
  symbol: string;
  openAiAction: AiSecondEvaluatorAction;
};

type EvalRow = ObsRow & {
  volumeSurgeRatio: number | null;
  atrPct: number | null;
  consecutiveBuyNumber: number;
  rulePasses: boolean;
  returnPct: number | null;
  actualWin: boolean | null;
  exitReason: 'takeProfit' | 'stopLoss' | 'maxHold' | null;
  maxDrawdownPct: number | null;
};

type Confusion = {
  TP: number;
  FP: number;
  FN: number;
  TN: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  expectancyPct: number | null;
  avgReturnPredictedPositivePct: number | null;
  avgReturnActualPositivePct: number | null;
  maxDrawdownPct: number | null;
  avgHoldDays: number | null;
  winRatePredictedPct: number | null;
  sampleCount: number;
  rulePassCount: number;
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

function buildConfusion(rows: EvalRow[]): Confusion {
  const evaluated = rows.filter((r) => r.returnPct != null);
  const skipped = rows.length - evaluated.length;

  let TP = 0;
  let FP = 0;
  let FN = 0;
  let TN = 0;

  for (const r of evaluated) {
    const pred = r.rulePasses;
    const actual = r.actualWin!;
    if (pred && actual) TP += 1;
    else if (pred && !actual) FP += 1;
    else if (!pred && actual) FN += 1;
    else TN += 1;
  }

  const precision = TP + FP > 0 ? round3(TP / (TP + FP)) : null;
  const recall = TP + FN > 0 ? round3(TP / (TP + FN)) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? round3((2 * precision * recall) / (precision + recall))
      : null;

  const predictedPositive = evaluated.filter((r) => r.rulePasses);
  const actualPositive = evaluated.filter((r) => r.actualWin);
  const strategyExpectancy = mean(predictedPositive.map((r) => r.returnPct!));
  const maxDrawdownPct =
    predictedPositive.length > 0
      ? Math.round(Math.min(...predictedPositive.map((r) => r.maxDrawdownPct ?? 0)) * 100) / 100
      : null;

  return {
    TP,
    FP,
    FN,
    TN,
    precision,
    recall,
    f1,
    expectancyPct: strategyExpectancy,
    avgReturnPredictedPositivePct: strategyExpectancy,
    avgReturnActualPositivePct: mean(actualPositive.map((r) => r.returnPct!)),
    maxDrawdownPct,
    avgHoldDays: null,
    winRatePredictedPct:
      predictedPositive.length > 0
        ? Math.round((predictedPositive.filter((r) => r.returnPct! > 0).length / predictedPositive.length) * 1000) / 10
        : null,
    sampleCount: rows.length,
    rulePassCount: rows.filter((r) => r.rulePasses).length,
    simSkippedCount: skipped,
  };
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
): { returnPct: number; exitReason: 'takeProfit' | 'stopLoss' | 'maxHold'; maxDrawdownPct: number } | null {
  const entryIdx = signalIdx + 1;
  if (entryIdx >= daily.length) return null;
  const entry = daily[entryIdx]!.close;
  if (entry <= 0) return null;

  const stopPrice = entry * (1 + BEST_RULE.stopLossPct / 100);
  const targetPrice = entry * (1 + BEST_RULE.takeProfitPct / 100);
  const lastIdx = Math.min(signalIdx + BEST_RULE.maxHoldOffset, daily.length - 1);
  if (lastIdx <= entryIdx) return null;

  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = ohlc[i]!;
    if (bar.low <= stopPrice) {
      return {
        returnPct: BEST_RULE.stopLossPct,
        exitReason: 'stopLoss',
        maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, i, entry),
      };
    }
    if (bar.high >= targetPrice) {
      return {
        returnPct: BEST_RULE.takeProfitPct,
        exitReason: 'takeProfit',
        maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, i, entry),
      };
    }
  }

  const exit = daily[lastIdx]!.close;
  return {
    returnPct: Math.round(((exit / entry - 1) * 100) * 10000) / 10000,
    exitReason: 'maxHold',
    maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, lastIdx, entry),
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

function passesEntryFilters(vol: number | null, atr: number | null, consec: number): boolean {
  if (vol == null || vol >= BEST_RULE.volumeMax) return false;
  if (atr == null || atr < BEST_RULE.atrMinPct || atr >= BEST_RULE.atrMaxPct) return false;
  if (consec > BEST_RULE.consecutiveBuyMax) return false;
  return true;
}

function passesBestRule(vol: number | null, atr: number | null, consec: number, action: AiSecondEvaluatorAction): boolean {
  return action === 'buy' && passesEntryFilters(vol, atr, consec);
}

describe('OpenAI best rule confusion matrix', () => {
  it(
    'writes buy/hold/sell cohort confusion JSON',
    async () => {
      const obs = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
      ) as ObsRow[];
      const reg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
      ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
      const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

      const consecByKey = new Map<string, number>();
      const bySym = new Map<string, ObsRow[]>();
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
      const evaluated: EvalRow[] = [];

      for (const o of obs) {
        const vol = volMap.get(`${o.date}|${o.symbol}`) ?? null;
        const yahoo = toYahooSymbol(o.symbol, resolveMarket(o.symbol));
        if (!ohlcCache.has(yahoo)) ohlcCache.set(yahoo, await fetchYahooOhlcv(yahoo));
        const ohlc = ohlcCache.get(yahoo)!;
        const daily: DailyBar[] = ohlc.map((b) => ({ date: b.date, close: b.close }));
        const signalIdx = daily.findIndex((b) => b.date === o.date);
        const atrPct = signalIdx >= 0 ? computeAtrPctAt(ohlc, signalIdx) : null;
        const consec = consecByKey.get(`${o.date}|${o.symbol}`) ?? 0;

        const rulePasses = passesBestRule(vol, atrPct, consec, o.openAiAction);
        let returnPct: number | null = null;
        let exitReason: EvalRow['exitReason'] = null;
        let maxDrawdownPct: number | null = null;
        if (signalIdx >= 0) {
          const sim = simulateTpSl(ohlc, daily, signalIdx);
          if (sim) {
            returnPct = sim.returnPct;
            exitReason = sim.exitReason;
            maxDrawdownPct = sim.maxDrawdownPct;
          }
        }

        evaluated.push({
          ...o,
          volumeSurgeRatio: vol,
          atrPct,
          consecutiveBuyNumber: consec,
          rulePasses,
          returnPct,
          actualWin: returnPct != null ? returnPct > 0 : null,
          exitReason,
          maxDrawdownPct,
        });
      }

      const buyRows = evaluated.filter((r) => r.openAiAction === 'buy');
      const holdRows = evaluated.filter((r) => r.openAiAction === 'hold');
      const sellRows = evaluated.filter((r) => r.openAiAction === 'sell');

      const holdWithEntryFilters = holdRows.map((r) => ({
        ...r,
        rulePasses: passesEntryFilters(r.volumeSurgeRatio, r.atrPct, r.consecutiveBuyNumber),
      }));

      const buyHoldSellCombined = [
        ...buyRows,
        ...holdWithEntryFilters,
        ...sellRows,
      ];

      const confusionByCohort = {
        buy: buildConfusion(buyRows),
        hold: buildConfusion(holdWithEntryFilters),
        sell: buildConfusion(sellRows),
        buyHoldSell: buildConfusion(buyHoldSellCombined),
      };

      const report = {
        methodologyJa: {
          scope: '304観測の buy / hold / sell（sellは0件）',
          bestRule: {
            entry: 'OpenAI buy かつ 出来高<1.2 かつ ATR1.5-2.5% かつ 連続buy<=8',
            exit: '+4%利確 & -3%損切り（未達20営業日）',
          },
          predictedPositive: '最良ルールのエントリー条件を満たす（= 実際にエントリー推奨）',
          actualPositive: 'ロングエントリー後のシミュレーションリターン > 0',
          confusion: {
            TP: 'ルール通過 & 勝ち',
            FP: 'ルール通過 & 負け',
            FN: 'ルール不通過 & 勝ち（取り逃し）',
            TN: 'ルール不通過 & 負け',
          },
          expectancyPct: 'ルール通過案件のみの平均リターン（実運用期待値）',
          holdNote:
            'holdコホート: OpenAIラベルはholdのまま、エントリー条件（出来高・ATR・連続buy）のみ適用してロング可否を判定',
          sellNote: '304観測に sell ラベルは存在しない',
          buyHoldSellNote: 'buy=最良ルール全体、hold=エントリー条件のみ、sell=0件',
        },
        actionCounts: {
          buy: buyRows.length,
          hold: holdRows.length,
          sell: sellRows.length,
          watch: evaluated.filter((r) => r.openAiAction === 'watch').length,
          reduce: evaluated.filter((r) => r.openAiAction === 'reduce').length,
        },
        confusionByCohort,
        rulePassDetails: {
          buyRulePass: buyRows.filter((r) => r.rulePasses).length,
          buyTotal: buyRows.length,
          holdEntryFilterPass: holdWithEntryFilters.filter((r) => r.rulePasses).length,
          holdTotal: holdRows.length,
        },
        insightJa: [
          `buy: TP=${confusionByCohort.buy.TP} FP=${confusionByCohort.buy.FP} FN=${confusionByCohort.buy.FN} TN=${confusionByCohort.buy.TN}`,
          `buy Precision=${confusionByCohort.buy.precision} Recall=${confusionByCohort.buy.recall} 期待値=${confusionByCohort.buy.expectancyPct}%`,
          `hold(条件のみ): TP=${confusionByCohort.hold.TP} FP=${confusionByCohort.hold.FP} FN=${confusionByCohort.hold.FN} TN=${confusionByCohort.hold.TN}`,
          `sell: 観測0件`,
        ],
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-best-rule-confusion-matrix.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== CONFUSION MATRIX ===\n', JSON.stringify(report, null, 2));
    },
    180_000,
  );
});
