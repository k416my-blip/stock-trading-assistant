/**
 * 実データ AI 第二評価ログ — npx vitest run tests/live/aiEvalLiveProbe.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { bootstrapSecretsForAiEvalProbe } from '../helpers/aiEvalProbeBootstrap';
import { buildConciergeEvidenceForProactive } from '../../src/services/conciergeEvidenceBuilder';
import { buildEnrichedAiSecondEvaluatorInputs } from '../../src/services/aiSecondEvaluatorDataEnrichment';
import {
  fetchAiSecondEvaluatorBatch,
  resetAiSecondEvaluatorCacheForTest,
} from '../../src/services/aiSecondEvaluatorService';
import { loadAnalysisApiKeys } from '../../src/services/analysisApiKeys';
import { ruleActionToDirectionScore } from '../../src/services/hybridStrategyScoreFusion';
import { getActivePortfolio } from '../../src/services/portfolioPriceUpdate';
import { buildStrategyExecutionBundle } from '../../src/services/strategyExecutionEngine';
import { defaultStrategyExecutionState } from '../../src/services/strategyExecutionStorage';
import type { AppState } from '../../src/types';

function loadStateFromProbePath(): AppState {
  const probePath =
    process.env.AI_EVAL_APP_STATE_PATH ??
    path.join(process.env.TEMP ?? '/tmp', 'sta-app-state.json');
  if (!fs.existsSync(probePath)) {
    throw new Error(`app_state not found: ${probePath}`);
  }
  const raw = fs.readFileSync(probePath, 'utf8');
  const parsed = JSON.parse(raw) as { state?: AppState } & AppState;
  return parsed.state ?? parsed;
}

describe('live: ai second evaluator on device portfolio', () => {
  it('prints one full AI_EVAL log cycle', async () => {
    await bootstrapSecretsForAiEvalProbe();
    const state = loadStateFromProbePath();
    const holdings = getActivePortfolio(state);
    console.log(
      '[AI_EVAL_PROBE] holdings',
      holdings.map((h) => `${h.symbol}(${h.market}) x${h.shares}`).join(', '),
    );

    const apiKeys = await loadAnalysisApiKeys();
    const evidence = await buildConciergeEvidenceForProactive(state, apiKeys, 'balanced');

    const strat = buildStrategyExecutionBundle(
      {
        evidenceSymbols: evidence.symbols,
        globalMarket: null,
        portfolioIntel: null,
        symbolWeightPct: Object.fromEntries(
          evidence.symbols.map((s) => [s.symbol, s.portfolioHolding ? 20 : 5]),
        ),
        tacticalMode: 'balanced',
        regimeId: 'sideways',
      },
      defaultStrategyExecutionState(),
    );

    const ruleScoresBySymbol: Record<string, number> = {};
    for (const r of [...strat.todayRecommendations, ...strat.watchList, ...strat.dangerAvoid]) {
      const sym = r.symbol.toUpperCase();
      if (!ruleScoresBySymbol[sym]) {
        ruleScoresBySymbol[sym] = ruleActionToDirectionScore(r.action, r.confidencePct);
      }
    }

    const quoteMetaBySymbol = Object.fromEntries(
      holdings.map((h) => [
        h.symbol.toUpperCase(),
        {
          quoteSource: h.lastQuoteProvider ?? h.priceSource ?? 'unknown',
          priceAgeSeconds: h.quoteAgeSeconds ?? null,
          quoteIsStale: h.isStale ?? false,
        },
      ]),
    );

    resetAiSecondEvaluatorCacheForTest();
    const batch = await fetchAiSecondEvaluatorBatch(evidence.symbols, {
      force: true,
      degradedMode: false,
      ruleScoresBySymbol,
      quoteMetaBySymbol,
    });
    const enriched = await buildEnrichedAiSecondEvaluatorInputs(evidence.symbols, {
      quoteMetaBySymbol,
    });
    const ai = batch.symbols.find((s) => s.symbol.toUpperCase() === '0820EA');
    const inp = enriched.find((s) => s.symbol.toUpperCase() === '0820EA');
    const report = {
      symbol: '0820EA',
      action: ai?.action ?? null,
      confidence: ai?.confidence ?? null,
      rationaleJa: ai?.rationaleJa ?? null,
      currentPrice: inp?.currentPrice ?? null,
      RSI: inp?.rsi14 ?? null,
      rsiSource: inp?.rsiSource ?? null,
      priceHistoryBars: inp?.priceHistoryBars ?? null,
      newsCount: inp?.newsCount ?? null,
      newsSource: inp?.newsSource ?? null,
      xSentiment: inp?.xSentimentDisplay ?? inp?.xSentimentSummaryJa ?? null,
      quoteSource: inp?.quoteSource ?? null,
      batchSource: batch.source,
    };
    console.log('[0820EA_AI_EVAL_REPORT]', JSON.stringify(report));
    const reportPath = path.join(process.cwd(), 'scripts', '0820ea-report.json');
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }, 120_000);
});
