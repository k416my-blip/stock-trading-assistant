import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { UnifiedCognitiveStateExecutiveAwarenessBundle } from '../types/unifiedCognitiveStateExecutiveAwareness';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { applyUnifiedCognitiveStateOrchestrationOverrides } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import {
  appendExecutiveSnapshot,
  saveUnifiedCognitiveState,
} from './unifiedCognitiveStateStorage';

export async function persistUnifiedCognitiveStateCycle(
  executive: UnifiedCognitiveStateExecutiveAwarenessBundle,
): Promise<void> {
  await appendExecutiveSnapshot({
    at: executive.generatedAt,
    executiveHealthPct: executive.executiveHealthPct,
    executiveState: executive.executiveState,
    safeReasoningDepthPct: executive.safeReasoningDepthPct,
  });
  await saveUnifiedCognitiveState({
    version: 1,
    lastExecutiveState: executive.executiveState,
    lastExecutiveHealthPct: executive.executiveHealthPct,
    lastOrchestrationBudgetMax: executive.orchestrationBudgetMax,
    executiveTimeline: executive.executiveTimeline,
    refreshCount: executive.executiveTimeline.length,
  });
  applyUnifiedCognitiveStateOrchestrationOverrides({
    budgetMax: executive.orchestrationBudgetMax,
    strained: executive.executiveState === 'EXECUTIVE_STRAINED',
    fragmented: executive.executiveState === 'EXECUTIVE_FRAGMENTED',
    uncertain: executive.executiveState === 'EXECUTIVE_UNCERTAIN',
    recursiveRisk: executive.executiveState === 'EXECUTIVE_RECURSIVE_RISK',
    emergency: executive.executiveState === 'EXECUTIVE_EMERGENCY',
    deepReasoningFreeze: executive.deepReasoningFreezeActive,
    recursiveSuppression: executive.recursiveSuppressionActive,
    explanationOnly: executive.explanationOnlyMode,
    predictionThrottle: executive.predictionThrottleActive,
    coherenceRebuild: executive.priorityCoherenceRebuildActive,
    reduceDepth: executive.reduceReasoningDepthActive,
  });
}

/** Executive layer does not change strategy actions — audit-only. */
export function applyUnifiedCognitiveStateToStrategy(
  strategy: StrategyExecutionBundle | null,
  _executive: UnifiedCognitiveStateExecutiveAwarenessBundle | null,
  _systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  return strategy;
}

export function applyUnifiedCognitiveStateToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  executive: UnifiedCognitiveStateExecutiveAwarenessBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !executive) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Executive: ${executive.executiveStateLabelJa} · health ${executive.executiveHealthPct}% · depth ${executive.safeReasoningDepthPct}% · ${executive.reasoningModeJa}]`;
  if (executive.priorityCoherenceRebuildActive) {
    summary = `${summary} [整合再構築]`;
  }
  summary = summary.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [Executiveは systemic safe mode に従属 — governance最優先]`;
  }

  return {
    ...governance,
    unifiedAiSummaryJa: summary,
  };
}

export function attachUnifiedCognitiveStateToContext(
  payload: AiStrategyContextPayload,
  bundle: UnifiedCognitiveStateExecutiveAwarenessBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return { ...payload, unifiedCognitiveStateExecutiveAwareness: bundle };
}

export function enrichUnifiedCognitiveStateBundleWithOrchestration(
  executive: UnifiedCognitiveStateExecutiveAwarenessBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
): UnifiedCognitiveStateExecutiveAwarenessBundle {
  const saturation = Math.max(
    executive.orchestrationSaturationPct,
    100 - (orchestration.orchestrationHealthScore ?? 50),
  );
  return {
    ...executive,
    orchestrationSaturationPct: Math.min(100, Math.round(saturation)),
    orchestrationModeJa: `${executive.orchestrationModeJa} · orch ${orchestration.refreshLatencyMs}ms`,
    mobileRuntimeStateJa: `${executive.mobileRuntimeStateJa} · coherence`,
  };
}
