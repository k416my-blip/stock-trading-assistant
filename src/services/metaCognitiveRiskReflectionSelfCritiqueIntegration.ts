import {
  META_CONFIDENCE_SAFE_THRESHOLD,
  OVERCONFIDENCE_CLAMP,
} from '../constants/metaCognitiveRiskReflectionSelfCritique';
import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from '../types/metaCognitiveRiskReflectionSelfCritique';
import type { StrategyAction, StrategyExecutionBundle } from '../types/strategyExecution';

/** Reflection safe mode: watch/hold only */
export function applyReflectionSafeModeToStrategy(
  strategy: StrategyExecutionBundle | null,
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !reflection?.reflectionSafeMode) return strategy;
  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      let action = r.action;
      if (action === 'buy') action = 'watch';
      else if (action === 'reduce') action = 'hold';
      if (action === r.action) return r;
      return {
        ...r,
        action,
        intent: action === 'watch' ? 'watch' : r.intent,
        whyProposedJa: `${r.whyProposedJa} [Reflection safe mode: watch/hold only]`,
        confidencePct: Math.min(r.confidencePct, OVERCONFIDENCE_CLAMP),
      };
    }),
  };
}

/** Unsupported trend → confidence clamp */
export function clampConfidenceForUnsupportedTrend(
  strategy: StrategyExecutionBundle | null,
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !reflection || reflection.unsupportedTrendPct < 20) return strategy;
  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => ({
      ...r,
      confidencePct: Math.min(r.confidencePct, OVERCONFIDENCE_CLAMP),
      analystExplanationJa: `${r.analystExplanationJa}（unsupported trend — confidence上限${OVERCONFIDENCE_CLAMP}%）`,
    })),
  };
}

/** Contradiction trend → downgrade buy→watch reduce→hold */
export function applyContradictionTrendDowngrade(
  strategy: StrategyExecutionBundle | null,
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !reflection || reflection.contradictionTrendPct < 25) return strategy;
  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      let action = r.action;
      if (action === 'buy') action = 'watch';
      else if (action === 'reduce') action = 'hold';
      if (action === r.action) return r;
      return {
        ...r,
        action,
        whyProposedJa: `${r.whyProposedJa} [Contradiction trend downgrade]`,
      };
    }),
  };
}

/** Conservative recovery on rollback dependency */
export function applyConservativeRecoveryToStrategy(
  strategy: StrategyExecutionBundle | null,
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !reflection?.conservativeRecoveryActive) return strategy;
  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => ({
      ...r,
      confidencePct: Math.min(r.confidencePct, Math.max(35, reflection.metaConfidencePct)),
      whyProposedJa: `${r.whyProposedJa} [Conservative recovery — rollback依存]`.slice(0, 900),
    })),
  };
}

/** Fatigue high → weaken recommendations (confidence only) */
export function weakenRecommendationsForFatigue(
  strategy: StrategyExecutionBundle | null,
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !reflection || reflection.fatigueScore < 70) return strategy;
  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => ({
      ...r,
      confidencePct: Math.min(r.confidencePct, 45),
      whyProposedJa: `${r.whyProposedJa} [AI fatigue ${reflection.fatigueScore} — 推奨弱化]`.slice(0, 900),
    })),
  };
}

export function applyMetaCognitiveReflectionToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !reflection) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Self-critique ${reflection.selfCritiqueScore}% · meta conf ${reflection.metaConfidencePct}%]`;
  if (reflection.metaWarningJa) summary = `${summary} [Warning: ${reflection.metaWarningJa}]`;
  if (reflection.reflectionFreeze) summary = `${summary} [Reflection freeze]`;

  let finalDecision = governance.finalDecision;
  let finalDecisionLabelJa = governance.finalDecisionLabelJa;
  if (
    (reflection.reflectionSafeMode || reflection.metaConfidencePct < META_CONFIDENCE_SAFE_THRESHOLD) &&
    finalDecision === 'buy'
  ) {
    finalDecision = 'watch';
    finalDecisionLabelJa = '監視';
  } else if (reflection.reflectionSafeMode && finalDecision === 'reduce') {
    finalDecision = 'hold';
    finalDecisionLabelJa = '保有';
  }

  return {
    ...governance,
    finalDecision,
    finalDecisionLabelJa,
    unifiedAiSummaryJa: summary.slice(0, 800),
  };
}

export function applyMetaCognitiveReflectionToStrategy(
  strategy: StrategyExecutionBundle | null,
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !reflection) return strategy;
  let next = clampConfidenceForUnsupportedTrend(strategy, reflection);
  next = applyContradictionTrendDowngrade(next, reflection);
  next = applyConservativeRecoveryToStrategy(next, reflection);
  next = weakenRecommendationsForFatigue(next, reflection);
  next = applyReflectionSafeModeToStrategy(next, reflection);
  if (!next) return next;
  if (reflection.selfCritiqueScore < 50) {
    return {
      ...next,
      todayRecommendations: next.todayRecommendations.map((r) => ({
        ...r,
        whyProposedJa: `${r.whyProposedJa} [Self-critique: ${reflection.healthLabelJa}]`.slice(0, 900),
      })),
    };
  }
  return next;
}

export function attachMetaCognitiveReflectionToContext(
  payload: AiStrategyContextPayload,
  bundle: MetaCognitiveRiskReflectionSelfCritiqueBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    metaCognitiveRiskReflectionSelfCritique: bundle,
  };
}

export function enforceWatchHoldAfterReflection(
  action: StrategyAction,
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null,
): StrategyAction {
  if (!reflection?.reflectionSafeMode && !reflection?.metaEmergencyShutdown) return action;
  if (action === 'buy') return 'watch';
  if (action === 'reduce') return 'hold';
  return action;
}
