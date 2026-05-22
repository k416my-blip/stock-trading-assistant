import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { ConstitutionalGovernanceSystemCoherenceBundle } from '../types/constitutionalGovernanceSystemCoherence';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { applyConstitutionalGovernanceOrchestrationOverrides } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import {
  appendConstitutionalSnapshot,
  saveConstitutionalGovernanceState,
} from './constitutionalGovernanceStorage';

export async function persistConstitutionalGovernanceCycle(
  constitutional: ConstitutionalGovernanceSystemCoherenceBundle,
): Promise<void> {
  await appendConstitutionalSnapshot(
    {
      at: constitutional.generatedAt,
      constitutionalHealthPct: constitutional.constitutionalHealthPct,
      constitutionalState: constitutional.constitutionalState,
      systemStabilityIndexPct: constitutional.systemStabilityIndexPct,
    },
    constitutional.conflictPressurePct,
  );
  await saveConstitutionalGovernanceState({
    version: 1,
    lastConstitutionalState: constitutional.constitutionalState,
    lastConstitutionalHealthPct: constitutional.constitutionalHealthPct,
    lastOrchestrationBudgetMax: constitutional.orchestrationBudgetMax,
    constitutionalTimeline: constitutional.constitutionalTimeline,
    lastConflictPressurePct: constitutional.conflictPressurePct,
    refreshCount: constitutional.constitutionalTimeline.length,
  });
  applyConstitutionalGovernanceOrchestrationOverrides({
    budgetMax: constitutional.orchestrationBudgetMax,
    conflict: constitutional.constitutionalState === 'CONSTITUTIONAL_CONFLICT',
    collision: constitutional.constitutionalState === 'CONSTITUTIONAL_COLLISION',
    fragmented: constitutional.constitutionalState === 'CONSTITUTIONAL_FRAGMENTED',
    emergency:
      constitutional.constitutionalState === 'CONSTITUTIONAL_EMERGENCY' ||
      constitutional.constitutionalEmergencyActive,
    unsupported: constitutional.constitutionalState === 'CONSTITUTIONAL_UNSUPPORTED',
    precedenceArbitration: constitutional.precedenceArbitrationActive,
    overrideFreeze: constitutional.overrideFreezeActive,
    hierarchyRebuild: constitutional.hierarchyRebuildSuggestionActive,
    explanationOnly: constitutional.explanationOnlyMode,
    fallbackFreeze: constitutional.fallbackFreezeActive,
  });
}

/** Constitutional layer does not change strategy — supreme governance audit only. */
export function applyConstitutionalGovernanceToStrategy(
  strategy: StrategyExecutionBundle | null,
  _constitutional: ConstitutionalGovernanceSystemCoherenceBundle | null,
  _systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  return strategy;
}

export function applyConstitutionalGovernanceToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  constitutional: ConstitutionalGovernanceSystemCoherenceBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !constitutional) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Constitution: ${constitutional.constitutionalStateLabelJa} · health ${constitutional.constitutionalHealthPct}% · index ${constitutional.systemStabilityIndexPct}%]`;
  if (constitutional.overrideFreezeActive) {
    summary = `${summary} [override freeze]`;
  }
  if (constitutional.constitutionalEmergencyActive) {
    summary = `${summary} [憲法 lockdown]`;
  }
  if (constitutional.explanationOnlyMode) {
    summary = `${summary} [憲法未支持 — fallback]`;
  }
  summary = summary.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [憲法は systemic と連携 — governance最優先]`;
  }

  return {
    ...governance,
    unifiedAiSummaryJa: summary,
  };
}

export function attachConstitutionalGovernanceToContext(
  payload: AiStrategyContextPayload,
  bundle: ConstitutionalGovernanceSystemCoherenceBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return { ...payload, constitutionalGovernanceSystemCoherence: bundle };
}

export function enrichConstitutionalGovernanceBundleWithOrchestration(
  constitutional: ConstitutionalGovernanceSystemCoherenceBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
): ConstitutionalGovernanceSystemCoherenceBundle {
  const inconsistency = Math.max(
    0,
    (orchestration.skippedLayerCount ?? 0) * 4 - constitutional.orchestrationConsistencyPct,
  );
  return {
    ...constitutional,
    orchestrationConsistencyPct: Math.max(
      0,
      constitutional.orchestrationConsistencyPct - Math.min(25, inconsistency),
    ),
    mobileRuntimeStateJa: `${constitutional.mobileRuntimeStateJa} · orch ${orchestration.refreshLatencyMs}ms`,
  };
}
