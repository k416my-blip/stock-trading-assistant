/**
 * ランキング改善シミュレーション（調査用・本番式は未変更）
 */
import {
  actionConfidenceToDirectionScore,
  computeFinalHybridScore,
} from './hybridStrategyScoreFusion';
import {
  computeNewsScoreForSymbol,
  computePriceActionScore,
  computeRiskPenalty,
  computeRsiDirectionScore,
} from './strategyRuleScoreAudit';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';

export type RankingSimRow = {
  symbol: string;
  ruleScore: number;
  aiScore: number;
  aiAction: string;
  aiConfidence: number;
  finalScore: number;
  rank: number;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeWeightedHybridScore(
  ruleScore: number,
  aiScore: number,
  ruleWeight: number,
  aiWeight: number,
): number {
  const sum = ruleWeight + aiWeight;
  if (sum <= 0) return computeFinalHybridScore(ruleScore, aiScore);
  return clamp((ruleScore * ruleWeight + aiScore * aiWeight) / sum);
}

export type EnhancedScoreWeights = {
  rule: number;
  ai: number;
  news: number;
  rsi: number;
  price: number;
  risk: number;
};

/** 拡張式シミュレーション（合計重みで正規化、risk は減点） */
export function computeEnhancedFinalScore(
  input: {
    ruleScore: number;
    aiScore: number;
    newsScore: number;
    rsiScore: number;
    priceActionScore: number;
    riskPenalty: number;
  },
  weights: EnhancedScoreWeights,
): number {
  const wSum =
    weights.rule + weights.ai + weights.news + weights.rsi + weights.price + weights.risk;
  const raw =
    input.ruleScore * weights.rule +
    input.aiScore * weights.ai +
    input.newsScore * weights.news +
    input.rsiScore * weights.rsi +
    input.priceActionScore * weights.price -
    input.riskPenalty * weights.risk;
  return clamp(raw / Math.max(wSum, 0.01));
}

/** AI buy × rule reduce 矛盾時の改善案シミュレーション */
export function computeAlignedFinalScore(
  ruleScore: number,
  aiScore: number,
  ruleWeight: number,
  aiWeight: number,
  aiAction: string,
  ruleAction: string,
): number {
  let base = computeWeightedHybridScore(ruleScore, aiScore, ruleWeight, aiWeight);
  if (aiAction === 'buy' && (ruleAction === 'reduce' || ruleAction === 'avoid')) {
    const floor = clamp(aiScore * 0.55 + 18);
    base = Math.max(base, floor);
  }
  return base;
}

export function rankSymbols(
  rows: Array<{
    symbol: string;
    ruleScore: number;
    aiAction: 'buy' | 'reduce' | 'hold' | 'watch';
    aiConfidence: number;
    ruleAction?: string;
    scoreFn: (ruleScore: number, aiScore: number) => number;
  }>,
): RankingSimRow[] {
  const scored = rows.map((r) => {
    const aiScore = actionConfidenceToDirectionScore(r.aiAction, r.aiConfidence);
    return {
      symbol: r.symbol,
      ruleScore: r.ruleScore,
      aiScore,
      aiAction: r.aiAction,
      aiConfidence: r.aiConfidence,
      finalScore: r.scoreFn(r.ruleScore, aiScore),
    };
  });
  scored.sort((a, b) => b.finalScore - a.finalScore || a.symbol.localeCompare(b.symbol));
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}

export function buildEnhancedInputs(
  sym: ConciergeSymbolEvidence,
  ruleScore: number,
  aiAction: 'buy' | 'reduce' | 'hold' | 'watch',
  aiConfidence: number,
  rsi14: number | null,
): {
  ruleScore: number;
  aiScore: number;
  newsScore: number;
  rsiScore: number;
  priceActionScore: number;
  riskPenalty: number;
} {
  return {
    ruleScore,
    aiScore: actionConfidenceToDirectionScore(aiAction, aiConfidence),
    newsScore: computeNewsScoreForSymbol(sym),
    rsiScore: computeRsiDirectionScore(rsi14),
    priceActionScore: computePriceActionScore(sym.intradayChangePct),
    riskPenalty: computeRiskPenalty(sym),
  };
}
