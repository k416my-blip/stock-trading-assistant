/**
 * 全304観測 × RSI帯域別 — buy率・フォワードリターン
 * npx vitest run tests/unit/openAiRsiBucketAnalysis.test.ts
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
  fetchYahooDailyBars,
  toYahooSymbol,
  type DailyBar,
  type ProbeSymbol,
} from '../helpers/buyAction30dAudit';
import type { AiSecondEvaluatorAction } from '../../src/types/aiSecondEvaluator';

type Obs = {
  date: string;
  symbol: string;
  rsi14: number;
  openAiAction: AiSecondEvaluatorAction;
  return5d: number | null;
  return10d: number | null;
  return20d: number | null;
};

const BUCKETS = [
  { id: 'lte40', label: 'RSI 40以下', match: (r: number) => r <= 40 },
  { id: '40_50', label: 'RSI 40-50', match: (r: number) => r > 40 && r <= 50 },
  { id: '50_60', label: 'RSI 50-60', match: (r: number) => r > 50 && r <= 60 },
  { id: '60_70', label: 'RSI 60-70', match: (r: number) => r > 60 && r <= 70 },
  { id: 'gte70', label: 'RSI 70以上', match: (r: number) => r > 70 },
] as const;

function forwardReturn(bars: DailyBar[], date: string, horizon: number): number | null {
  const idx = bars.findIndex((b) => b.date === date);
  if (idx < 0 || idx + horizon >= bars.length) return null;
  const entry = bars[idx + 1]!.close;
  const exit = bars[idx + horizon]!.close;
  if (entry <= 0) return null;
  return ((exit - entry) / entry) * 100;
}

function avg(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function summarizeBucket(rows: Obs[]) {
  const buyCount = rows.filter((r) => r.openAiAction === 'buy').length;
  const n = rows.length;
  return {
    count: n,
    buyRatePct: n > 0 ? Math.round((buyCount / n) * 1000) / 10 : 0,
    avgReturn5d: avg(rows.map((r) => r.return5d).filter((v): v is number => v != null)),
    avgReturn10d: avg(rows.map((r) => r.return10d).filter((v): v is number => v != null)),
    avgReturn20d: avg(rows.map((r) => r.return20d).filter((v): v is number => v != null)),
    samplesWithReturn5d: rows.filter((r) => r.return5d != null).length,
    samplesWithReturn10d: rows.filter((r) => r.return10d != null).length,
    samplesWithReturn20d: rows.filter((r) => r.return20d != null).length,
  };
}

function analyzeCohort(rows: Obs[]) {
  const withRsi = rows.filter((r) => Number.isFinite(r.rsi14));
  return {
    totalObservations: rows.length,
    withRsiCount: withRsi.length,
    byRsiBucket: Object.fromEntries(
      BUCKETS.map((b) => [b.id, { label: b.label, ...summarizeBucket(withRsi.filter((r) => b.match(r.rsi14))) }]),
    ),
  };
}

describe('OpenAI RSI bucket analysis (304 obs)', () => {
  beforeAll(() => {
    vi.spyOn(aiEvalLog, 'logAiEvalStart').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalResponse').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalEnd').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalPrompt').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalOpenAiSkipped').mockImplementation(() => {});
  });

  it('classifies all observations by RSI and aggregates returns', async () => {
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

    const barsBySymbol = new Map<string, DailyBar[]>();
    for (const s of symbols) {
      barsBySymbol.set(s.symbol, await fetchYahooDailyBars(s.yahooSymbol));
    }

    const allObs: Obs[] = [];

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
        const bars = barsBySymbol.get(p.symbol)!;
        allObs.push({
          date: day.date,
          symbol: p.symbol,
          rsi14: p.rsi14,
          openAiAction: ai.action,
          return5d: forwardReturn(bars, day.date, 5),
          return10d: forwardReturn(bars, day.date, 10),
          return20d: forwardReturn(bars, day.date, 20),
        });
      }
    }

    const actionCounts: Record<AiSecondEvaluatorAction, number> = {
      buy: 0,
      hold: 0,
      watch: 0,
      reduce: 0,
    };
    for (const o of allObs) actionCounts[o.openAiAction] += 1;

    const report = {
      methodologyJa:
        '304観測=10銘柄×約30営業日。RSIは当日終値ベースRSI14。buy率=帯域内OpenAI buy件数/帯域件数。リターンは翌営業日エントリー→N営業日後（全観測・action問わず帯域内平均）。',
      observationCount: allObs.length,
      openAiActionCounts: actionCounts,
      allObservations: analyzeCohort(allObs),
      openAiBuyOnly: analyzeCohort(allObs.filter((o) => o.openAiAction === 'buy')),
      openAiHoldOnly: analyzeCohort(allObs.filter((o) => o.openAiAction === 'hold')),
    };

    const outPath = path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-analysis.json');
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(
      path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'),
      `${JSON.stringify(allObs, null, 2)}\n`,
      'utf8',
    );
    // eslint-disable-next-line no-console
    console.log('\n=== OPENAI RSI BUCKET ANALYSIS ===\n', JSON.stringify(report, null, 2));
  }, 600_000);
});
