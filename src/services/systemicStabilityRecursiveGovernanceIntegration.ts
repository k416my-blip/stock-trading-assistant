import { SYSTEMIC_CONFIDENCE_CLAMP } from '../constants/systemicStabilityRecursiveGovernance';
import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { RecursiveMemoryCompressionStrategicAbstractionBundle } from '../types/recursiveMemoryCompressionStrategicAbstraction';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyAction, StrategyExecutionBundle } from '../types/strategyExecution';

/** Systemic emergency safe mode: watch/hold only, confidence ≤30 */
export function applySystemicEmergencySafeModeToStrategy(
  strategy: StrategyExecutionBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !systemic?.systemicEmergencySafeMode) return strategy;
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
        whyProposedJa: `${r.whyProposedJa} [Systemic safe mode: watch/hold only]`,
        confidencePct: Math.min(r.confidencePct, SYSTEMIC_CONFIDENCE_CLAMP),
      };
    }),
  };
}

export function applyOscillationClampToStrategy(
  strategy: StrategyExecutionBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !systemic || systemic.oscillationRiskPct < 60) return strategy;
  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => ({
      ...r,
      confidencePct: Math.min(r.confidencePct, SYSTEMIC_CONFIDENCE_CLAMP),
    })),
  };
}

export function applyCascadeIsolationToStrategy(
  strategy: StrategyExecutionBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !systemic?.cascadeIsolationActive) return strategy;
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
        whyProposedJa: `${r.whyProposedJa} [Cascade isolation]`,
      };
    }),
  };
}

/** Replay corruption → governance snapshot from compression abstraction */
export function applyGovernanceSnapshotPriority(
  governance: AiGovernanceDecisionBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
  compression: RecursiveMemoryCompressionStrategicAbstractionBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !systemic?.emergencyGovernanceHalt) return governance;
  const snap = compression?.abstractedNarrativeJa ?? systemic.stabilitySummaryJa;
  return {
    ...governance,
    unifiedAiSummaryJa: `[Governance snapshot restore] ${snap}`.slice(0, 800),
  };
}

export function applySystemicStabilityToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
  compression: RecursiveMemoryCompressionStrategicAbstractionBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !systemic) return governance;
  let next: AiGovernanceDecisionBundle =
    applyGovernanceSnapshotPriority(governance, systemic, compression) ?? governance;

  let summary = next.unifiedAiSummaryJa;
  summary = `${summary} [Systemic stability ${systemic.stabilityHealthScore}% · equilibrium ${systemic.cognitiveEquilibriumPct}%]`;
  if (systemic.arbitrationHalted) {
    summary = `${summary} [Arbitration halted — recursive loop]`;
  }
  if (systemic.governanceCooldownActive) {
    summary = `${summary} [Governance cooldown]`;
  }
  if (systemic.recursiveFreezeActive) {
    summary = `${summary} [Recursive freeze]`;
  }

  let finalDecision = next.finalDecision;
  let finalDecisionLabelJa = next.finalDecisionLabelJa;
  if (systemic.systemicEmergencySafeMode && finalDecision === 'buy') {
    finalDecision = 'watch';
    finalDecisionLabelJa = '監視';
  } else if (systemic.systemicEmergencySafeMode && finalDecision === 'reduce') {
    finalDecision = 'hold';
    finalDecisionLabelJa = '保有';
  }

  return {
    ...next,
    finalDecision,
    finalDecisionLabelJa,
    unifiedAiSummaryJa: summary.slice(0, 800),
  };
}

export function applySystemicStabilityToStrategy(
  strategy: StrategyExecutionBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !systemic) return strategy;
  let next = applyCascadeIsolationToStrategy(strategy, systemic);
  next = applyOscillationClampToStrategy(next, systemic);
  next = applySystemicEmergencySafeModeToStrategy(next, systemic);
  return next;
}

export function attachSystemicStabilityToContext(
  payload: AiStrategyContextPayload,
  bundle: SystemicStabilityRecursiveGovernanceBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    systemicStabilityRecursiveGovernance: bundle,
  };
}

export function enforceWatchHoldAfterSystemicStabilization(
  action: StrategyAction,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyAction {
  if (!systemic?.systemicEmergencySafeMode && !systemic?.recursiveFreezeActive) return action;
  if (action === 'buy') return 'watch';
  if (action === 'reduce') return 'hold';
  return action;
}
