/**
 * Phase B — ルール戦略バンドルに OpenAI 第二評価スコアを統合（既存ルール結果は保持）
 */
import { buildEnrichedAiSecondEvaluatorInputs } from './aiSecondEvaluatorDataEnrichment';
import { fetchAiSecondEvaluatorBatch } from './aiSecondEvaluatorService';
import {
  buildHybridSymbolScore,
  fusedActionToStrategyAction,
} from './hybridStrategyScoreFusion';
import type { StrategyAction } from '../types/strategyExecution';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { AiSecondEvaluatorAction } from '../types/aiSecondEvaluator';
import type { AiSecondEvaluatorBatchResult } from '../types/aiSecondEvaluator';
import { logPortfolioBestTodayBuild } from './conciergeEvidenceTrace';
import { logRealApiMode } from '../constants/realApiMode';
import {
  buildPerSymbolRankingMap,
  rankingMapToRuleScores,
} from './hybridRankingConflict';
import { buildPortfolioAiEvaluation } from './portfolioAiEvaluationBuilder';
import { HYBRID_AI_SCORE_WEIGHT, HYBRID_RULE_SCORE_WEIGHT } from '../constants/hybridStrategyScore';
import type {
  HybridSecondEvaluatorSummary,
  StrategyExecutionBundle,
  StrategySymbolRecommendation,
  StrategySymbolHybridScore,
} from '../types/strategyExecution';

function applyHybridToRecommendation(
  rec: StrategySymbolRecommendation,
  aiBySymbol: Map<string, { action: AiSecondEvaluatorAction; confidence: number; rationaleJa: string }>,
  rsiBySymbol: Map<string, { rsi14: number | null; rsiSource?: string }>,
  effectiveRuleAction: StrategyAction,
): StrategySymbolRecommendation {
  const ai = aiBySymbol.get(rec.symbol.toUpperCase());
  if (!ai) return rec;

  const rsi = rsiBySymbol.get(rec.symbol.toUpperCase());

  const hybridCore = buildHybridSymbolScore({
    ruleAction: effectiveRuleAction,
    ruleConfidencePct: rec.confidencePct,
    aiAction: ai.action,
    aiConfidencePct: ai.confidence,
    rationaleJa: ai.rationaleJa,
  });

  const hybrid: StrategySymbolHybridScore = {
    ruleScore: hybridCore.ruleScore,
    aiScore: hybridCore.aiScore,
    finalScore: hybridCore.finalScore,
    ruleAction: effectiveRuleAction,
    aiAction: ai.action,
    aiConfidencePct: ai.confidence,
    fusedAction: hybridCore.fusedAction,
    fusedConfidencePct: hybridCore.fusedConfidencePct,
    rationaleJa: ai.rationaleJa,
    rsi14: rsi?.rsi14 ?? null,
    rsiSource: rsi?.rsiSource,
  };

  return {
    ...rec,
    hybrid,
    fusedDisplayAction: fusedActionToStrategyAction(hybridCore.fusedAction),
    fusedDisplayConfidencePct: hybridCore.fusedConfidencePct,
  };
}

function buildSummary(
  batch: AiSecondEvaluatorBatchResult,
  symbolCount: number,
): HybridSecondEvaluatorSummary {
  return {
    generatedAt: batch.fetchedAt,
    source: batch.source,
    symbolCount,
    ruleWeightPct: Math.round(HYBRID_RULE_SCORE_WEIGHT * 100),
    aiWeightPct: Math.round(HYBRID_AI_SCORE_WEIGHT * 100),
  };
}

export type EnhanceStrategyHybridOptions = {
  forceAi?: boolean;
  degradedMode?: boolean;
  symbolWeightPct?: Record<string, number>;
};

/**
 * 既存 buildStrategyExecutionBundle の出力に第二評価を重ねる。
 * ルールエンジンの action / confidencePct は上書きしない。
 */
