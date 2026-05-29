/**
 * Phase B — ルール戦略バンドルに OpenAI 第二評価スコアを統合（既存ルール結果は保持）
 */
import { buildEnrichedAiSecondEvaluatorInputs } from './aiSecondEvaluatorDataEnrichment';
import { fetchAiSecondEvaluatorBatch } from './aiSecondEvaluatorService';
import {
  buildHybridSymbolScore,
  fusedActionToStrategyAction,
  ruleActionToDirectionScore,
} from './hybridStrategyScoreFusion';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { AiSecondEvaluatorAction } from '../types/aiSecondEvaluator';
import type { AiSecondEvaluatorBatchResult } from '../types/aiSecondEvaluator';
import { buildPortfolioAiEvaluation } from './portfolioAiEvaluationBuilder';
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
): StrategySymbolRecommendation {
  const ai = aiBySymbol.get(rec.symbol.toUpperCase());
  if (!ai) return rec;

  const rsi = rsiBySymbol.get(rec.symbol.toUpperCase());

  const hybridCore = buildHybridSymbolScore({
    ruleAction: rec.action,
    ruleConfidencePct: rec.confidencePct,
    aiAction: ai.action,
    aiConfidencePct: ai.confidence,
    rationaleJa: ai.rationaleJa,
  });

  const hybrid: StrategySymbolHybridScore = {
    ruleScore: hybridCore.ruleScore,
    aiScore: hybridCore.aiScore,
    finalScore: hybridCore.finalScore,
    ruleAction: rec.action,
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
    ruleWeightPct: 70,
    aiWeightPct: 30,
  };
}

function buildRuleScoresBySymbol(bundle: StrategyExecutionBundle): Record<string, number> {
  const out: Record<string, number> = {};
  const allRecs = [
    ...bundle.todayRecommendations,
    ...bundle.dangerAvoid,
    ...bundle.watchList,
    ...bundle.highExpectancy,
  ];
  for (const r of allRecs) {
    const sym = r.symbol.toUpperCase();
    if (!out[sym]) {
      out[sym] = ruleActionToDirectionScore(r.action, r.confidencePct);
    }
  }
  return out;
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
  const ruleScoresBySymbol = buildRuleScoresBySymbol(bundle);
  const [batch, enrichedInputs] = await Promise.all([
    fetchAiSecondEvaluatorBatch(evidenceSymbols, {
      force: options.forceAi,
      degradedMode: options.degradedMode,
      ruleScoresBySymbol,
    }),
    buildEnrichedAiSecondEvaluatorInputs(evidenceSymbols, {
      degradedMode: options.degradedMode,
    }),
  ]);

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
    enhancedBySymbol.set(sym, applyHybridToRecommendation(rec, aiBySymbol, rsiBySymbol));
  }

  const pick = (rec: StrategySymbolRecommendation) =>
    enhancedBySymbol.get(rec.symbol.toUpperCase()) ?? rec;

  const portfolioAiEvaluation = buildPortfolioAiEvaluation({
    enrichedInputs,
    batch,
    ruleScoresBySymbol,
    symbolWeightPct: options.symbolWeightPct ?? {},
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
