import type {
  RuntimeSelfLimitationObserveInput,
  SelfLimitationTimelineEntry,
} from '../types/runtimeSelfLimitation';
import { scoreRuntimeSelfLimitation } from './runtimeSelfLimitationCoordinator';
import { buildMetaRecursionGraph, scoreMetaRecursionRisk } from './runtimeMetaRecursionDetector';
import { detectEgoSignals, scoreRuntimeEgo, suggestEgoSuppression } from './runtimeOrchestrationEgoDetector';
import { scoreRuntimeAdaptiveInflationRisk, suggestAdaptiveCeilings } from './adaptiveCeilingGovernor';
import { computeStabilizationCost, scoreStabilizationBudgetPressure } from './runtimeStabilizationBudgetManager';
import { detectSelfProtectionBiases, scoreRuntimeSelfProtectionBias } from './runtimeSelfProtectionBiasDetector';
import { scoreObserverIdeologyLockRisk } from './observerIdeologyLockDetector';
import { scoreRecursiveEquilibriumInflation } from './recursiveEquilibriumInflationTracker';
import { longSessionExpansionFlags, scoreSelfExpansion } from './longSessionSelfExpansionEngine';
import {
  scoreRuntimeBoundaryIntegrity,
  scoreRuntimeMetaCognitivePressure,
} from './runtimeMetaBoundaryCoordinator';
import { recordSelfLimitationTimeline } from './selfLimitationTimeline';

export type SelfLimitationFlowResult = {
  flow: SelfLimitationTimelineEntry['flow'];
  detailJa: string;
};

export function runSelfLimitationFlow(input: RuntimeSelfLimitationObserveInput): SelfLimitationFlowResult {
  return {
    flow: 'self_limitation',
    detailJa: `limitation ${scoreRuntimeSelfLimitation(input)} · intervention ${input.interventionDensity}`,
  };
}

export function runMetaRecursionFlow(input: RuntimeSelfLimitationObserveInput): SelfLimitationFlowResult {
  void buildMetaRecursionGraph(input);
  return {
    flow: 'meta_recursion_detection',
    detailJa: `risk ${scoreMetaRecursionRisk(input)} · meta→orchestration→suppression→audit`,
  };
}

export function runOrchestrationEgoFlow(input: RuntimeSelfLimitationObserveInput): SelfLimitationFlowResult {
  const signals = detectEgoSignals(input);
  const suggestions = suggestEgoSuppression(input);
  return {
    flow: 'orchestration_ego_suppression',
    detailJa: `ego ${scoreRuntimeEgo(input)} · ${signals.join(',') || 'none'} · suggest ${suggestions.join(',') || 'none'}`,
  };
}

export function runAdaptiveCeilingFlow(input: RuntimeSelfLimitationObserveInput): SelfLimitationFlowResult {
  const ceilings = suggestAdaptiveCeilings(input);
  return {
    flow: 'adaptive_ceiling_enforcement',
    detailJa: `inflation ${scoreRuntimeAdaptiveInflationRisk(input)} · pacing ${ceilings.pacing_ceiling}`,
  };
}

export function runStabilizationBudgetFlow(input: RuntimeSelfLimitationObserveInput): SelfLimitationFlowResult {
  return {
    flow: 'stabilization_budget_governance',
    detailJa: `pressure ${scoreStabilizationBudgetPressure(input)} · cost ${computeStabilizationCost(input).toFixed(2)}`,
  };
}

export function runSelfProtectionBiasFlow(input: RuntimeSelfLimitationObserveInput): SelfLimitationFlowResult {
  const biases = detectSelfProtectionBiases(input);
  return {
    flow: 'self_protection_bias_detection',
    detailJa: `bias ${scoreRuntimeSelfProtectionBias(input)} · ${biases.join(',') || 'none'}`,
  };
}

export function runObserverIdeologyLockFlow(input: RuntimeSelfLimitationObserveInput): SelfLimitationFlowResult {
  return {
    flow: 'observer_ideology_lock',
    detailJa: `lock ${scoreObserverIdeologyLockRisk(input)} · rigidity ${input.observerDensityScore}`,
  };
}

export function runRecursiveEquilibriumInflationFlow(
  input: RuntimeSelfLimitationObserveInput,
): SelfLimitationFlowResult {
  return {
    flow: 'recursive_equilibrium_inflation',
    detailJa: `inflation ${scoreRecursiveEquilibriumInflation(input)} · persistence ${input.equilibriumPersistence}`,
  };
}

export function runLongSessionExpansionFlow(input: RuntimeSelfLimitationObserveInput): SelfLimitationFlowResult {
  const flags = longSessionExpansionFlags(input);
  void scoreSelfExpansion(input);
  return {
    flow: 'long_session_self_expansion',
    detailJa: flags.length > 0 ? flags.join(' · ') : `session ${input.sessionMinutes}min ok`,
  };
}

export function runMetaCognitiveBoundaryFlow(input: RuntimeSelfLimitationObserveInput): SelfLimitationFlowResult {
  return {
    flow: 'meta_cognitive_boundary',
    detailJa: `integrity ${scoreRuntimeBoundaryIntegrity(input)} · pressure ${scoreRuntimeMetaCognitivePressure(input)}`,
  };
}

export function runSelfLimitationFlows(input: RuntimeSelfLimitationObserveInput): SelfLimitationFlowResult[] {
  const results = [
    runSelfLimitationFlow(input),
    runMetaRecursionFlow(input),
    runOrchestrationEgoFlow(input),
    runAdaptiveCeilingFlow(input),
    runStabilizationBudgetFlow(input),
    runSelfProtectionBiasFlow(input),
    runObserverIdeologyLockFlow(input),
    runRecursiveEquilibriumInflationFlow(input),
    runLongSessionExpansionFlow(input),
    runMetaCognitiveBoundaryFlow(input),
  ];
  for (const r of results) recordSelfLimitationTimeline(r.flow, r.detailJa);
  return results;
}
