import { CONFIDENCE_PRIORITY_CLAMP } from '../constants/cognitiveGoalArbitrationIntentPriority';
import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { CognitiveGoalArbitrationIntentPriorityBundle } from '../types/cognitiveGoalArbitrationIntentPriority';
import type { SemanticConsistencyDecisionCoherenceBundle } from '../types/semanticConsistencyDecisionCoherence';
import type { StateIntegrityTemporalConsistencyBundle } from '../types/stateIntegrityTemporalConsistency';
import type { StrategyAction, StrategyExecutionBundle } from '../types/strategyExecution';

/** Emergency safe mode: watch/hold only — no new buy/sell */
export function applyEmergencySafeModeToStrategy(
  strategy: StrategyExecutionBundle | null,
  arbitration: CognitiveGoalArbitrationIntentPriorityBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !arbitration?.emergencySafeMode) return strategy;
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
        whyProposedJa: `${r.whyProposedJa} [Arbitration safe mode: watch/hold only]`,
        confidencePct: Math.min(r.confidencePct, CONFIDENCE_PRIORITY_CLAMP),
      };
    }),
  };
}

/** Intent downgrade engine: buy→watch, reduce→hold */
export function applyIntentDowngradeToStrategy(
  strategy: StrategyExecutionBundle | null,
  arbitration: CognitiveGoalArbitrationIntentPriorityBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !arbitration?.downgradeReasonJa) return strategy;
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
        whyProposedJa: `${r.whyProposedJa} [Intent downgrade: ${arbitration.downgradeReasonJa}]`,
      };
    }),
  };
}

/** Semantic freeze blocks buy on governance */
export function applySemanticFreezeArbitration(
  governance: AiGovernanceDecisionBundle | null,
  semantic: SemanticConsistencyDecisionCoherenceBundle | null,
  arbitration: CognitiveGoalArbitrationIntentPriorityBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !arbitration) return governance;
  const blockBuy = semantic?.semanticFreeze === true || !!arbitration.semanticVetoJa;
  if (!blockBuy || governance.finalDecision !== 'buy') {
    if (!arbitration.priorityNarrativeJa) return governance;
    return {
      ...governance,
      unifiedAiSummaryJa: `${governance.unifiedAiSummaryJa} [Arbitration: ${arbitration.governanceAuthorityJa}]`.slice(
        0,
        800,
      ),
    };
  }
  return {
    ...governance,
    finalDecision: 'watch',
    finalDecisionLabelJa: '監視',
    vetoReasonJa: governance.vetoReasonJa ?? 'Semantic freeze — buy forbidden (arbitration)',
    unifiedAiSummaryJa: `${governance.unifiedAiSummaryJa} [Semantic veto: buy→watch]`.slice(0, 800),
  };
}

/** Temporal rollback mandatory downgrade narrative */
export function applyTemporalRollbackArbitration(
  governance: AiGovernanceDecisionBundle | null,
  temporal: StateIntegrityTemporalConsistencyBundle | null,
  arbitration: CognitiveGoalArbitrationIntentPriorityBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !temporal?.rollbackApplied || !arbitration) return governance;
  return {
    ...governance,
    unifiedAiSummaryJa: `${governance.unifiedAiSummaryJa} [Temporal rollback arbitration: downgrade required]`.slice(
      0,
      800,
    ),
  };
}

export function applyCognitiveGoalArbitrationToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  arbitration: CognitiveGoalArbitrationIntentPriorityBundle | null,
  semantic: SemanticConsistencyDecisionCoherenceBundle | null,
  temporal: StateIntegrityTemporalConsistencyBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !arbitration) return governance;
  let next: AiGovernanceDecisionBundle =
    applySemanticFreezeArbitration(governance, semantic, arbitration) ?? governance;
  next = applyTemporalRollbackArbitration(next, temporal, arbitration) ?? next;

  if (arbitration.emergencySafeMode && next.finalDecision === 'buy') {
    next = { ...next, finalDecision: 'watch', finalDecisionLabelJa: '監視' };
  } else if (arbitration.emergencySafeMode && next.finalDecision === 'reduce') {
    next = { ...next, finalDecision: 'hold', finalDecisionLabelJa: '保有' };
  }

  if (arbitration.intentFreeze) {
    next = {
      ...next,
      unifiedAiSummaryJa: `${next.unifiedAiSummaryJa} [Intent freeze: ${arbitration.freezeSourceJa ?? 'active'}]`.slice(
        0,
        800,
      ),
    };
  }

  return {
    ...next,
    unifiedAiSummaryJa: `${next.unifiedAiSummaryJa} [Arbitration health ${arbitration.arbitrationHealthScore}%] ${arbitration.priorityNarrativeJa}`.slice(
      0,
      800,
    ),
  };
}

export function applyCognitiveGoalArbitrationToStrategy(
  strategy: StrategyExecutionBundle | null,
  arbitration: CognitiveGoalArbitrationIntentPriorityBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !arbitration) return strategy;
  let next = applyIntentDowngradeToStrategy(strategy, arbitration);
  next = applyEmergencySafeModeToStrategy(next, arbitration);
  if (!next) return next;
  if (arbitration.deadlockDetected) {
    return {
      ...next,
      todayRecommendations: next.todayRecommendations.map((r) => ({
        ...r,
        action: r.action === 'buy' || r.action === 'reduce' ? ('hold' as StrategyAction) : r.action,
        whyProposedJa: `${r.whyProposedJa} [Deadlock: hold]`.slice(0, 900),
      })),
    };
  }
  return next;
}

export function attachCognitiveGoalArbitrationToContext(
  payload: AiStrategyContextPayload,
  bundle: CognitiveGoalArbitrationIntentPriorityBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    cognitiveGoalArbitrationIntentPriority: bundle,
  };
}

export function enforceWatchHoldAfterArbitration(
  action: StrategyAction,
  arbitration: CognitiveGoalArbitrationIntentPriorityBundle | null,
): StrategyAction {
  if (!arbitration?.emergencySafeMode && !arbitration?.intentFreeze) return action;
  if (action === 'buy') return 'watch';
  if (action === 'reduce') return 'hold';
  return action;
}
