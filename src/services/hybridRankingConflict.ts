/**
 * ランキング — ルール×AI 矛盾の解消（REDUCE→WATCH 降格・RSI ガード）
 */
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { AiSecondEvaluatorAction } from '../types/aiSecondEvaluator';
import type { AiSecondEvaluatorBatchResult, AiSecondEvaluatorSymbolInput } from '../types/aiSecondEvaluator';
import type { StrategyAction, StrategyExecutionBundle, StrategySymbolRecommendation } from '../types/strategyExecution';
import { ruleActionToDirectionScore } from './hybridStrategyScoreFusion';
import { resolveStrategyAction } from './strategyExecutionEngine';

export const AI_BUY_CONFLICT_MIN_CONFIDENCE = 65;

export function isHybridRankingConflict(
  ruleAction: StrategyAction,
  aiAction: AiSecondEvaluatorAction,
  aiConfidence: number,
): boolean {
  return ruleAction === 'reduce' && aiAction === 'buy' && aiConfidence >= AI_BUY_CONFLICT_MIN_CONFIDENCE;
}

export type RankingRuleResolution = {
  rawRuleAction: StrategyAction;
  effectiveRuleAction: StrategyAction;
  conflict: boolean;
  ruleScore: number;
  /** ランキング表示・bestToday 用の最終 action */
  finalAction: AiSecondEvaluatorAction;
};

export function resolveRankingRuleAction(
  rawRuleAction: StrategyAction,
  aiAction: AiSecondEvaluatorAction,
  aiConfidence: number,
): Pick<RankingRuleResolution, 'effectiveRuleAction' | 'conflict' | 'finalAction'> {
  const conflict = isHybridRankingConflict(rawRuleAction, aiAction, aiConfidence);
  const effectiveRuleAction: StrategyAction = conflict ? 'watch' : rawRuleAction;
  const finalAction: AiSecondEvaluatorAction = conflict ? 'watch' : aiAction;
  return { effectiveRuleAction, conflict, finalAction };
}

export function resolvePerSymbolRanking(
  rawRuleActionForConflict: StrategyAction,
  ruleConfidencePct: number,
  aiAction: AiSecondEvaluatorAction,
  aiConfidence: number,
  effectiveRawRuleAction?: StrategyAction,
): RankingRuleResolution {
  const { effectiveRuleAction, conflict, finalAction } = resolveRankingRuleAction(
    rawRuleActionForConflict,
    aiAction,
    aiConfidence,
  );
  const ruleActionForScore =
    conflict ? effectiveRuleAction : (effectiveRawRuleAction ?? rawRuleActionForConflict);
  const ruleScore = ruleActionToDirectionScore(ruleActionForScore, ruleConfidencePct);
  const resolvedFinalAction: AiSecondEvaluatorAction = conflict
    ? 'watch'
    : effectiveRawRuleAction === 'watch' && rawRuleActionForConflict === 'reduce'
      ? 'watch'
      : finalAction;
  return {
    rawRuleAction: rawRuleActionForConflict,
    effectiveRuleAction: ruleActionForScore,
    conflict,
    ruleScore,
    finalAction: resolvedFinalAction,
  };
}

function findRecommendation(
  bundle: StrategyExecutionBundle,
  symbol: string,
): StrategySymbolRecommendation | undefined {
  const key = symbol.toUpperCase();
  const all = [
    ...bundle.todayRecommendations,
    ...bundle.dangerAvoid,
    ...bundle.watchList,
    ...bundle.highExpectancy,
  ];
  return all.find((r) => r.symbol.toUpperCase() === key);
}

export function buildPerSymbolRankingMap(input: {
  bundle: StrategyExecutionBundle;
  evidenceBySymbol: Map<string, ConciergeSymbolEvidence>;
  enrichedInputs: AiSecondEvaluatorSymbolInput[];
  batch: AiSecondEvaluatorBatchResult;
  symbolWeightPct: Record<string, number>;
}): Map<string, RankingRuleResolution> {
  const regimeId = input.bundle.regimeId ?? 'unknown';
  const aiBySymbol = new Map(
    input.batch.symbols.map((s) => [s.symbol.toUpperCase(), s] as const),
  );
  const out = new Map<string, RankingRuleResolution>();

  for (const inp of input.enrichedInputs) {
    const symKey = inp.symbol.toUpperCase();
    const evidence = input.evidenceBySymbol.get(symKey);
    const rec = findRecommendation(input.bundle, inp.symbol);
    const ai = aiBySymbol.get(symKey);
    if (!evidence || !rec || !ai) continue;

    const weight = input.symbolWeightPct[symKey] ?? 0;
    const rawForConflict = resolveStrategyAction(evidence, regimeId, weight, inp.rsi14, {
      skipRsiOversoldGuard: true,
    });
    const effectiveRawRule = resolveStrategyAction(evidence, regimeId, weight, inp.rsi14);
    out.set(
      symKey,
      resolvePerSymbolRanking(
        rawForConflict,
        rec.confidencePct,
        ai.action,
        ai.confidence,
        effectiveRawRule,
      ),
    );
  }

  return out;
}

export function rankingMapToRuleScores(ranking: Map<string, RankingRuleResolution>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [sym, r] of ranking) {
    out[sym] = r.ruleScore;
  }
  return out;
}
