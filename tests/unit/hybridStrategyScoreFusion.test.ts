import { describe, expect, it } from 'vitest';
import {
  actionConfidenceToDirectionScore,
  buildHybridSymbolScore,
  computeFinalHybridScore,
  normalizeAiSecondEvaluatorAction,
  resolveFusedActionFromFinalScore,
  ruleActionToDirectionScore,
} from '../../src/services/hybridStrategyScoreFusion';
import { HYBRID_AI_SCORE_WEIGHT, HYBRID_RULE_SCORE_WEIGHT } from '../../src/constants/hybridStrategyScore';

describe('hybridStrategyScoreFusion', () => {
  it('computes FinalScore = RuleScore*0.7 + AIScore*0.3', () => {
    const ruleScore = 80;
    const aiScore = 50;
    expect(computeFinalHybridScore(ruleScore, aiScore)).toBe(
      Math.round(ruleScore * HYBRID_RULE_SCORE_WEIGHT + aiScore * HYBRID_AI_SCORE_WEIGHT),
    );
  });

  it('maps rule buy high confidence to high rule score', () => {
    expect(ruleActionToDirectionScore('buy', 75)).toBe(75);
    expect(ruleActionToDirectionScore('reduce', 70)).toBe(30);
  });

  it('maps AI actions to direction scores', () => {
    expect(actionConfidenceToDirectionScore('buy', 80)).toBe(80);
    expect(actionConfidenceToDirectionScore('reduce', 80)).toBe(20);
  });

  it('buildHybridSymbolScore preserves 70/30 blend', () => {
    const h = buildHybridSymbolScore({
      ruleAction: 'buy',
      ruleConfidencePct: 70,
      aiAction: 'hold',
      aiConfidencePct: 50,
    });
    expect(h.ruleScore).toBe(70);
    expect(h.aiScore).toBeGreaterThan(45);
    expect(h.finalScore).toBe(Math.round(h.ruleScore * 0.7 + h.aiScore * 0.3));
  });

  it('resolveFusedActionFromFinalScore thresholds', () => {
    expect(resolveFusedActionFromFinalScore(65)).toBe('buy');
    expect(resolveFusedActionFromFinalScore(35)).toBe('reduce');
    expect(resolveFusedActionFromFinalScore(55)).toBe('hold');
    expect(resolveFusedActionFromFinalScore(45)).toBe('watch');
  });

  it('normalizes AI action strings', () => {
    expect(normalizeAiSecondEvaluatorAction('Buy')).toBe('buy');
    expect(normalizeAiSecondEvaluatorAction('REDUCE')).toBe('reduce');
    expect(normalizeAiSecondEvaluatorAction('監視')).toBe('watch');
  });
});
