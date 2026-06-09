/**
 * OpenAI 第二評価 — 30営業日実測（日次バッチ × 保有銘柄）
 * npx vitest run tests/live/openAi30dMeasurement.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
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
  confidenceHistogram,
  countAiActions,
  featureMeans,
  loadHistoricalDayInputs,
  patchEnrichedInputsForDay,
  simulateTargetBuyRate,
  type OpenAiObsRow,
} from '../helpers/openAi30dMeasurement';
import { toYahooSymbol, type ProbeSymbol } from '../helpers/buyAction30dAudit';

describe('OpenAI 30d measurement (live)', () => {
  beforeAll(() => {
    vi.spyOn(aiEvalLog, 'logAiEvalStart').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalResponse').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalEnd').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalPrompt').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalOpenAiSkipped').mockImplementation(() => {});
  });

  it('runs daily OpenAI batches and prints analysis report', async () => {
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
    const templateBySymbol = new Map(
      evidence.symbols.map((s) => [s.symbol.toUpperCase(), s] as const),
    );

    const { daySlices } = await loadHistoricalDayInputs(symbols);
    const baseEnriched = await buildEnrichedAiSecondEvaluatorInputs(evidence.symbols, {
      forceRefresh: true,
      degradedMode: false,
    });
    const allRows: OpenAiObsRow[] = [];
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
        const tpl = templateBySymbol.get(p.symbol.toUpperCase());
        if (!ai || !tpl) continue;
        allRows.push({
          date: day.date,
          symbol: p.symbol,
          dayChangePct: p.dayChangePct,
          rsi14: p.rsi14,
          ai,
          newsCount: tpl.latestFinancialNews?.length ?? 0,
          xPostCount: tpl.xSentiment?.postCount ?? 0,
          newsApiCount: 0,
        });
      }
    }

    const actions = countAiActions(allRows);
    const confHist = confidenceHistogram(allRows);
    const buyRows = allRows.filter((r) => r.ai.action === 'buy');
    const holdRows = allRows.filter((r) => r.ai.action === 'hold');
    const buyFeat = featureMeans(buyRows);
    const holdFeat = featureMeans(holdRows);
    const buyPct = Math.round((actions.buy / allRows.length) * 1000) / 10;

    const rateSim = [10, 15, 20].map((pct) => ({
      targetPct: pct,
      ...simulateTargetBuyRate(allRows, pct),
    }));

    const report = {
      observationCount: allRows.length,
      openAiSource: 'fetchAiSecondEvaluatorBatch per trading day (force)',
      noteJa:
        'ニュース/Xはテンプレート（直近 proactive 1回）を日次に流用。価格・日中変化・RSIは日次実績。30回OpenAI呼び出し（日次10銘柄チャンク）。',
      actionCounts: actions,
      buyRatePct: buyPct,
      confidenceHistogram: confHist,
      buyCommonFeatures: buyFeat,
      holdBaselineFeatures: holdFeat,
      buyVsHoldDelta: {
        rsi14: Math.round((buyFeat.rsi14Mean - holdFeat.rsi14Mean) * 10) / 10,
        dayChangePct: Math.round((buyFeat.dayChangePctMean - holdFeat.dayChangePctMean) * 100) / 100,
        newsCount: Math.round((buyFeat.newsCountMean - holdFeat.newsCountMean) * 10) / 10,
        xPostCount: Math.round((buyFeat.xPostCountMean - holdFeat.xPostCountMean) * 10) / 10,
        aiConfidence: Math.round((buyFeat.aiConfidenceMean - holdFeat.aiConfidenceMean) * 10) / 10,
      },
      buySamples: buyRows.slice(0, 12).map((r) => ({
        date: r.date,
        symbol: r.symbol,
        rsi14: r.rsi14,
        dayChangePct: Math.round(r.dayChangePct * 100) / 100,
        conf: r.ai.confidence,
        action: r.ai.action,
        rationale: r.ai.rationaleJa.slice(0, 80),
      })),
      buyRateSimulation: rateSim,
      compareToRsiProxy: {
        rsiProxyBuyCount16: 'prior audit — RSI≤30 fallback only, not OpenAI',
      },
    };

    const outPath = path.join(process.cwd(), 'scripts', 'openai-30d-report.json');
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== OPENAI 30D MEASUREMENT ===\n', JSON.stringify(report, null, 2));
    // eslint-disable-next-line no-console
    console.log(`\n[OPENAI_30D_REPORT_WRITTEN] ${outPath}\n`);

    expect(allRows.length).toBeGreaterThan(250);
    expect(actions.buy + actions.hold + actions.watch + actions.reduce).toBe(allRows.length);
  }, 600_000);
});