export async function enhanceStrategyBundleWithHybridEvaluator(
  bundle: StrategyExecutionBundle,
  evidenceSymbols: ConciergeSymbolEvidence[],
  options: EnhanceStrategyHybridOptions = {},
): Promise<StrategyExecutionBundle> {
  const [batch, enrichedInputs] = await Promise.all([
    fetchAiSecondEvaluatorBatch(evidenceSymbols, {
      force: options.forceAi,
      degradedMode: options.degradedMode,
      ruleScoresBySymbol: {},
    }),
    buildEnrichedAiSecondEvaluatorInputs(evidenceSymbols, {
      degradedMode: options.degradedMode,
    }),
  ]);

  const evidenceBySymbol = new Map(
    evidenceSymbols.map((s) => [s.symbol.toUpperCase(), s] as const),
  );
  const rankingBySymbol = buildPerSymbolRankingMap({
    bundle,
    evidenceBySymbol,
    enrichedInputs,
    batch,
    symbolWeightPct: options.symbolWeightPct ?? {},
  });
  const ruleScoresBySymbol = rankingMapToRuleScores(rankingBySymbol);

  const rsiBySymbol = new Map(
    enrichedInputs.map((inp) => [
      inp.symbol.toUpperCase(),
      { rsi14: inp.rsi14, rsiSource: inp.rsiSource },
    ]),
  );

  const aiBySymbol = new Map(
    batch.symbols.map((s) => [
      s.symbol.toUpperCase(),
      { action: s.action, confidence: s.confidence, rationaleJa: s.rationaleJa },
    ]),
  );

  const allRecs = [
    ...bundle.todayRecommendations,
    ...bundle.dangerAvoid,
    ...bundle.watchList,
    ...bundle.highExpectancy,
  ];
  const uniqueBySymbol = new Map<string, StrategySymbolRecommendation>();
  for (const r of allRecs) {
    uniqueBySymbol.set(r.symbol.toUpperCase(), r);
  }

  const enhancedBySymbol = new Map<string, StrategySymbolRecommendation>();
  for (const [sym, rec] of uniqueBySymbol) {
    const ranking = rankingBySymbol.get(sym);
    const effectiveRule = ranking?.effectiveRuleAction ?? rec.action;
    enhancedBySymbol.set(sym, applyHybridToRecommendation(rec, aiBySymbol, rsiBySymbol, effectiveRule));
  }

  const pick = (rec: StrategySymbolRecommendation) =>
    enhancedBySymbol.get(rec.symbol.toUpperCase()) ?? rec;

  const portfolioAiEvaluation = buildPortfolioAiEvaluation({
    enrichedInputs,
    batch,
    ruleScoresBySymbol,
    symbolWeightPct: options.symbolWeightPct ?? {},
    rankingBySymbol,
  });

  const conflictBySymbol: Record<string, boolean> = {};
  for (const [sym, r] of rankingBySymbol) {
    conflictBySymbol[sym] = r.conflict;
  }
  logPortfolioBestTodayBuild({
    portfolioScore: portfolioAiEvaluation.portfolioScore,
    batchSource: portfolioAiEvaluation.batchSource,
    bestToday: portfolioAiEvaluation.bestToday.map((e) => ({
      rank: e.rank,
      symbol: e.symbol,
      finalScore: e.finalScore,
      ruleScore: e.ruleScore,
      aiScore: e.aiScore,
      action: e.action,
      conflict: conflictBySymbol[e.symbol.toUpperCase()] ?? false,
    })),
    rankedTop10: portfolioAiEvaluation.rankedHoldings.slice(0, 10).map((e) => ({
      rank: e.rank,
      symbol: e.symbol,
      finalScore: e.finalScore,
      action: e.action,
      conflict: conflictBySymbol[e.symbol.toUpperCase()] ?? false,
    })),
  });

  logRealApiMode('strategy_hybrid_enhanced', {
    batchSource: portfolioAiEvaluation.batchSource,
    openAiSource: batch.source,
    symbolCount: enrichedInputs.length,
    degradedMode: options.degradedMode ?? false,
  });

  return {
    ...bundle,
    todayRecommendations: bundle.todayRecommendations.map(pick),
    dangerAvoid: bundle.dangerAvoid.map(pick),
    watchList: bundle.watchList.map(pick),
    highExpectancy: bundle.highExpectancy.map(pick),
    hybridSecondEvaluator: buildSummary(batch, enrichedInputs.length),
    portfolioAiEvaluation,
  };
}
