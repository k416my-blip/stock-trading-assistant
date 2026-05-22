import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { RuntimeSurvivalMobileResilienceBundle } from '../types/runtimeSurvivalMobileResilience';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { applyRuntimeSurvivalOrchestrationOverrides } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import { appendRuntimeSnapshot, saveRuntimeSurvivalState } from './runtimeSurvivalStorage';
import { isAppForeground } from './performanceCostRuntime';

export async function persistRuntimeSurvivalCycle(
  runtime: RuntimeSurvivalMobileResilienceBundle,
  resumeAt?: string | null,
): Promise<void> {
  await appendRuntimeSnapshot(
    {
      at: runtime.generatedAt,
      runtimeHealthPct: runtime.runtimeHealthPct,
      runtimeState: runtime.runtimeState,
      runtimeStabilityPct: runtime.runtimeStabilityPct,
    },
    runtime.runtimePressurePct,
    resumeAt ?? (isAppForeground() ? new Date().toISOString() : null),
  );
  await saveRuntimeSurvivalState({
    version: 1,
    lastRuntimeState: runtime.runtimeState,
    lastRuntimeHealthPct: runtime.runtimeHealthPct,
    lastOrchestrationBudgetMax: runtime.orchestrationBudgetMax,
    runtimeTimeline: runtime.runtimeTimeline,
    lastRuntimePressurePct: runtime.runtimePressurePct,
    lastResumeAt: resumeAt ?? null,
    refreshCount: runtime.runtimeTimeline.length,
  });
  applyRuntimeSurvivalOrchestrationOverrides({
    budgetMax: runtime.orchestrationBudgetMax,
    stressed: runtime.runtimeState === 'RUNTIME_STRESSED',
    degraded: runtime.runtimeState === 'RUNTIME_DEGRADED',
    fragmented: runtime.runtimeState === 'RUNTIME_FRAGMENTED',
    offline: runtime.runtimeState === 'RUNTIME_OFFLINE',
    critical: runtime.runtimeState === 'RUNTIME_CRITICAL',
    survivalMode: runtime.survivalModeActive,
    lightweightMode: runtime.lightweightModeActive,
    deepOrchestrationSuppression: runtime.deepOrchestrationSuppressionActive,
    runtimeRebuild: runtime.runtimeRebuildSuggestionActive,
    offlineFallback: runtime.offlineSafeFallbackActive,
    websocketPause: runtime.websocketPauseActive,
    cacheFirst: runtime.cacheFirstModeActive,
    dashboardLowRefresh: runtime.dashboardLowRefreshActive,
    speculativeStop: runtime.speculativeProcessingStopped,
    deepReflectionStop: runtime.deepReflectionStopped,
  });
}

export function applyRuntimeSurvivalToStrategy(
  strategy: StrategyExecutionBundle | null,
  _runtime: RuntimeSurvivalMobileResilienceBundle | null,
  _systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  return strategy;
}

export function applyRuntimeSurvivalToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  runtime: RuntimeSurvivalMobileResilienceBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !runtime) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Runtime: ${runtime.runtimeStateLabelJa} · health ${runtime.runtimeHealthPct}%]`;
  if (runtime.survivalModeActive) {
    summary = `${summary} [サバイバルモード]`;
  }
  if (runtime.offlineSafeFallbackActive) {
    summary = `${summary} [offline — cached summary only]`;
  }
  if (runtime.cacheFirstModeActive) {
    summary = `${summary} [cache-first]`;
  }
  summary = summary.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [Runtimeは systemic に従属]`;
  }

  return {
    ...governance,
    unifiedAiSummaryJa: summary,
  };
}

export function attachRuntimeSurvivalToContext(
  payload: AiStrategyContextPayload,
  bundle: RuntimeSurvivalMobileResilienceBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return { ...payload, runtimeSurvivalMobileResilience: bundle };
}

export function enrichRuntimeSurvivalBundleWithOrchestration(
  runtime: RuntimeSurvivalMobileResilienceBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
): RuntimeSurvivalMobileResilienceBundle {
  const fragBoost = Math.min(25, (orchestration.skippedLayerCount ?? 0) * 4);
  return {
    ...runtime,
    runtimeFragmentationPct: Math.min(100, runtime.runtimeFragmentationPct + fragBoost * 0.3),
    hydrationIntegrityPct: Math.max(
      0,
      runtime.hydrationIntegrityPct - Math.min(15, orchestration.refreshLatencyMs / 500),
    ),
    mobileRuntimeStateJa: `${runtime.mobileRuntimeStateJa} · orch ${orchestration.refreshLatencyMs}ms`,
  };
}
