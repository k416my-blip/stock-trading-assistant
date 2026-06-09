/**
 * ポートフォリオ hybrid finalScore の内訳（調査・Metro診断用）
 * 注意: finalScore は ruleScore と aiScore のみ。news / ボラ / 価格変動は直接は入らない。
 */
import {
  HYBRID_AI_SCORE_WEIGHT,
  HYBRID_RULE_SCORE_WEIGHT,
} from '../constants/hybridStrategyScore';
import {
  actionConfidenceToDirectionScore,
  computeFinalHybridScore,
  ruleActionToDirectionScore,
} from './hybridStrategyScoreFusion';
import type { AiSecondEvaluatorAction } from '../types/aiSecondEvaluator';
import type { StrategyAction } from '../types/strategyExecution';

export type HybridScoreBreakdown = {
  symbol: string;
  finalScore: number;
  ruleScore: number;
  aiScore: number;
  ruleAction: StrategyAction | 'unknown';
  ruleConfidencePct: number | null;
  aiAction: AiSecondEvaluatorAction;
  holdConfidence: number;
  /** finalScore 式には未使用（常に null） */
  newsScore: null;
  riskPenalty: null;
  rsi14: number | null;
  intradayChangePct: number | null;
  contributionsPct: {
    rule: number;
    ai: number;
    news: number;
    priceChange: number;
    volatility: number;
  };
  formulaJa: string;
  humanJa: string;
};

export function getComputeFinalHybridScoreFormulaJa(): string {
  return [
    'finalScore = round( clamp( ruleScore × 0.7 + aiScore × 0.3 ) )',
    'ruleScore = ruleActionToDirectionScore(戦略ルールの action, confidencePct )',
    'aiScore = actionConfidenceToDirectionScore(第二評価 AI の action, confidence )',
    'hold の aiScore = 50 + (confidence - 50) × 0.25',
    'reduce の aiScore = 100 - confidence',
    'buy の aiScore = confidence',
    '※ newsScore / riskPenalty / RSI / 日中変動率は finalScore に直接加算されない',
  ].join('\n');
}

function contributionPct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function buildHybridScoreBreakdown(input: {
  symbol: string;
  ruleScore: number;
  aiAction: AiSecondEvaluatorAction;
  aiConfidence: number;
  ruleAction?: StrategyAction;
  ruleConfidencePct?: number;
  rsi14?: number | null;
  intradayChangePct?: number | null;
}): HybridScoreBreakdown {
  const aiScore = actionConfidenceToDirectionScore(input.aiAction, input.aiConfidence);
  const finalScore = computeFinalHybridScore(input.ruleScore, aiScore);
  const rulePart = input.ruleScore * HYBRID_RULE_SCORE_WEIGHT;
  const aiPart = aiScore * HYBRID_AI_SCORE_WEIGHT;

  const holdConfidence = input.aiAction === 'hold' ? input.aiConfidence : 0;

  let humanJa = `${input.symbol}: 最終 ${finalScore}点 = ルール側 ${input.ruleScore}点×70% + AI側 ${aiScore}点×30%。`;
  if (input.aiAction === 'reduce' && input.ruleScore < 50) {
    humanJa += ` AIは「${input.aiAction}」確信${input.aiConfidence}%（方向スコア${aiScore}）だが、戦略ルールが売り寄り（ruleScore ${input.ruleScore}）のため総合が押し下げられています。`;
  } else if (input.aiAction === 'hold' && input.aiConfidence >= 55) {
    humanJa += ` AIは「hold」確信${input.aiConfidence}%で中立〜やや強め（aiScore ${aiScore}）。ルール ${input.ruleScore} と合わさり ETF/ディフェンシブ寄りに見えるスコアになります。`;
  } else if (input.aiAction === 'buy') {
    humanJa += ` AIは買い寄り（${input.aiConfidence}%）だがルール ${input.ruleScore} が低いとハイブリッドは伸びません。`;
  }

  if (input.rsi14 != null && input.rsi14 >= 65) {
    humanJa += ` RSI ${input.rsi14} は買われすぎ圏 — ルールエンジンが reduce/watch になりやすい。`;
  } else if (input.rsi14 != null && input.rsi14 <= 35) {
    humanJa += ` RSI ${input.rsi14} は売られすぎ — AIは buy 寄りになりやすいがルールが reduce のままなら点差がつく。`;
  }

  return {
    symbol: input.symbol,
    finalScore,
    ruleScore: input.ruleScore,
    aiScore,
    ruleAction: input.ruleAction ?? 'unknown',
    ruleConfidencePct: input.ruleConfidencePct ?? null,
    aiAction: input.aiAction,
    holdConfidence,
    newsScore: null,
    riskPenalty: null,
    rsi14: input.rsi14 ?? null,
    intradayChangePct: input.intradayChangePct ?? null,
    contributionsPct: {
      rule: contributionPct(rulePart, finalScore),
      ai: contributionPct(aiPart, finalScore),
      news: 0,
      priceChange: 0,
      volatility: 0,
    },
    formulaJa: `${input.ruleScore}×0.7 + ${aiScore}×0.3 = ${rulePart.toFixed(2)} + ${aiPart.toFixed(2)} ≈ ${finalScore}`,
    humanJa,
  };
}

/** ruleScoresBySymbol + AI バッチから全銘柄内訳 */
export function breakdownFromRuleAndAi(
  symbol: string,
  ruleScore: number,
  aiAction: AiSecondEvaluatorAction,
  aiConfidence: number,
  extras?: { ruleAction?: StrategyAction; ruleConfidencePct?: number; rsi14?: number | null },
): HybridScoreBreakdown {
  return buildHybridScoreBreakdown({
    symbol,
    ruleScore,
    aiAction,
    aiConfidence,
    ...extras,
  });
}

/** 戦略ルール action/conf から ruleScore を含めて内訳 */
export function breakdownFromStrategyAndAi(
  symbol: string,
  ruleAction: StrategyAction,
  ruleConfidencePct: number,
  aiAction: AiSecondEvaluatorAction,
  aiConfidence: number,
  extras?: { rsi14?: number | null; intradayChangePct?: number | null },
): HybridScoreBreakdown {
  const ruleScore = ruleActionToDirectionScore(ruleAction, ruleConfidencePct);
  return buildHybridScoreBreakdown({
    symbol,
    ruleScore,
    aiAction,
    aiConfidence,
    ruleAction,
    ruleConfidencePct,
    ...extras,
  });
}
