/**
 * 決定木ルール固定 — 完全OOS検証 + PathA閾値丸め感度
 * npx vitest run tests/unit/openAiDecisionTreeOosValidation.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, it, vi } from 'vitest';
import { SAMPLE_STOCKS } from '../../src/data/sampleStocks';
import { bootstrapSecretsForAiEvalProbe } from '../helpers/aiEvalProbeBootstrap';
import { buildConciergeEvidenceForProactive } from '../../src/services/conciergeEvidenceBuilder';
import { buildEnrichedAiSecondEvaluatorInputs } from '../../src/services/aiSecondEvaluatorDataEnrichment';
import { loadAnalysisApiKeys } from '../../src/services/analysisApiKeys';
import {
  fetchAiSecondEvaluatorBatch,
  resetAiSecondEvaluatorCacheForTest,
} from '../../src/services/aiSecondEvaluatorService';
import * as aiEvalLog from '../../src/services/aiSecondEvaluatorLog';
import { patchEnrichedInputsForDay } from '../helpers/openAi30dMeasurement';
import { computeRsi14At, type ProbeSymbol } from '../helpers/buyAction30dAudit';
import type { AppState, PortfolioPosition } from '../../src/types';

const TRAIN_SYMBOLS = new Set(['1023', 'VYM']);
const JUNE_START = '2026-06-01';
const REPLAY_START = '2026-04-16';

const OOS_SYMBOL_DEFS: ProbeSymbol[] = [
  { symbol: 'SPY', market: 'us', yahooSymbol: 'SPY' },
  { symbol: 'QQQ', market: 'us', yahooSymbol: 'QQQ' },
  { symbol: 'SCHD', market: 'us', yahooSymbol: 'SCHD' },
  { symbol: 'JEPI', market: 'us', yahooSymbol: 'JEPI' },
  { symbol: '1155', market: 'bursa', yahooSymbol: '1155.KL' },
  { symbol: '5225', market: 'bursa', yahooSymbol: '5225.KL' },
];

const ALL_SYMBOL_DEFS: ProbeSymbol[] = [
  { symbol: '1023', market: 'bursa', yahooSymbol: '1023.KL' },
  { symbol: 'VYM', market: 'us', yahooSymbol: 'VYM' },
  ...OOS_SYMBOL_DEFS,
];

const PATH_B = { change5dMin: 0.33, atrRatioLow: 0.793, atrRatioHigh: 0.92 };
const PATH_A_BASE = 1.046;
const PATH_A_ROUND_GRID = [1.0, 1.02, 1.05, 1.08, 1.1, 1.046] as const;
const EXIT = { takeProfitPct: 4, stopLossPct: -3, maxHoldOffset: 20 };

type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };

type BuyCase = {
  date: string;
  symbol: string;
  atrRatio: number | null;
  change5dPct: number | null;
  rsi14: number | null;
  volumeSurgeRatio: number | null;
  returnPct: number | null;
  actualWin: boolean | null;
  maxDrawdownPct: number | null;
  dataSource: 'liveReplay' | 'cached304';
  cohortTags: string[];
};

type Metrics = {
  label: string;
  openAiBuyCount: number;
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
  simSkipped: number;
  noteJa?: string;
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

function passesDecisionTree(row: BuyCase, pathAThreshold: number): boolean {
  if (row.atrRatio == null || row.change5dPct == null) return false;
  if (row.atrRatio > pathAThreshold) return true;
  return (
    row.atrRatio <= pathAThreshold &&
    row.change5dPct > PATH_B.change5dMin &&
    row.atrRatio > PATH_B.atrRatioLow &&
    row.atrRatio <= PATH_B.atrRatioHigh
  );
}

function buildMetrics(label: string, rows: BuyCase[], pathAThreshold: number): Metrics {
  const evaluated = rows.filter((r) => r.returnPct != null);
  let TP = 0;
  let FP = 0;
  let FN = 0;
  let TN = 0;
  for (const r of evaluated) {
    const pred = passesDecisionTree(r, pathAThreshold);
    const actual = r.actualWin!;
    if (pred && actual) TP += 1;
    else if (pred && !actual) FP += 1;
    else if (!pred && actual) FN += 1;
    else TN += 1;
  }
  const predictedPositive = evaluated.filter((r) => passesDecisionTree(r, pathAThreshold));
  const precision = TP + FP > 0 ? round3(TP / (TP + FP)) : null;
  const recall = TP + FN > 0 ? round3(TP / (TP + FN)) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? round3((2 * precision * recall) / (precision + recall))
      : null;
  return {
    label,
    openAiBuyCount: rows.length,
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
        ? round2(Math.min(...predictedPositive.map((r) => r.maxDrawdownPct ?? 0)))
        : null,
    simSkipped: rows.length - evaluated.length,
  };
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
  const start = idx - 90 + 1;
  if (start < 14) return null;
  const samples: number[] = [];
  for (let i = start; i <= idx; i++) {
    const v = computeAtrPctAt(bars, i);
    if (v != null) samples.push(v);
  }
  if (samples.length < 60) return null;
  return round2(samples.reduce((a, b) => a + b, 0) / samples.length);
}

function trailingChangePct(bars: OhlcvBar[], idx: number, lookback: number): number | null {
  if (idx < lookback || bars[idx - lookback]!.close <= 0) return null;
  return round2(((bars[idx]!.close / bars[idx - lookback]!.close - 1) * 100));
}

function volumeSurgeAt(bars: OhlcvBar[], idx: number): number | null {
  if (idx < 9) return null;
  const volumes = bars.slice(0, idx + 1).map((b) => b.volume);
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior <= 0) return null;
  return round2(recent / prior);
}

function simulateTpSl(bars: OhlcvBar[], signalIdx: number): { returnPct: number; maxDrawdownPct: number } | null {
  const entryIdx = signalIdx + 1;
  if (entryIdx >= bars.length) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;
  const stopPrice = entry * (1 + EXIT.stopLossPct / 100);
  const targetPrice = entry * (1 + EXIT.takeProfitPct / 100);
  const lastIdx = Math.min(signalIdx + EXIT.maxHoldOffset, bars.length - 1);
  if (lastIdx <= entryIdx) return null;
  let peak = entry;
  let maxDd = 0;
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = bars[i]!;
    if (bar.close > peak) peak = bar.close;
    maxDd = Math.min(maxDd, (bar.close / peak - 1) * 100);
    if (bar.low <= stopPrice) return { returnPct: EXIT.stopLossPct, maxDrawdownPct: round2(maxDd) };
    if (bar.high >= targetPrice) return { returnPct: EXIT.takeProfitPct, maxDrawdownPct: round2(maxDd) };
  }
  const exit = bars[lastIdx]!.close;
  for (let i = entryIdx; i <= lastIdx; i++) {
    const c = bars[i]!.close;
    if (c > peak) peak = c;
    maxDd = Math.min(maxDd, (c / peak - 1) * 100);
  }
  return { returnPct: round2(((exit / entry - 1) * 100)), maxDrawdownPct: round2(maxDd) };
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

function buildAppStateForSymbols(defs: ProbeSymbol[]): AppState {
  const stockBySym = Object.fromEntries(SAMPLE_STOCKS.map((s) => [s.symbol, s]));
  const now = new Date().toISOString();
  const portfolio: PortfolioPosition[] = defs.map((d, i) => {
    const stock = stockBySym[d.symbol];
    const price = stock?.price ?? (d.market === 'bursa' ? 10 : 100);
    const currency = stock?.currency ?? (d.market === 'bursa' ? 'MYR' : 'USD');
    return {
      id: `oos-${d.symbol}-${i}`,
      symbol: d.symbol,
      market: d.market,
      currency,
      shares: 100 + i * 10,
      averageBuyPrice: price * 0.92,
      currentPrice: price,
      currentPriceUpdatedAt: now,
      priceSource: 'api',
      priceFetchStatus: 'ok',
      lastApiPriceAt: now,
      lastSuccessfulFetchAt: now,
      quoteAgeSeconds: 30,
      isStale: false,
      companyName: stock?.name ?? d.symbol,
      openedAt: now,
      lastQuoteProvider: 'yahoo_finance',
    };
  });
  return {
    appMode: 'manual',
    settings: {
      totalCapitalMYR: 500_000,
      riskPerTradePct: 2,
      selectedMarket: 'bursa',
      accountType: 'cash_upfront',
      priceRefreshMinutes: 15,
    },
    practice: {
      virtualCapitalMYR: 100_000,
      cashBalanceMYR: 100_000,
      portfolio: [],
      trades: [],
      performanceHistory: [],
    },
    deposits: [],
    portfolio,
    trades: [],
    dividends: [],
    performanceHistory: [],
    manualOrderList: [],
    notificationSettings: {
      notifyBuyCandidate: false,
      notifySellCandidate: false,
      notifyStopLoss: false,
      notifyTakeProfit: false,
      notifyMarketOpenBefore: false,
      notifyMarketCloseBefore: false,
      sound: 'default',
      vibrationEnabled: false,
    },
    notificationHistory: [],
    notificationCooldowns: {},
  };
}

async function loadDaySlices(symbols: ProbeSymbol[], minDate: string) {
  const barsBySymbol = new Map<string, OhlcvBar[]>();
  for (const s of symbols) {
    barsBySymbol.set(s.symbol, await fetchYahooOhlcv(s.yahooSymbol));
  }
  const dateSet = new Set<string>();
  for (const bars of barsBySymbol.values()) {
    for (const b of bars) {
      if (b.date >= minDate) dateSet.add(b.date);
    }
  }
  const dates = [...dateSet].sort();
  const daySlices = dates.map((date) => {
    const points: Array<{
      symbol: string;
      market: ProbeSymbol['market'];
      dayChangePct: number;
      rsi14: number | null;
      close: number;
    }> = [];
    for (const s of symbols) {
      const bars = barsBySymbol.get(s.symbol)!;
      const closes = bars.map((b) => b.close);
      const idx = bars.findIndex((b) => b.date === date);
      if (idx < 1) continue;
      points.push({
        symbol: s.symbol,
        market: s.market,
        dayChangePct: ((bars[idx]!.close - bars[idx - 1]!.close) / bars[idx - 1]!.close) * 100,
        rsi14: computeRsi14At(closes, idx),
        close: bars[idx]!.close,
      });
    }
    return { date, points };
  });
  return { barsBySymbol, daySlices };
}

function tagCohorts(symbol: string, date: string): string[] {
  const tags: string[] = [];
  if (date >= JUNE_START) tags.push('june2026Plus');
  if (!TRAIN_SYMBOLS.has(symbol)) tags.push('oosSymbol');
  if (TRAIN_SYMBOLS.has(symbol) && date < JUNE_START) tags.push('inSampleTrain');
  if (TRAIN_SYMBOLS.has(symbol) && date >= JUNE_START) tags.push('trainSymbolTimeOos');
  return tags;
}

function isStrictOos(c: BuyCase): boolean {
  return c.cohortTags.includes('june2026Plus') || c.cohortTags.includes('oosSymbol');
}

function isInSampleTrain(c: BuyCase): boolean {
  return c.cohortTags.includes('inSampleTrain');
}

function buildBuyCase(
  bars: OhlcvBar[],
  date: string,
  symbol: string,
  dataSource: BuyCase['dataSource'],
): BuyCase {
  const idx = bars.findIndex((b) => b.date === date);
  const atrPct = idx >= 0 ? computeAtrPctAt(bars, idx) : null;
  const atr90 = idx >= 0 ? computeAtr90AvgPct(bars, idx) : null;
  const atrRatio = atrPct != null && atr90 != null && atr90 > 0 ? round3(atrPct / atr90) : null;
  const sim = idx >= 0 ? simulateTpSl(bars, idx) : null;
  return {
    date,
    symbol,
    atrRatio,
    change5dPct: idx >= 0 ? trailingChangePct(bars, idx, 5) : null,
    rsi14: idx >= 0 ? computeRsi14At(bars.map((b) => b.close), idx) : null,
    volumeSurgeRatio: idx >= 0 ? volumeSurgeAt(bars, idx) : null,
    returnPct: sim?.returnPct ?? null,
    actualWin: sim != null ? sim.returnPct > 0 : null,
    maxDrawdownPct: sim?.maxDrawdownPct ?? null,
    dataSource,
    cohortTags: tagCohorts(symbol, date),
  };
}

describe('Decision tree OOS validation', () => {
  beforeAll(() => {
    vi.spyOn(aiEvalLog, 'logAiEvalStart').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalResponse').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalEnd').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalPrompt').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalOpenAiSkipped').mockImplementation(() => {});
  });

  it('writes OOS validation and PathA rounding JSON', async () => {
    const keyStatus = await bootstrapSecretsForAiEvalProbe();
    const cachedObs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Array<{ date: string; symbol: string; openAiAction: string }>;

    const allBuyCases: BuyCase[] = [];
    const ohlcCache = new Map<string, OhlcvBar[]>();
    for (const s of ALL_SYMBOL_DEFS) {
      ohlcCache.set(s.symbol, await fetchYahooOhlcv(s.yahooSymbol));
    }

    if (keyStatus.openAi.configured) {
      const state = buildAppStateForSymbols(ALL_SYMBOL_DEFS);
      const apiKeys = await loadAnalysisApiKeys();
      const evidence = await buildConciergeEvidenceForProactive(state, apiKeys, 'balanced');
      const baseEnriched = await buildEnrichedAiSecondEvaluatorInputs(evidence.symbols, {
        forceRefresh: true,
        degradedMode: false,
      });
      const { daySlices } = await loadDaySlices(ALL_SYMBOL_DEFS, REPLAY_START);
      const ruleScoresBySymbol = Object.fromEntries(
        evidence.symbols.map((s) => [s.symbol.toUpperCase(), 50]),
      );
      for (const day of daySlices) {
        if (day.points.length === 0) continue;
        const dayInputs = patchEnrichedInputsForDay(baseEnriched, day.points);
        resetAiSecondEvaluatorCacheForTest();
        const batch = await fetchAiSecondEvaluatorBatch([], {
          force: true,
          prebuiltInputs: dayInputs,
          ruleScoresBySymbol,
          degradedMode: false,
        });
        const bySym = new Map(batch.symbols.map((s) => [s.symbol.toUpperCase(), s] as const));
        for (const p of day.points) {
          const ai = bySym.get(p.symbol.toUpperCase());
          if (!ai || ai.action !== 'buy') continue;
          const key = `${day.date}|${p.symbol}`;
          if (allBuyCases.some((c) => `${c.date}|${c.symbol}` === key)) continue;
          allBuyCases.push(buildBuyCase(ohlcCache.get(p.symbol)!, day.date, p.symbol, 'liveReplay'));
        }
      }
    }

    for (const o of cachedObs.filter((x) => x.openAiAction === 'buy')) {
      const key = `${o.date}|${o.symbol}`;
      if (allBuyCases.some((c) => `${c.date}|${c.symbol}` === key)) continue;
      const bars = ohlcCache.get(o.symbol);
      if (!bars) continue;
      allBuyCases.push(buildBuyCase(bars, o.date, o.symbol, 'cached304'));
    }

    allBuyCases.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

    const strictOos = allBuyCases.filter(isStrictOos);
    const inSampleTrain = allBuyCases.filter(isInSampleTrain);
    const junePlus = allBuyCases.filter((c) => c.cohortTags.includes('june2026Plus'));
    const oosSymbolsOnly = allBuyCases.filter((c) => c.cohortTags.includes('oosSymbol'));

    const inSampleMetrics = buildMetrics('in-sample', inSampleTrain, PATH_A_BASE);
    const oosMetricsBase = buildMetrics('完全OOS', strictOos, PATH_A_BASE);

    const pathARoundingGrid = PATH_A_ROUND_GRID.map((thr) => {
      const inSample = buildMetrics(`in-sample thr=${thr}`, inSampleTrain, thr);
      const strictOosM = buildMetrics(`OOS thr=${thr}`, strictOos, thr);
      return {
        pathAThreshold: thr,
        isBaseline: thr === PATH_A_BASE,
        inSample,
        strictOos: strictOosM,
        degradationVsBaseline: {
          inSampleF1Delta:
            inSample.f1 != null && inSampleMetrics.f1 != null
              ? round3(inSample.f1 - inSampleMetrics.f1)
              : null,
          oosF1Delta:
            strictOosM.f1 != null && oosMetricsBase.f1 != null
              ? round3(strictOosM.f1 - oosMetricsBase.f1)
              : null,
          inSampleExpectancyDelta:
            inSample.expectancyPct != null && inSampleMetrics.expectancyPct != null
              ? round2(inSample.expectancyPct - inSampleMetrics.expectancyPct)
              : null,
          oosExpectancyDelta:
            strictOosM.expectancyPct != null && oosMetricsBase.expectancyPct != null
              ? round2(strictOosM.expectancyPct - oosMetricsBase.expectancyPct)
              : null,
        },
      };
    });

    const overfittingVerdict = {
      inSampleF1: inSampleMetrics.f1,
      oosF1: oosMetricsBase.f1,
      verdictJa:
        strictOos.length === 0
          ? 'OOS OpenAI buy 0件 — 過学習判定不能'
          : inSampleMetrics.f1 === 1 && (oosMetricsBase.f1 ?? 0) < 0.5
            ? '過学習の可能性高'
            : oosMetricsBase.FP > 0
              ? 'OOSでFP発生 — 汎化課題'
              : oosMetricsBase.f1 === 1 && inSampleMetrics.f1 === 1
                ? 'OOS/in-sample共にF1=1 — サンプル極小に注意'
                : '暫定: OOSサンプル不足',
    };

    const report = {
      methodologyJa: {
        fixedDecisionTree: {
          pathA: 'ATR_ratio > {threshold}',
          pathB: `ATR_ratio <= {threshold} AND 5日騰落 > ${PATH_B.change5dMin} AND ${PATH_B.atrRatioLow} < ATR_ratio <= ${PATH_B.atrRatioHigh}`,
        },
        oosDefinition: '2026-06-01以降 OR 訓練外銘柄(SPY/QQQ/SCHD/JEPI/1155/5225)',
        publicBank: '5225.KL',
        maybank: '1155.KL',
      },
      liveOpenAiConfigured: keyStatus.openAi.configured,
      buyCases: allBuyCases,
      cohortMetrics: {
        june2026Plus: buildMetrics('6月以降', junePlus, PATH_A_BASE),
        oosSymbols: buildMetrics('別銘柄', oosSymbolsOnly, PATH_A_BASE),
        strictOosCombined: oosMetricsBase,
        inSampleTrain: inSampleMetrics,
      },
      pathARoundingComparison: pathARoundingGrid,
      overfittingVerdict,
      summaryJa: [
        `OOS buy${strictOos.length} TP${oosMetricsBase.TP} FP${oosMetricsBase.FP} F1=${oosMetricsBase.f1 ?? '—'}`,
        `in-sample buy${inSampleTrain.length} F1=${inSampleMetrics.f1}`,
        overfittingVerdict.verdictJa,
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-decision-tree-oos-validation.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n=== DT OOS ===\n', JSON.stringify(report, null, 2));
  }, 600_000);
});
