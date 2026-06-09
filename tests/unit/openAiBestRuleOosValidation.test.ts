/**
 * ベストルール OOS検証 — 2026年6月以降 / 別銘柄
 * npx vitest run tests/unit/openAiBestRuleOosValidation.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, it, vi } from 'vitest';
import { SAMPLE_STOCKS } from '../../src/data/sampleStocks';
import { buildProbeAppState } from '../helpers/buildProbeAppState';
import { bootstrapSecretsForAiEvalProbe } from '../helpers/aiEvalProbeBootstrap';
import { buildConciergeEvidenceForProactive } from '../../src/services/conciergeEvidenceBuilder';
import { buildEnrichedAiSecondEvaluatorInputs } from '../../src/services/aiSecondEvaluatorDataEnrichment';
import { loadAnalysisApiKeys } from '../../src/services/analysisApiKeys';
import {
  fetchAiSecondEvaluatorBatch,
  resetAiSecondEvaluatorCacheForTest,
} from '../../src/services/aiSecondEvaluatorService';
import * as aiEvalLog from '../../src/services/aiSecondEvaluatorLog';
import {
  loadHistoricalDayInputs,
  patchEnrichedInputsForDay,
} from '../helpers/openAi30dMeasurement';
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

const JUNE_START = '2026-06-01';
const IN_SAMPLE_END = '2026-04-30';

type OhlcBar = { date: string; high: number; low: number; close: number; volume: number };

type ObsRow = { date: string; symbol: string; openAiAction: AiSecondEvaluatorAction };

type EvalRow = ObsRow & {
  volumeSurgeRatio: number | null;
  atrPct: number | null;
  consecutiveBuyNumber: number;
  rulePasses: boolean;
  returnPct: number | null;
  actualWin: boolean | null;
  maxDrawdownPct: number | null;
  dataSource: 'cached304' | 'liveJune2026';
};

type ValidationMetrics = {
  cohortId: string;
  labelJa: string;
  dateRange: { start: string | null; end: string | null };
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

function buildConsecMap(obs: ObsRow[]): Map<string, number> {
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
  return consecByKey;
}

function appendConsecForRows(allObs: ObsRow[], rows: ObsRow[]): Map<string, number> {
  const merged = [...allObs];
  for (const r of rows) {
    if (!merged.some((m) => m.date === r.date && m.symbol === r.symbol)) merged.push(r);
  }
  merged.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));
  return buildConsecMap(merged);
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

function volumeSurgeAt(bars: OhlcBar[], idx: number): number | null {
  if (idx < 9) return null;
  const volumes = bars.slice(0, idx + 1).map((b) => b.volume);
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior <= 0) return null;
  return Math.round((recent / prior) * 100) / 100;
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

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcvBar[]> {
  const period1 = Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000);
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
  const bars: OhlcBar[] = [];
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

function passesBestRule(vol: number | null, atr: number | null, consec: number): boolean {
  if (vol == null || vol >= BEST_RULE.volumeMax) return false;
  if (atr == null || atr < BEST_RULE.atrMinPct || atr >= BEST_RULE.atrMaxPct) return false;
  if (consec > BEST_RULE.consecutiveBuyMax) return false;
  return true;
}

function buildMetrics(cohortId: string, labelJa: string, rows: EvalRow[]): ValidationMetrics {
  const buyRows = rows.filter((r) => r.openAiAction === 'buy');
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

  const predictedPositive = evaluated.filter((r) => r.rulePasses);
  const precision = TP + FP > 0 ? round3(TP / (TP + FP)) : null;
  const recall = TP + FN > 0 ? round3(TP / (TP + FN)) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? round3((2 * precision * recall) / (precision + recall))
      : null;

  const dates = buyRows.map((r) => r.date).sort();

  return {
    cohortId,
    labelJa,
    dateRange: {
      start: dates[0] ?? null,
      end: dates.at(-1) ?? null,
    },
    openAiBuyCount: buyRows.length,
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

async function evaluateBuyRows(
  buyObs: ObsRow[],
  allObsForConsec: ObsRow[],
  volMap: Map<string, number>,
  dataSource: EvalRow['dataSource'],
): Promise<EvalRow[]> {
  const consecByKey = appendConsecForRows(allObsForConsec, buyObs);
  const ohlcCache = new Map<string, OhlcBar[]>();
  const out: EvalRow[] = [];

  for (const o of buyObs) {
    const yahoo = toYahooSymbol(o.symbol, resolveMarket(o.symbol));
    if (!ohlcCache.has(yahoo)) ohlcCache.set(yahoo, await fetchYahooOhlcv(yahoo));
    const ohlc = ohlcCache.get(yahoo)!;
    const daily: DailyBar[] = ohlc.map((b) => ({ date: b.date, close: b.close }));
    const signalIdx = daily.findIndex((b) => b.date === o.date);
    const atrPct = signalIdx >= 0 ? computeAtrPctAt(ohlc, signalIdx) : null;
    const volReg = volMap.get(`${o.date}|${o.symbol}`);
    const vol = volReg ?? (signalIdx >= 0 ? volumeSurgeAt(ohlc, signalIdx) : null);
    const consec = consecByKey.get(`${o.date}|${o.symbol}`) ?? 0;
    const rulePasses = o.openAiAction === 'buy' && passesBestRule(vol, atrPct, consec);

    let returnPct: number | null = null;
    let maxDrawdownPct: number | null = null;
    if (signalIdx >= 0) {
      const sim = simulateTpSl(ohlc, daily, signalIdx);
      if (sim) {
        returnPct = sim.returnPct;
        maxDrawdownPct = sim.maxDrawdownPct;
      }
    }

    out.push({
      ...o,
      volumeSurgeRatio: vol,
      atrPct,
      consecutiveBuyNumber: consec,
      rulePasses,
      returnPct,
      actualWin: returnPct != null ? returnPct > 0 : null,
      maxDrawdownPct,
      dataSource,
    });
  }

  return out;
}

async function fetchJuneLiveBuyObs(openAiConfigured: boolean): Promise<{
  rows: ObsRow[];
  liveMeta: { attempted: boolean; juneDays: string[]; buyCount: number; noteJa: string };
}> {
  if (!openAiConfigured) {
    return {
      rows: [],
      liveMeta: {
        attempted: false,
        juneDays: [],
        buyCount: 0,
        noteJa: 'OpenAI APIキー未設定 — 6月liveリプレイ未実施',
      },
    };
  }

  const state = buildProbeAppState(10, 'bursa-first');
  const apiKeys = await loadAnalysisApiKeys();
  const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
    symbol: p.symbol,
    market: p.market as ProbeSymbol['market'],
    yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
  }));

  const evidence = await buildConciergeEvidenceForProactive(state, apiKeys, 'balanced');
  const baseEnriched = await buildEnrichedAiSecondEvaluatorInputs(evidence.symbols, {
    forceRefresh: true,
    degradedMode: false,
  });
  const { daySlices } = await loadHistoricalDayInputs(symbols);
  const juneDays = daySlices.filter((d) => d.date >= JUNE_START).map((d) => d.date);
  const ruleScoresBySymbol = Object.fromEntries(
    evidence.symbols.map((s) => [s.symbol.toUpperCase(), 50]),
  );

  const rows: ObsRow[] = [];

  for (const day of daySlices.filter((d) => d.date >= JUNE_START)) {
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
      rows.push({ date: day.date, symbol: p.symbol, openAiAction: 'buy' });
    }
  }

  return {
    rows,
    liveMeta: {
      attempted: true,
      juneDays,
      buyCount: rows.length,
      noteJa:
        rows.length > 0
          ? `6月live OpenAIリプレイ: ${juneDays.length}営業日・buy${rows.length}件`
          : `6月live OpenAIリプレイ: ${juneDays.length}営業日・buy0件`,
    },
  };
}

describe('OpenAI best rule OOS validation', () => {
  beforeAll(() => {
    vi.spyOn(aiEvalLog, 'logAiEvalStart').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalResponse').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalEnd').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalPrompt').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalOpenAiSkipped').mockImplementation(() => {});
  });

  it(
    'writes OOS validation JSON for June+ and other symbols',
    async () => {
      const keyStatus = await bootstrapSecretsForAiEvalProbe();
      const cachedObs = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
      ) as ObsRow[];
      const reg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
      ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
      const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

      const cachedBuy = cachedObs.filter((o) => o.openAiAction === 'buy');
      const cachedJuneBuy = cachedBuy.filter((o) => o.date >= JUNE_START);

      const { rows: liveJuneBuy, liveMeta } = await fetchJuneLiveBuyObs(keyStatus.openAi.configured);

      const allObsMerged = [...cachedObs];
      for (const r of liveJuneBuy) {
        if (!allObsMerged.some((m) => m.date === r.date && m.symbol === r.symbol)) {
          allObsMerged.push(r);
        }
      }

      const juneBuyAll = [...cachedJuneBuy, ...liveJuneBuy.filter((l) => !cachedJuneBuy.some((c) => c.date === l.date && c.symbol === l.symbol))];
      const vymBuy = cachedBuy.filter((o) => o.symbol === 'VYM');
      const non1023Buy = cachedBuy.filter((o) => o.symbol !== '1023');
      const mayOosBuy = cachedBuy.filter((o) => o.date >= '2026-05-01' && o.date <= '2026-05-31');
      const combinedOosBuy = cachedBuy.filter(
        (o) => o.date > IN_SAMPLE_END || o.symbol !== '1023',
      );
      const inSample1023April = cachedBuy.filter(
        (o) => o.symbol === '1023' && o.date <= IN_SAMPLE_END,
      );

      const evalJune = await evaluateBuyRows(juneBuyAll, allObsMerged, volMap, liveJuneBuy.length > 0 ? 'liveJune2026' : 'cached304');
      const evalVym = await evaluateBuyRows(vymBuy, cachedObs, volMap, 'cached304');
      const evalNon1023 = await evaluateBuyRows(non1023Buy, cachedObs, volMap, 'cached304');
      const evalMayOos = await evaluateBuyRows(mayOosBuy, cachedObs, volMap, 'cached304');
      const evalCombinedOos = await evaluateBuyRows(combinedOosBuy, allObsMerged, volMap, 'cached304');
      const evalInSample = await evaluateBuyRows(inSample1023April, cachedObs, volMap, 'cached304');

      const validations = [
        buildMetrics('june2026Plus', '2026年6月以降（新データ）', evalJune),
        buildMetrics('otherSymbolVym', '別銘柄 VYM（全期間）', evalVym),
        buildMetrics('otherSymbolsNon1023', '別銘柄 1023以外（全期間）', evalNon1023),
        buildMetrics('may2026OosTime', '2026年5月 OOS（時間分割）', evalMayOos),
        buildMetrics('combinedOos', '統合OOS（5月+別銘柄 / 4月1023除外）', evalCombinedOos),
        buildMetrics('inSample1023April', '参考: 4月1023 in-sample（チューニング期）', evalInSample),
      ];

      for (const v of validations) {
        if (!v.dataAvailable) {
          v.noteJa = v.cohortId === 'june2026Plus' ? liveMeta.noteJa : 'OpenAI buy観測なし';
        }
      }

      const report = {
        methodologyJa: {
          fixedBestRule: {
            volume: `< ${BEST_RULE.volumeMax}`,
            atr: `${BEST_RULE.atrMinPct}% <= ATR < ${BEST_RULE.atrMaxPct}%`,
            consecutiveBuy: `<= ${BEST_RULE.consecutiveBuyMax}`,
            exit: `TP +${BEST_RULE.takeProfitPct}% / SL ${BEST_RULE.stopLossPct}%`,
          },
          cohorts: {
            june2026Plus: '2026-06-01以降のOpenAI buy（304キャッシュ + liveリプレイ）',
            otherSymbolVym: 'VYM — 1023以外の唯一のbuy銘柄',
            may2026OosTime: '5月buy — 4月1023クラスター（in-sample）以降の時間OOS',
            combinedOos: '5月全buy + VYM、または4月1023以外',
            inSample1023April: '比較用 in-sample（ルールチューニング期）',
          },
          dataLimitationJa:
            '304観測は2026-04-16〜05-29。6月以降はlive OpenAIリプレイ（APIキー要）で補完。',
        },
        liveJuneMeta: liveMeta,
        validations,
        detailRows: {
          june2026Plus: evalJune,
          otherSymbolVym: evalVym,
          may2026OosTime: evalMayOos,
          combinedOos: evalCombinedOos,
        },
        summaryJa: validations.map(
          (v) =>
            `${v.labelJa}: buy${v.openAiBuyCount} 通過${v.rulePassCount} TP${v.TP} FP${v.FP} FN${v.FN} F1=${v.f1 ?? '—'} 期待値${v.expectancyPct ?? '—'}%`,
        ),
        verdictJa: {
          oosPerformance:
            'OOS（5月+別銘柄）ではルール通過0件 — in-sample（4月1023）のF1=1.0はOOSで再現せず',
          juneStatus: liveMeta.noteJa,
          ruleGeneralization:
            '別銘柄VYM・5月1023ともルール不通過が主。4月1023専用フィルタの可能性が高いが、OOS不通過案件は仮エントリーでもSLが多く有害回避に寄与',
        },
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-best-rule-oos-validation.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== OOS VALIDATION ===\n', JSON.stringify(report, null, 2));
    },
    600_000,
  );
});
