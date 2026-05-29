import {
  HYBRID_AI_SCORE_WEIGHT,
  HYBRID_RULE_SCORE_WEIGHT,
} from '../constants/hybridStrategyScore';
import type { AiSecondEvaluatorAction } from '../types/aiSecondEvaluator';
import type { StrategyAction } from '../types/strategyExecution';

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export function normalizeAiSecondEvaluatorAction(raw: string): AiSecondEvaluatorAction {
  const v = raw.trim().toLowerCase();
  if (v === 'buy' || v.includes('買')) return 'buy';
  if (v === 'reduce' || v === 'sell' || v.includes('売') || v === 'avoid') return 'reduce';
  if (v === 'watch' || v.includes('監視')) return 'watch';
  return 'hold';
}

/** 推奨アクション + 確信度 → 0–100 の方向スコア（高=買い寄り、低=売り寄り） */
export function actionConfidenceToDirectionScore(
  action: AiSecondEvaluatorAction,
  confidence: number,
): number {
  const c = clamp(confidence);
  switch (action) {
    case 'buy':
      return c;
    case 'reduce':
      return clamp(100 - c);
    case 'hold':
      return clamp(50 + (c - 50) * 0.25);
    case 'watch':
      return clamp(45 + (c - 50) * 0.15);
    default:
      return 50;
  }
}

export function ruleActionToDirectionScore(action: StrategyAction, confidencePct: number): number {
  const c = clamp(confidencePct);
  switch (action) {
    case 'buy':
      return c;
    case 'reduce':
    case 'avoid':
      return clamp(100 - c);
    case 'hold':
      return 50;
    case 'watch':
      return 45;
    default:
      return 50;
  }
}

export function computeFinalHybridScore(ruleScore: number, aiScore: number): number {
  return clamp(ruleScore * HYBRID_RULE_SCORE_WEIGHT + aiScore * HYBRID_AI_SCORE_WEIGHT);
}

export function resolveFusedActionFromFinalScore(finalScore: number): AiSecondEvaluatorAction {
  if (finalScore >= 62) return 'buy';
  if (finalScore <= 38) return 'reduce';
  if (finalScore >= 52) return 'hold';
  return 'watch';
}

export function fusedActionToStrategyAction(action: AiSecondEvaluatorAction): StrategyAction {
  if (action === 'buy') return 'buy';
  if (action === 'reduce') return 'reduce';
  if (action === 'watch') return 'watch';
  return 'hold';
}

export function buildHybridSymbolScore(input: {
  ruleAction: StrategyAction;
  ruleConfidencePct: number;
  aiAction: AiSecondEvaluatorAction;
  aiConfidencePct: number;
  rationaleJa?: string;
}): {
  ruleScore: number;
  aiScore: number;
  finalScore: number;
  fusedAction: AiSecondEvaluatorAction;
  fusedConfidencePct: number;
} {
  const ruleScore = ruleActionToDirectionScore(input.ruleAction, input.ruleConfidencePct);
  const aiScore = actionConfidenceToDirectionScore(input.aiAction, input.aiConfidencePct);
  const finalScore = computeFinalHybridScore(ruleScore, aiScore);
  const fusedAction = resolveFusedActionFromFinalScore(finalScore);
  return {
    ruleScore,
    aiScore,
    finalScore,
    fusedAction,
    fusedConfidencePct: finalScore,
  };
}
