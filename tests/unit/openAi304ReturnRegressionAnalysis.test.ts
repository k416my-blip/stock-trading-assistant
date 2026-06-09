/**
 * 304観測 — 10dリターン × 特徴量 単変量 + 多変量OLS（action有無比較）
 * npx vitest run tests/unit/openAi304ReturnRegressionAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, it, vi } from 'vitest';
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
import {
  computeRsi14At,
  fetchYahooDailyBars,
  toYahooSymbol,
  type DailyBar,
  type ProbeSymbol,
} from '../helpers/buyAction30dAudit';
import type { AiSecondEvaluatorAction } from '../../src/types/aiSecondEvaluator';

type Row = {
  date: string;
  symbol: string;
  rsi14: number;
  confidence: number;
  volumeSurgeRatio: number;
  pctFrom20dHigh: number;
  dayChangePct: number;
  openAiAction: AiSecondEvaluatorAction;
  return10d: number;
};

type OhlcBar = { date: string; close: number; high: number; volume: number };

const CACHE = path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json');
const ACTIONS: AiSecondEvaluatorAction[] = ['buy', 'hold', 'watch', 'reduce'];

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=6mo`;
  const res = await fetch(url, { headers: { 'User-Agent': 'stock-trading-assistant-audit/1.0' } });
  if (!res.ok) throw new Error(`Yahoo ${yahooSymbol} HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            close?: (number | null)[];
            high?: (number | null)[];
            volume?: (number | null)[];
          }>;
        };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const closes = q?.close ?? [];
  const highs = q?.high ?? [];
  const volumes = q?.volume ?? [];
  const bars: OhlcBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    const h = highs[i];
    const v = volumes[i];
    if (c == null || h == null || v == null || !Number.isFinite(c)) continue;
    bars.push({
      date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
      close: c,
      high: h,
      volume: v,
    });
  }
  return bars;
}

function volumeSurgeAt(bars: OhlcBar[], idx: number): number | null {
  if (idx < 9) return null;
  const volumes = bars.slice(0, idx + 1).map((b) => b.volume);
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior <= 0) return null;
  return recent / prior;
}

function pctFrom20dHighAt(bars: OhlcBar[], idx: number): number | null {
  if (idx < 19) return null;
  const window = bars.slice(idx - 19, idx + 1);
  const high20 = Math.max(...window.map((b) => b.high));
  return ((bars[idx]!.close / high20 - 1) * 100);
}

function dayChangeAt(bars: OhlcBar[], idx: number): number | null {
  if (idx < 1) return null;
  const prev = bars[idx - 1]!.close;
  return ((bars[idx]!.close - prev) / prev) * 100;
}

function forward10d(bars: DailyBar[], date: string): number | null {
  const idx = bars.findIndex((b) => b.date === date);
  if (idx < 0 || idx + 10 >= bars.length) return null;
  const entry = bars[idx + 1]!.close;
  const exit = bars[idx + 10]!.close;
  if (entry <= 0) return null;
  return ((exit - entry) / entry) * 100;
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i]! - mx;
    const y = ys[i]! - my;
    num += x * y;
    dx += x * x;
    dy += y * y;
  }
  if (dx === 0 || dy === 0) return null;
  return Math.round((num / Math.sqrt(dx * dy)) * 1000) / 1000;
}

function mean(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function winRate(vals: number[]): number {
  return Math.round((vals.filter((v) => v > 0).length / vals.length) * 1000) / 10;
}

function invertMatrix(m: number[][]): number[][] | null {
  const n = m.length;
  const aug = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r]![col]!) > Math.abs(aug[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(aug[pivot]![col]!) < 1e-12) return null;
    [aug[col], aug[pivot]] = [aug[pivot]!, aug[col]!];
    const div = aug[col]![col]!;
    for (let j = 0; j < 2 * n; j++) aug[col]![j]! /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = aug[r]![col]!;
      for (let j = 0; j < 2 * n; j++) aug[r]![j]! -= f * aug[col]![j]!;
    }
  }
  return aug.map((row) => row.slice(n));
}

function matMul(a: number[][], b: number[]): number[] {
  return a.map((row) => row.reduce((s, v, j) => s + v * b[j]!, 0));
}

function normalCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

function pValueTwoSidedT(tStat: number, df: number): number {
  const z = Math.abs(tStat);
  if (df > 30) return Math.round(2 * (1 - normalCdf(z)) * 10000) / 10000;
  const x = df / (df + z * z);
  const a = df / 2;
  const b = 0.5;
  const logBeta = (p: number, q: number) => logGamma(p) + logGamma(q) - logGamma(p + q);
  const logGamma = (z: number): number => {
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.984369578019571e-6,
      1.5056327351493116e-7,
    ];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    let zz = z - 1;
    let xx = c[0]!;
    for (let i = 1; i < g + 2; i++) xx += c[i]! / (zz + i);
    const tt = zz + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(tt) - tt + Math.log(xx);
  };
  const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - logBeta(a, b));
  const oneTail = 1 - bt / 2;
  return Math.round(2 * oneTail * 10000) / 10000;
}

type OlsResult = {
  n: number;
  k: number;
  rSquared: number;
  adjRSquared: number;
  coefficients: Array<{
    name: string;
    beta: number;
    se: number;
    tStat: number;
    pValue: number;
    significantAt05: boolean;
  }>;
  fStat: number | null;
};

function ols(y: number[], X: number[][], names: string[]): OlsResult | null {
  const n = y.length;
  const k = X[0]?.length ?? 0;
  if (n <= k + 1) return null;
  const XtX: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  const Xty: number[] = Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      Xty[a]! += X[i]![a]! * y[i]!;
      for (let b = 0; b < k; b++) XtX[a]![b]! += X[i]![a]! * X[i]![b]!;
    }
  }
  const inv = invertMatrix(XtX);
  if (!inv) return null;
  const beta = matMul(inv, Xty);
  const yMean = mean(y);
  let ssTot = 0;
  let ssRes = 0;
  const fitted = X.map((row) => row.reduce((s, v, j) => s + v * beta[j]!, 0));
  for (let i = 0; i < n; i++) {
    ssTot += (y[i]! - yMean) ** 2;
    ssRes += (y[i]! - fitted[i]!) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const adjR2 = 1 - ((1 - r2) * (n - 1)) / (n - k);
  const sigma2 = ssRes / (n - k);
  const coeffs = names.map((name, j) => {
    const se = Math.sqrt(Math.max(0, sigma2 * inv[j]![j]!));
    const tStat = se === 0 ? 0 : beta[j]! / se;
    const p = pValueTwoSidedT(tStat, n - k);
    return {
      name,
      beta: Math.round(beta[j]! * 10000) / 10000,
      se: Math.round(se * 10000) / 10000,
      tStat: Math.round(tStat * 1000) / 1000,
      pValue: Math.round(p * 10000) / 10000,
      significantAt05: p < 0.05,
    };
  });
  const msReg = (ssTot - ssRes) / (k - 1);
  const msRes = ssRes / (n - k);
  const fStat = msRes === 0 ? null : msReg / msRes;
  return {
    n,
    k,
    rSquared: Math.round(r2 * 10000) / 10000,
    adjRSquared: Math.round(adjR2 * 10000) / 10000,
    coefficients: coeffs,
    fStat: fStat == null ? null : Math.round(fStat * 1000) / 1000,
  };
}

async function buildDatasetFromObservations(): Promise<Row[]> {
  const obs = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
  ) as Array<{
    date: string;
    symbol: string;
    rsi14: number;
    openAiAction: AiSecondEvaluatorAction;
    return10d: number | null;
  }>;

  const hybrid = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-buy-hybrid-analysis.json'), 'utf8'),
  ) as { allRows: Array<{ date: string; symbol: string; confidence: number }> };
  const confMap = new Map(hybrid.allRows.map((r) => [`${r.date}|${r.symbol}`, r.confidence] as const));

  const report30d = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-30d-report.json'), 'utf8'),
  ) as {
    buyCommonFeatures: { aiConfidenceMean: number };
    holdBaselineFeatures: { aiConfidenceMean: number };
  };
  const confByAction: Record<AiSecondEvaluatorAction, number> = {
    buy: report30d.buyCommonFeatures.aiConfidenceMean,
    hold: report30d.holdBaselineFeatures.aiConfidenceMean,
    watch: 62,
    reduce: 60,
  };

  const state = buildProbeAppState(10, 'bursa-first');
  const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
    symbol: p.symbol,
    market: p.market as ProbeSymbol['market'],
    yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
  }));
  const barsClose = new Map<string, DailyBar[]>();
  const barsOhlcv = new Map<string, OhlcBar[]>();
  for (const s of symbols) {
    barsClose.set(s.symbol, await fetchYahooDailyBars(s.yahooSymbol));
    barsOhlcv.set(s.symbol, await fetchYahooOhlcv(s.yahooSymbol));
  }

  const rows: Row[] = [];
  for (const o of obs) {
    if (o.return10d == null) continue;
    const ohlcv = barsOhlcv.get(o.symbol);
    if (!ohlcv) continue;
    const idx = ohlcv.findIndex((b) => b.date === o.date);
    if (idx < 0) continue;
    const vol = volumeSurgeAt(ohlcv, idx);
    const pctH = pctFrom20dHighAt(ohlcv, idx);
    const dCh = dayChangeAt(ohlcv, idx);
    if (vol == null || pctH == null || dCh == null) continue;
    const conf =
      confMap.get(`${o.date}|${o.symbol}`) ??
      confByAction[o.openAiAction];
    rows.push({
      date: o.date,
      symbol: o.symbol,
      rsi14: o.rsi14,
      confidence: Math.round(conf * 10) / 10,
      volumeSurgeRatio: Math.round(vol * 100) / 100,
      pctFrom20dHigh: Math.round(pctH * 100) / 100,
      dayChangePct: Math.round(dCh * 100) / 100,
      openAiAction: o.openAiAction,
      return10d: o.return10d,
    });
  }
  fs.writeFileSync(CACHE, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  return rows;
}

async function buildDataset(): Promise<Row[]> {
  if (fs.existsSync(CACHE)) {
    return JSON.parse(fs.readFileSync(CACHE, 'utf8')) as Row[];
  }

  if (process.env.REGRESSION_USE_OBS_CACHE === '1') {
    const rows = await buildDatasetFromObservations();
    fs.writeFileSync(CACHE, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
    return rows;
  }

  await bootstrapSecretsForAiEvalProbe();
  resetAiSecondEvaluatorCacheForTest();

  const state = buildProbeAppState(10, 'bursa-first');
  const apiKeys = await loadAnalysisApiKeys();
  const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
    symbol: p.symbol,
    market: p.market as ProbeSymbol['market'],
    yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
  }));

  const evidence = await buildConciergeEvidenceForProactive(state, apiKeys, 'balanced');
  const { daySlices } = await loadHistoricalDayInputs(symbols);
  const baseEnriched = await buildEnrichedAiSecondEvaluatorInputs(evidence.symbols, {
    forceRefresh: true,
    degradedMode: false,
  });
  const ruleScoresBySymbol = Object.fromEntries(
    evidence.symbols.map((s) => [s.symbol.toUpperCase(), 50]),
  );

  const barsClose = new Map<string, DailyBar[]>();
  const barsOhlcv = new Map<string, OhlcBar[]>();
  for (const s of symbols) {
    barsClose.set(s.symbol, await fetchYahooDailyBars(s.yahooSymbol));
    barsOhlcv.set(s.symbol, await fetchYahooOhlcv(s.yahooSymbol));
  }

  const rows: Row[] = [];

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
      if (!ai || p.rsi14 == null) continue;
      const ohlcv = barsOhlcv.get(p.symbol)!;
      const idx = ohlcv.findIndex((b) => b.date === day.date);
      if (idx < 0) continue;
      const vol = volumeSurgeAt(ohlcv, idx);
      const pctH = pctFrom20dHighAt(ohlcv, idx);
      const dCh = dayChangeAt(ohlcv, idx);
      const r10 = forward10d(barsClose.get(p.symbol)!, day.date);
      if (vol == null || pctH == null || dCh == null || r10 == null) continue;
      rows.push({
        date: day.date,
        symbol: p.symbol,
        rsi14: p.rsi14,
        confidence: ai.confidence,
        volumeSurgeRatio: Math.round(vol * 100) / 100,
        pctFrom20dHigh: Math.round(pctH * 100) / 100,
        dayChangePct: Math.round(dCh * 100) / 100,
        openAiAction: ai.action,
        return10d: Math.round(r10 * 100) / 100,
      });
    }
  }

  fs.writeFileSync(CACHE, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  return rows;
}

describe('304 obs return10d regression', () => {
  beforeAll(() => {
    vi.spyOn(aiEvalLog, 'logAiEvalStart').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalResponse').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalEnd').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalPrompt').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalOpenAiSkipped').mockImplementation(() => {});
  });

  it('univariate + multivariate OLS with and without action', async () => {
    const rows =
      process.env.REGRESSION_USE_OBS_CACHE === '1'
        ? await buildDatasetFromObservations()
        : await buildDataset();
    const y = rows.map((r) => r.return10d);

    const continuousVars = [
      { id: 'rsi14', labelJa: 'RSI14', pick: (r: Row) => r.rsi14 },
      { id: 'confidence', labelJa: 'confidence', pick: (r: Row) => r.confidence },
      { id: 'volumeSurgeRatio', labelJa: '出来高倍率', pick: (r: Row) => r.volumeSurgeRatio },
      { id: 'pctFrom20dHigh', labelJa: '20日高値距離(%)', pick: (r: Row) => r.pctFrom20dHigh },
      { id: 'dayChangePct', labelJa: '当日日中変化率(%)', pick: (r: Row) => r.dayChangePct },
    ] as const;

    const univariateContinuous = continuousVars.map((v) => {
      const xs = rows.map((r) => v.pick(r));
      return {
        variable: v.id,
        labelJa: v.labelJa,
        n: rows.length,
        pearsonWithReturn10d: pearson(xs, y),
        avgReturn10d: Math.round(mean(y) * 100) / 100,
        winRatePct: winRate(y),
      };
    });

    const univariateAction = ACTIONS.map((action) => {
      const sub = rows.filter((r) => r.openAiAction === action);
      const rets = sub.map((r) => r.return10d);
      return {
        action,
        n: sub.length,
        pearsonWithReturn10d: null,
        avgReturn10d: rets.length ? Math.round(mean(rets) * 100) / 100 : null,
        winRatePct: rets.length ? winRate(rets) : null,
      };
    });

    const refAction: AiSecondEvaluatorAction = 'hold';
    const XpriceOnly = rows.map((r) => [
      1,
      r.rsi14,
      r.volumeSurgeRatio,
      r.pctFrom20dHigh,
      r.dayChangePct,
    ]);
    const namesPriceOnly = ['intercept', 'rsi14', 'volumeSurgeRatio', 'pctFrom20dHigh', 'dayChangePct'];

    const Xbase = rows.map((r) => [
      1,
      r.rsi14,
      r.confidence,
      r.volumeSurgeRatio,
      r.pctFrom20dHigh,
      r.dayChangePct,
    ]);
    const namesBase = ['intercept', 'rsi14', 'confidence', 'volumeSurgeRatio', 'pctFrom20dHigh', 'dayChangePct'];

    const XwithAction = rows.map((r) => [
      1,
      r.rsi14,
      r.confidence,
      r.volumeSurgeRatio,
      r.pctFrom20dHigh,
      r.dayChangePct,
      r.openAiAction === 'buy' ? 1 : 0,
      r.openAiAction === 'watch' ? 1 : 0,
      r.openAiAction === 'reduce' ? 1 : 0,
    ]);
    const namesAction = [
      ...namesBase,
      'action_buy',
      'action_watch',
      'action_reduce',
    ];

    const modelPriceOnly = ols(y, XpriceOnly, namesPriceOnly);
    const XpriceWithAction = rows.map((r) => [
      1,
      r.rsi14,
      r.volumeSurgeRatio,
      r.pctFrom20dHigh,
      r.dayChangePct,
      r.openAiAction === 'buy' ? 1 : 0,
      r.openAiAction === 'watch' ? 1 : 0,
      r.openAiAction === 'reduce' ? 1 : 0,
    ]);
    const namesPriceWithAction = [...namesPriceOnly, 'action_buy', 'action_watch', 'action_reduce'];

    const modelBase = ols(y, Xbase, namesBase);
    const modelAction = ols(y, XwithAction, namesAction);
    const modelPriceWithAction = ols(y, XpriceWithAction, namesPriceWithAction);

    const deltaR2 =
      modelBase && modelAction
        ? Math.round((modelAction.rSquared - modelBase.rSquared) * 10000) / 10000
        : null;
    const deltaR2PriceOnly =
      modelPriceOnly && modelPriceWithAction
        ? Math.round((modelPriceWithAction.rSquared - modelPriceOnly.rSquared) * 10000) / 10000
        : null;

    const actionCoeffsSignificant =
      modelAction?.coefficients.filter((c) => c.name.startsWith('action_') && c.significantAt05) ?? [];

    const report = {
      methodologyJa: {
        target: '10営業日後リターン（シグナル翌日エントリー→10営業日後）',
        rowsUsed: 'return10d計算可能な204件（全304のうち）',
        confidence:
          'buy24件はhybrid実測。それ以外はaction別コホート平均で補完（hold≈64.7,buy≈75,watch≈62,reduce≈60）→action独立性の主判定はpriceOnlyモデルを参照',
        ols: 'OLS・actionはhold基準ダミー（buy/watch/reduce）',
        significance: '両側t検定（df大は正規近似）・p<0.05',
      },
      datasetCount: rows.length,
      cachePath: 'scripts/openai-304-regression-dataset.json',
      univariate: {
        continuous: univariateContinuous,
        action: univariateAction,
      },
      multivariate: {
        priceOnlyNoAction: modelPriceOnly,
        priceOnlyWithAction: modelPriceWithAction,
        withConfidenceNoAction: modelBase,
        withConfidenceAndAction: modelAction,
        comparison: {
          priceOnly: {
            rSquaredNoAction: modelPriceOnly?.rSquared ?? null,
            rSquaredWithAction: modelPriceWithAction?.rSquared ?? null,
            deltaRSquared: deltaR2PriceOnly,
            actionDummySignificantAt05:
              modelPriceWithAction?.coefficients
                .filter((c) => c.name.startsWith('action_') && c.significantAt05)
                .map((c) => c.name) ?? [],
          },
          withConfidence: {
            rSquaredNoAction: modelBase?.rSquared ?? null,
            rSquaredWithAction: modelAction?.rSquared ?? null,
            deltaRSquared: deltaR2,
            actionDummySignificantAt05: actionCoeffsSignificant.map((c) => c.name),
          },
        },
      },
      verdictJa: (() => {
        const lines: string[] = [];
        if (!modelPriceOnly || !modelPriceWithAction) {
          lines.push('サンプル不足でOLS未成立');
          return lines;
        }
        lines.push(
          `【主判定・価格特徴のみ】R² ${modelPriceOnly.rSquared} → action追加 ${modelPriceWithAction.rSquared}（Δ=${deltaR2PriceOnly}）`,
        );
        const priceActionSig =
          modelPriceWithAction.coefficients.filter((c) => c.name.startsWith('action_') && c.significantAt05);
        lines.push(
          `価格+actionモデルで有意なactionダミー: ${priceActionSig.length ? priceActionSig.map((c) => `${c.name}(β=${c.beta},p=${c.pValue})`).join(', ') : 'なし'}`,
        );
        if ((deltaR2PriceOnly ?? 0) < 0.01) {
          lines.push('actionはRSI・価格位置・日中変化を入れた後では追加説明力ほぼなし → 単なるラベルに近い');
        } else if ((deltaR2PriceOnly ?? 0) < 0.03) {
          lines.push('actionの独立予測力は弱い（ΔR²<3%）');
        } else {
          lines.push('actionに独立成分の可能性（ただしR²全体は低い）');
        }
        if (modelBase && modelAction) {
          lines.push(
            `【参考・confidence補完込】R² ${modelBase.rSquared} → ${modelAction.rSquared}（Δ=${deltaR2}）※confidenceとactionが相関しやすい`,
          );
        }
        return lines;
      })(),
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-304-return-regression.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== REGRESSION ===\n', JSON.stringify(report, null, 2));
  }, 600_000);
});
