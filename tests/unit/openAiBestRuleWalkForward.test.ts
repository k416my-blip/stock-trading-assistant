/**
 * ベストルール固定 — 2023〜2026 年別ウォークフォワード + 学習/検証分離
 * npx vitest run tests/unit/openAiBestRuleWalkForward.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { SAMPLE_STOCKS } from '../../src/data/sampleStocks';
import { toYahooSymbol, type DailyBar, type ProbeSymbol } from '../helpers/buyAction30dAudit';
import type { AiSecondEvaluatorAction } from '../../src/types/aiSecondEvaluator';

const BEST_RULE = {
  volumeMax: 1.2,
  atrMinPct: 1.85,
  atrMaxPct: 2.5,
  consecutiveBuyMax: 8,
  takeProfitPct: 4,
  stopLossPct: -3,
  maxHoldOffset: 20,
};

const YEARS = [2023, 2024, 2025, 2026] as const;

const TRAIN_PERIOD = { start: '2026-04-16', end: '2026-04-30', labelJa: '学習期間（ATR1.85/TP4%チューニングクラスター）' };
const VALID_PERIOD = { start: '2026-05-01', end: '2026-12-31', labelJa: '検証期間（2026年5月以降・OOS）' };

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
  maxDrawdownPct: number | null;
};

type WfMetrics = {
  periodLabel: string;
  dateRange: { start: string | null; end: string | null };
  openAiBuyCount: number;
  evaluatedCount: number;
  rulePassCount: number;
  TP: number;
  FP: number;
  FN: number;
  TN: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  expectancyPct: number | null;
  maxDrawdownPct: number | null;
  simSkippedCount: number;
  dataAvailable: boolean;
  noteJa?: string;
};

const MARKET_BY_SYMBOL = Object.fromEntries(
  SAMPLE_STOCKS.map((s) => [s.symbol, s.market as ProbeSymbol['market']]),
) as Record<string, ProbeSymbol['market']>;

function resolveMarket(symbol: string): ProbeSymbol['market'] {
  return MARKET_BY_SYMBOL[symbol] ?? (/^\d+$/.test(symbol) ? 'bursa' : 'us');
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function buildMetrics(label: string, rows: EvalRow[], range?: { start: string; end: string }): WfMetrics {
  const scoped = range ? rows.filter((r) => inRange(r.date, range.start, range.end)) : rows;
  const buyRows = scoped.filter((r) => r.openAiAction === 'buy');
  const evaluated = buyRows.filter((r) => r.returnPct != null);

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

  return {
    periodLabel: label,
    dateRange: {
      start: scoped.length > 0 ? scoped[0]!.date : null,
      end: scoped.length > 0 ? scoped[scoped.length - 1]!.date : null,
    },
    openAiBuyCount: buyRows.length,
    evaluatedCount: evaluated.length,
    rulePassCount: predictedPositive.length,
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
    simSkippedCount: buyRows.length - evaluated.length,
    dataAvailable: buyRows.length > 0,
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
): { returnPct: number; maxDrawdownPct: number } | null {
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
        maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, i, entry),
      };
    }
    if (bar.high >= targetPrice) {
      return {
        returnPct: BEST_RULE.takeProfitPct,
        maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, i, entry),
      };
    }
  }

  const exit = daily[lastIdx]!.close;
  return {
    returnPct: Math.round(((exit / entry - 1) * 100) * 10000) / 10000,
    maxDrawdownPct: pathMaxDrawdownPct(daily, entryIdx, lastIdx, entry),
  };
}

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcBar[]> {
  const period1 = Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&period1=${period1}&period2=${period2}`;
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

function passesBestRule(vol: number | null, atr: number | null, consec: number, action: AiSecondEvaluatorAction): boolean {
  if (action !== 'buy') return false;
  if (vol == null || vol >= BEST_RULE.volumeMax) return false;
  if (atr == null || atr < BEST_RULE.atrMinPct || atr >= BEST_RULE.atrMaxPct) return false;
  if (consec > BEST_RULE.consecutiveBuyMax) return false;
  return true;
}

function judgeOverfitting(train: WfMetrics, test: WfMetrics): {
  verdictJa: string;
  signals: string[];
  trainTestDelta: Record<string, number | null>;
} {
  const signals: string[] = [];
  const delta = {
    precision: train.precision != null && test.precision != null ? round3(test.precision - train.precision) : null,
    recall: train.recall != null && test.recall != null ? round3(test.recall - train.recall) : null,
    f1: train.f1 != null && test.f1 != null ? round3(test.f1 - train.f1) : null,
    expectancyPct:
      train.expectancyPct != null && test.expectancyPct != null
        ? Math.round((test.expectancyPct - train.expectancyPct) * 100) / 100
        : null,
  };

  if (!test.dataAvailable || test.rulePassCount === 0) {
    signals.push('検証期間にルール通過案件が0件 — OOS性能は未検証');
  }
  if (train.f1 === 1 && test.f1 != null && test.f1 < 1) {
    signals.push(`学習F1=1.0 → 検証F1=${test.f1}（精度劣化）`);
  }
  if (test.FP > 0) {
    signals.push(`検証期間FP=${test.FP}（学習期間FP=${train.FP}）`);
  }
  if (train.expectancyPct != null && test.expectancyPct != null && test.expectancyPct < train.expectancyPct) {
    signals.push(`期待値: 学習${train.expectancyPct}% → 検証${test.expectancyPct}%`);
  }
  if (train.rulePassCount > 0 && test.rulePassCount === 0) {
    signals.push('検証期間はシグナル0件 — ルールが期間外で発火せず');
  }

  let verdictJa: string;
  if (!test.dataAvailable) {
    verdictJa = '判定不能（検証期間データなし）';
  } else if (test.rulePassCount === 0) {
    verdictJa = '過学習リスク中〜高（学習期間特化・OOS未発火）';
  } else if (train.FP === 0 && test.FP === 0 && train.f1 === 1 && test.f1 === 1) {
    verdictJa = '過学習兆候は限定的（OOSもFP0・F1維持）ただしサンプル極小';
  } else if (test.FP > 0 || (test.f1 != null && train.f1 != null && test.f1 < train.f1 - 0.1)) {
    verdictJa = '過学習の可能性あり（OOSで性能劣化）';
  } else {
    verdictJa = '過学習リスク中（学習期間でパラメータ固定・OOSサンプル小）';
  }

  return { verdictJa, signals, trainTestDelta: delta };
}

async function evaluateCohort(
  obs: ObsRow[],
  volMap: Map<string, number>,
  consecByKey: Map<string, number>,
  symbolFilter?: string,
): Promise<EvalRow[]> {
  const filtered = symbolFilter ? obs.filter((o) => o.symbol === symbolFilter) : obs;
  const ohlcCache = new Map<string, OhlcBar[]>();
  const evaluated: EvalRow[] = [];

  for (const o of filtered) {
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
    let maxDrawdownPct: number | null = null;
    if (signalIdx >= 0 && o.openAiAction === 'buy') {
      const sim = simulateTpSl(ohlc, daily, signalIdx);
      if (sim) {
        returnPct = sim.returnPct;
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
      maxDrawdownPct,
    });
  }

  return evaluated;
}

describe('OpenAI best rule walk-forward 2023-2026', () => {
  it(
    'writes year-by-year WF and train/test overfitting JSON',
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

      const obsDateRange = {
        start: obs.map((o) => o.date).sort()[0] ?? null,
        end: obs.map((o) => o.date).sort().at(-1) ?? null,
      };

      const allEval = await evaluateCohort(obs, volMap, consecByKey);
      const buyEval = allEval.filter((r) => r.openAiAction === 'buy');
      const eval1023 = await evaluateCohort(obs, volMap, consecByKey, '1023');
      const buy1023 = eval1023.filter((r) => r.openAiAction === 'buy');

      const yearByYearAll = YEARS.map((year) => {
        const yearStr = String(year);
        const yearBuy = buyEval.filter((r) => r.date.startsWith(yearStr));
        const m = buildMetrics(String(year), buyEval, { start: `${yearStr}-01-01`, end: `${yearStr}-12-31` });
        if (yearBuy.length === 0) {
          return {
            ...m,
            dataAvailable: false,
            noteJa: `OpenAI buy観測なし（304観測は${obsDateRange.start}〜${obsDateRange.end}のみ）`,
          };
        }
        return m;
      });

      const yearByYear1023 = YEARS.map((year) => {
        const yearStr = String(year);
        const yearBuy = buy1023.filter((r) => r.date.startsWith(yearStr));
        const m = buildMetrics(`${year} (1023.KL)`, buy1023, { start: `${yearStr}-01-01`, end: `${yearStr}-12-31` });
        if (yearBuy.length === 0) {
          return {
            ...m,
            dataAvailable: false,
            noteJa: `OpenAI buy観測なし（304観測は${obsDateRange.start}〜${obsDateRange.end}のみ）`,
          };
        }
        return m;
      });

      const trainAll = buildMetrics(TRAIN_PERIOD.labelJa, buyEval, TRAIN_PERIOD);
      const validAll = buildMetrics(VALID_PERIOD.labelJa, buyEval, VALID_PERIOD);
      const train1023 = buildMetrics(TRAIN_PERIOD.labelJa, buy1023, TRAIN_PERIOD);
      const valid1023 = buildMetrics(VALID_PERIOD.labelJa, buy1023, VALID_PERIOD);

      const overfitAll = judgeOverfitting(trainAll, validAll);
      const overfit1023 = judgeOverfitting(train1023, valid1023);

      const rollingWf1023 = [
        { trainEnd: '2026-04-24', testStart: '2026-04-25', testEnd: '2026-04-30' },
        { trainEnd: '2026-04-30', testStart: '2026-05-01', testEnd: '2026-05-15' },
        { trainEnd: '2026-04-30', testStart: '2026-05-16', testEnd: '2026-05-29' },
      ].map(({ trainEnd, testStart, testEnd }) => {
        const train = buildMetrics(`train〜${trainEnd}`, buy1023, { start: '2026-04-16', end: trainEnd });
        const test = buildMetrics(`test ${testStart}〜${testEnd}`, buy1023, { start: testStart, end: testEnd });
        return { train, test, overfitting: judgeOverfitting(train, test) };
      });

      const report = {
        methodologyJa: {
          fixedBestRule: {
            volume: `< ${BEST_RULE.volumeMax}`,
            atr: `${BEST_RULE.atrMinPct}% <= ATR < ${BEST_RULE.atrMaxPct}%`,
            consecutiveBuy: `<= ${BEST_RULE.consecutiveBuyMax}`,
            exit: `TP +${BEST_RULE.takeProfitPct}% / SL ${BEST_RULE.stopLossPct}%（未達${BEST_RULE.maxHoldOffset}営業日）`,
            prerequisite: 'OpenAI buy（304観測）',
          },
          cohort: '全銘柄 buy24件 + 1023.KL buy21件',
          observationWindow: obsDateRange,
          walkForwardLimitationJa:
            '304観測は2026-04-16〜2026-05-29の32営業日のみ。2023〜2025年はOpenAI buyラベルが存在せず年別WFは空。',
          trainTestSplit: {
            learningPeriod: TRAIN_PERIOD,
            validationPeriod: VALID_PERIOD,
            rationaleJa:
              'ATR>=1.85%・TP+4%は2026年4月1023クラスター（8件TP/0FP）で確定。4月=学習、5月以降=OOS検証。',
          },
          metrics: {
            predictedPositive: 'ベストルール通過（実エントリー）',
            actualPositive: 'TP/SLシミュ勝ち（return>0）',
            expectancyPct: 'ルール通過案件の平均リターン',
            maxDrawdownPct: 'ルール通過案件の最大パスDD（最悪値）',
          },
        },
        bestRule: BEST_RULE,
        yearByYear: {
          allSymbolsBuy: yearByYearAll,
          symbol1023Kl: yearByYear1023,
        },
        trainTestSplit: {
          allSymbolsBuy: { train: trainAll, validation: validAll, overfitting: overfitAll },
          symbol1023Kl: { train: train1023, validation: valid1023, overfitting: overfit1023 },
        },
        rollingWalkForward1023: rollingWf1023,
        detailRows: {
          allBuy: buyEval.map((r) => ({
            date: r.date,
            symbol: r.symbol,
            rulePasses: r.rulePasses,
            atrPct: r.atrPct,
            volumeSurgeRatio: r.volumeSurgeRatio,
            consecutiveBuyNumber: r.consecutiveBuyNumber,
            returnPct: r.returnPct,
            actualWin: r.actualWin,
            maxDrawdownPct: r.maxDrawdownPct,
          })),
          buy1023: buy1023.map((r) => ({
            date: r.date,
            rulePasses: r.rulePasses,
            atrPct: r.atrPct,
            volumeSurgeRatio: r.volumeSurgeRatio,
            consecutiveBuyNumber: r.consecutiveBuyNumber,
            returnPct: r.returnPct,
            actualWin: r.actualWin,
            maxDrawdownPct: r.maxDrawdownPct,
          })),
        },
        summaryJa: [
          `観測窓: ${obsDateRange.start}〜${obsDateRange.end}（2023〜2025 OpenAI buy=0）`,
          `全buy 2026: 件数${yearByYearAll[3]!.rulePassCount} TP${yearByYearAll[3]!.TP} FP${yearByYearAll[3]!.FP} FN${yearByYearAll[3]!.FN} F1=${yearByYearAll[3]!.f1} 期待値${yearByYearAll[3]!.expectancyPct}%`,
          `1023 2026: 件数${yearByYear1023[3]!.rulePassCount} TP${yearByYear1023[3]!.TP} FP${yearByYear1023[3]!.FP} FN${yearByYear1023[3]!.FN} F1=${yearByYear1023[3]!.f1} 期待値${yearByYear1023[3]!.expectancyPct}%`,
          `学習(4月): TP${train1023.TP} FP${train1023.FP} 期待値${train1023.expectancyPct}%`,
          `検証(5月): TP${valid1023.TP} FP${valid1023.FP} 期待値${valid1023.expectancyPct ?? 'N/A'} 件数${valid1023.rulePassCount}`,
          `過学習判定(1023): ${overfit1023.verdictJa}`,
        ],
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-best-rule-walkforward.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== WALK-FORWARD ===\n', JSON.stringify(report, null, 2));
    },
    300_000,
  );
});
