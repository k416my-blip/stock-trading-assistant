/**
 * 実運用検証 — 保有数別の処理時間・ランキング・スコア・API使用量
 * npx vitest run tests/live/operationalPortfolioAiVerify.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildProbeAppState, buildSkewedProbeState } from '../helpers/buildProbeAppState';
import { bootstrapSecretsForAiEvalProbe } from '../helpers/aiEvalProbeBootstrap';
import { buildConciergeEvidenceForProactive } from '../../src/services/conciergeEvidenceBuilder';
import { buildEnrichedAiSecondEvaluatorInputs } from '../../src/services/aiSecondEvaluatorDataEnrichment';
import {
  fetchAiSecondEvaluatorBatch,
  resetAiSecondEvaluatorCacheForTest,
} from '../../src/services/aiSecondEvaluatorService';
import { loadAnalysisApiKeys } from '../../src/services/analysisApiKeys';
import { buildSymbolWeightPctMap } from '../../src/services/metaDecisionPortfolioWeights';
import { buildPortfolioAiEvaluation } from '../../src/services/portfolioAiEvaluationBuilder';
import { getActivePortfolio } from '../../src/services/portfolioPriceUpdate';
import { ruleActionToDirectionScore } from '../../src/services/hybridStrategyScoreFusion';
import { buildStrategyExecutionBundle } from '../../src/services/strategyExecutionEngine';
import { enhanceStrategyBundleWithHybridEvaluator } from '../../src/services/strategyHybridEnhancement';
import { defaultStrategyExecutionState } from '../../src/services/strategyExecutionStorage';

type TimingMs = {
  evidenceMs: number;
  strategyMs: number;
  enrichMs: number;
  aiBatchMs: number;
  hybridMs: number;
  totalMs: number;
};

async function runPortfolioPipeline(holdingCount: number) {
  const state = buildProbeAppState(holdingCount);
  const holdings = getActivePortfolio(state);
  expect(holdings.length).toBeGreaterThanOrEqual(Math.min(holdingCount, 5));

  const t0 = Date.now();
  const apiKeys = await loadAnalysisApiKeys();

  const tEvidence = Date.now();
  const evidence = await buildConciergeEvidenceForProactive(state, apiKeys, 'balanced');
  const evidenceMs = Date.now() - tEvidence;
  expect(evidence.symbols.length).toBe(holdings.length);

  const symbolWeightPct = buildSymbolWeightPctMap(holdings);

  const tStrategy = Date.now();
  const strat = buildStrategyExecutionBundle(
    {
      evidenceSymbols: evidence.symbols,
      globalMarket: null,
      portfolioIntel: null,
      symbolWeightPct,
      tacticalMode: 'balanced',
      regimeId: 'sideways',
    },
    defaultStrategyExecutionState(),
  );
  const strategyMs = Date.now() - tStrategy;

  const ruleScoresBySymbol: Record<string, number> = {};
  for (const r of [
    ...strat.todayRecommendations,
    ...strat.watchList,
    ...strat.dangerAvoid,
    ...strat.highExpectancy,
  ]) {
    const sym = r.symbol.toUpperCase();
    if (!ruleScoresBySymbol[sym]) {
      ruleScoresBySymbol[sym] = ruleActionToDirectionScore(r.action, r.confidencePct);
    }
  }

  const quoteMetaBySymbol = Object.fromEntries(
    holdings.map((h) => [
      h.symbol.toUpperCase(),
      {
        quoteSource: h.lastQuoteProvider ?? 'yahoo_finance',
        priceAgeSeconds: h.quoteAgeSeconds ?? 30,
        quoteIsStale: false,
      },
    ]),
  );

  resetAiSecondEvaluatorCacheForTest();

  const tEnrich = Date.now();
  const enriched = await buildEnrichedAiSecondEvaluatorInputs(evidence.symbols, {
    quoteMetaBySymbol,
    forceRefresh: false,
  });
  const enrichMs = Date.now() - tEnrich;

  const tBatch = Date.now();
  const batch = await fetchAiSecondEvaluatorBatch(evidence.symbols, {
    force: true,
    degradedMode: false,
    ruleScoresBySymbol,
    quoteMetaBySymbol,
  });
  const aiBatchMs = Date.now() - tBatch;

  const tHybrid = Date.now();
  const enhanced = await enhanceStrategyBundleWithHybridEvaluator(strat, evidence.symbols, {
    symbolWeightPct,
    degradedMode: false,
  });
  const hybridMs = Date.now() - tHybrid;

  const portfolioEval = enhanced.portfolioAiEvaluation!;
  const totalMs = Date.now() - t0;

  const timings: TimingMs = {
    evidenceMs,
    strategyMs,
    enrichMs,
    aiBatchMs,
    hybridMs,
    totalMs,
  };

  const ranks = portfolioEval.rankedHoldings.map((r) => r.rank);
  const scores = portfolioEval.rankedHoldings.map((r) => r.finalScore);
  for (let i = 1; i < scores.length; i++) {
    expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
  }
  expect(ranks[0]).toBe(1);

  return {
    holdingCount: holdings.length,
    symbols: holdings.map((h) => h.symbol),
    timings,
    evaluatedAt: portfolioEval.generatedAt,
    evaluatedAtJa: portfolioEval.evaluatedAtJa,
    portfolioScore: portfolioEval.portfolioScore,
    batchSource: batch.source,
    tokenUsage: batch.tokenUsage ?? null,
    latencyMs: batch.latencyMs ?? null,
    openAiSkippedReason: batch.openAiSkippedReason,
    bestToday: portfolioEval.bestToday.map((b) => ({
      symbol: b.symbol,
      action: b.action,
      finalScore: b.finalScore,
    })),
    worstToday: portfolioEval.worstToday.map((w) => ({
      symbol: w.symbol,
      action: w.action,
      finalScore: w.finalScore,
    })),
    riskWarningCount: portfolioEval.riskWarnings.length,
    rankedTop5: portfolioEval.rankedHoldings.slice(0, 5).map((r) => ({
      rank: r.rank,
      symbol: r.symbol,
      finalScore: r.finalScore,
      action: r.action,
      confidence: r.confidence,
      rsi14: r.rsi14,
      sources: r.dataSources,
    })),
  };
}

describe('operational: portfolio-wide AI evaluation', () => {
  it(
    'benchmark 5/10/20 holdings + score drift + write report',
    async () => {
      await bootstrapSecretsForAiEvalProbe();

      const scenarios: Awaited<ReturnType<typeof runPortfolioPipeline>>[] = [];

      for (const n of [5, 10, 20]) {
        console.log(`[OPS_AI] starting pipeline holdingCount=${n}`);
        const result = await runPortfolioPipeline(n);
        scenarios.push(result);
        console.log(`[OPS_AI] done n=${n} totalMs=${result.timings.totalMs} score=${result.portfolioScore}`);
      }

      expect(scenarios[0]!.bestToday[0]?.symbol).toBeTruthy();
      expect(scenarios[2]!.holdingCount).toBe(20);

      const bestA = scenarios[0]!.bestToday[0]?.symbol;
      const bestC = scenarios[2]!.bestToday[0]?.symbol;
      const worstA = scenarios[0]!.worstToday[0]?.symbol;
      const worstC = scenarios[2]!.worstToday[0]?.symbol;

      const stateEqual = buildProbeAppState(8);
      const stateSkew = buildSkewedProbeState(
        stateEqual.portfolio.map((p) => p.symbol),
        '0820EA',
        5000,
      );
      const scoreEqual = (await runPortfolioPipeline(8)).portfolioScore;
      resetAiSecondEvaluatorCacheForTest();
      const scoreSkew = (
        await (async () => {
          const holdings = getActivePortfolio(stateSkew);
          const apiKeys = await loadAnalysisApiKeys();
          const evidence = await buildConciergeEvidenceForProactive(stateSkew, apiKeys, 'balanced');
          const symbolWeightPct = buildSymbolWeightPctMap(holdings);
          const strat = buildStrategyExecutionBundle(
            {
              evidenceSymbols: evidence.symbols,
              globalMarket: null,
              portfolioIntel: null,
              symbolWeightPct,
              tacticalMode: 'balanced',
              regimeId: 'sideways',
            },
            defaultStrategyExecutionState(),
          );
          const ruleScoresBySymbol: Record<string, number> = {};
          for (const r of [...strat.todayRecommendations, ...strat.watchList]) {
            ruleScoresBySymbol[r.symbol.toUpperCase()] = ruleActionToDirectionScore(
              r.action,
              r.confidencePct,
            );
          }
          const batch = await fetchAiSecondEvaluatorBatch(evidence.symbols, {
            force: true,
            ruleScoresBySymbol,
          });
          const enhanced = await enhanceStrategyBundleWithHybridEvaluator(strat, evidence.symbols, {
            symbolWeightPct,
          });
          return {
            portfolioScore: enhanced.portfolioAiEvaluation!.portfolioScore,
            batch,
          };
        })()
      ).portfolioScore;

      const report = {
        generatedAt: new Date().toISOString(),
        checklists: {
          holdings5Plus: scenarios[0]!.holdingCount >= 5,
          rankingSorted: true,
          bestWorstPresent: scenarios.every((s) => s.bestToday.length > 0 && s.worstToday.length > 0),
          bestChangedAcrossCounts: bestA !== bestC || scenarios[0]!.bestToday[0]?.finalScore !== scenarios[2]!.bestToday[0]?.finalScore,
          worstChangedAcrossCounts: worstA !== worstC || scenarios[0]!.worstToday[0]?.finalScore !== scenarios[2]!.worstToday[0]?.finalScore,
          portfolioScoreDriftOnSkew: scoreEqual !== scoreSkew,
          scoreEqual,
          scoreSkew,
        },
        scenarios,
        notes: [
          'Timings include live Yahoo/News/OpenAI when keys configured in .env.local',
          '10/20 holdings use chunked OpenAI requests (8 symbols per chunk)',
        ],
      };

      const outPath = path.join(process.cwd(), 'scripts', 'operational-ai-report.json');
      fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      console.log('[OPS_AI_REPORT]', JSON.stringify(report, null, 2));
      console.log('[OPS_AI_REPORT] written', outPath);

      expect(scenarios[0]!.holdingCount).toBeGreaterThanOrEqual(5);
      expect(report.checklists.rankingSorted).toBe(true);
    },
    600_000,
  );
});
