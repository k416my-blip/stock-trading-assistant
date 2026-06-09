/**
 * OpenAI buy 24件 × ハイブリッド finalAction 突合
 * npx vitest run tests/live/openAi30dBuyHybridAnalysis.test.ts
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
  evaluateOpenAiHybridRow,
  loadHistoricalDayInputs,
  patchEnrichedInputsForDay,
  type OpenAiHybridRow,
} from '../helpers/openAi30dMeasurement';
import { toYahooSymbol, type ProbeSymbol } from '../helpers/buyAction30dAudit';

describe('OpenAI buy → finalAction hybrid analysis', () => {
  beforeAll(() => {
    vi.spyOn(aiEvalLog, 'logAiEvalStart').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalResponse').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalEnd').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalPrompt').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalOpenAiSkipped').mockImplementation(() => {});
  });

  it('lists all OpenAI buy rows with hybrid fields', async () => {
    await bootstrapSecretsForAiEvalProbe();
    resetAiSecondEvaluatorCacheForTest();

    const state = buildProbeAppState(10, 'bursa-first');
    const apiKeys = await loadAnalysisApiKeys();
    const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
      symbol: p.symbol,
      market: p.market as ProbeSymbol['market'],
      yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
    }));
    const weightPct = 100 / symbols.length;

    const evidence = await buildConciergeEvidenceForProactive(state, apiKeys, 'balanced');
    const { daySlices } = await loadHistoricalDayInputs(symbols);
    const baseEnriched = await buildEnrichedAiSecondEvaluatorInputs(evidence.symbols, {
      forceRefresh: true,
      degradedMode: false,
    });
    const ruleScoresBySymbol = Object.fromEntries(
      evidence.symbols.map((s) => [s.symbol.toUpperCase(), 50]),
    );

    const buyHybridRows: OpenAiHybridRow[] = [];

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
        buyHybridRows.push(
          evaluateOpenAiHybridRow(
            {
              date: day.date,
              symbol: p.symbol,
              market: p.market,
              dayChangePct: p.dayChangePct,
              rsi14: p.rsi14,
              close: p.close,
              weightPct,
            },
            ai,
          ),
        );
      }
    }

    const finalBuy = buyHybridRows.filter((r) => r.finalAction === 'buy');
    const notFinalBuy = buyHybridRows.filter((r) => r.finalAction !== 'buy');
    const tally = {
      'openai buy → final hold': buyHybridRows.filter(
        (r) => r.openAiAction === 'buy' && r.finalAction === 'hold',
      ).length,
      'openai buy → final watch': buyHybridRows.filter(
        (r) => r.openAiAction === 'buy' && r.finalAction === 'watch',
      ).length,
      'openai buy → final reduce': buyHybridRows.filter(
        (r) => r.openAiAction === 'buy' && r.finalAction === 'reduce',
      ).length,
      'openai buy → final buy': finalBuy.length,
    };

    const report = {
      openAiBuyCount: buyHybridRows.length,
      finalBuyCount: finalBuy.length,
      notFinalBuyCount: notFinalBuy.length,
      tally,
      allRows: buyHybridRows.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol)),
      demotionReasons: [...new Set(notFinalBuy.map((r) => r.demotionReason).filter(Boolean))],
    };

    const outPath = path.join(process.cwd(), 'scripts', 'openai-buy-hybrid-analysis.json');
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== OPENAI BUY HYBRID ANALYSIS ===\n', JSON.stringify(report, null, 2));

    expect(buyHybridRows.length).toBeGreaterThan(0);
    expect(tally['openai buy → final buy'] + tally['openai buy → final hold'] +
      tally['openai buy → final watch'] + tally['openai buy → final reduce']).toBe(buyHybridRows.length);
  }, 600_000);
});
