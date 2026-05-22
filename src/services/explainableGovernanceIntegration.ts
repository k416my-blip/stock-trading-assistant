import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { ExplainableGovernanceTransparentReasoningBundle } from '../types/explainableGovernanceTransparentReasoning';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { applyExplainableGovernanceOrchestrationOverrides } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import {
  appendExplainableSnapshot,
  saveExplainableGovernanceState,
} from './explainableGovernanceStorage';

export async function persistExplainableGovernanceCycle(
  explainable: ExplainableGovernanceTransparentReasoningBundle,
): Promise<void> {
  await appendExplainableSnapshot(
    {
      at: explainable.generatedAt,
      explainabilityHealthPct: explainable.explainabilityHealthPct,
      explainableState: explainable.explainableState,
      transparencyScorePct: explainable.transparencyScorePct,
    },
    explainable.transparencyScorePct,
  );
  await saveExplainableGovernanceState({
    version: 1,
    lastExplainableState: explainable.explainableState,
    lastExplainabilityHealthPct: explainable.explainabilityHealthPct,
    lastOrchestrationBudgetMax: explainable.orchestrationBudgetMax,
    explainableTimeline: explainable.explainableTimeline,
    lastTransparencyScorePct: explainable.transparencyScorePct,
    refreshCount: explainable.explainableTimeline.length,
  });
  applyExplainableGovernanceOrchestrationOverrides({
    budgetMax: explainable.orchestrationBudgetMax,
    partial: explainable.explainableState === 'EXPLAINABLE_PARTIAL',
    opaque: explainable.explainableState === 'EXPLAINABLE_OPAQUE',
    risk: explainable.explainableState === 'EXPLAINABLE_RISK',
    unsupported: explainable.explainableState === 'EXPLAINABLE_UNSUPPORTED',
    contradicted: explainable.explainableState === 'EXPLAINABLE_CONTRADICTED',
    safeSimplification: explainable.safeSimplificationActive,
    fallbackExplanation: explainable.fallbackExplanationMode,
    explanationSuppression: explainable.explanationSuppressionActive,
    consistencyRebuild: explainable.consistencyRebuildActive,
    explanationOnly: explainable.explanationOnlyMode,
  });
}

export function applyExplainableGovernanceToStrategy(
  strategy: StrategyExecutionBundle | null,
  _explainable: ExplainableGovernanceTransparentReasoningBundle | null,
  _systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  return strategy;
}

export function applyExplainableGovernanceToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  explainable: ExplainableGovernanceTransparentReasoningBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !explainable) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Explain: ${explainable.explainableStateLabelJa} · transparency ${explainable.transparencyScorePct}%]`;
  if (explainable.downgradeReasonsJa[0]) {
    summary = `${summary} [downgrade: ${explainable.downgradeReasonsJa[0].slice(0, 80)}]`;
  }
  if (explainable.freezeReasonsJa[0]) {
    summary = `${summary} [freeze: ${explainable.freezeReasonsJa[0].slice(0, 80)}]`;
  }
  if (explainable.explanationSuppressionActive) {
    summary = `${summary} [説明抑制 — safe summary only]`;
  }
  if (explainable.explanationOnlyMode) {
    summary = `${summary} [説明未支持 — fallback]`;
  }
  summary = summary.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [Explainableは systemic に従属]`;
  }

  return {
    ...governance,
    unifiedAiSummaryJa: summary,
  };
}

export function attachExplainableGovernanceToContext(
  payload: AiStrategyContextPayload,
  bundle: ExplainableGovernanceTransparentReasoningBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return { ...payload, explainableGovernanceTransparentReasoning: bundle };
}

export function enrichExplainableGovernanceBundleWithOrchestration(
  explainable: ExplainableGovernanceTransparentReasoningBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
): ExplainableGovernanceTransparentReasoningBundle {
  const orchSummary = orchestration.userExplanationJa?.slice(0, 180) ?? '';
  return {
    ...explainable,
    orchestrationRationaleJa: orchSummary
      ? `${explainable.orchestrationRationaleJa} · ${orchSummary}`
      : explainable.orchestrationRationaleJa,
    decisionTraceabilityPct: Math.max(
      0,
      explainable.decisionTraceabilityPct - Math.min(20, (orchestration.skippedLayerCount ?? 0) * 2),
    ),
    mobileRuntimeStateJa: `${explainable.mobileRuntimeStateJa} · orch ${orchestration.refreshLatencyMs}ms`,
  };
}
