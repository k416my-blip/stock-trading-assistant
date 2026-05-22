import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { HumanIntentContinuityAlignmentPreservationBundle } from '../types/humanIntentContinuityAlignmentPreservation';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { applyHumanIntentContinuityOrchestrationOverrides } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import {
  appendIntentSnapshot,
  saveHumanIntentContinuityState,
} from './humanIntentContinuityStorage';

export async function persistHumanIntentContinuityCycle(
  intent: HumanIntentContinuityAlignmentPreservationBundle,
): Promise<void> {
  await appendIntentSnapshot({
    at: intent.generatedAt,
    intentHealthPct: intent.intentHealthPct,
    alignmentState: intent.alignmentState,
    safeAlignmentPct: intent.safeAlignmentPct,
  });
  await saveHumanIntentContinuityState({
    version: 1,
    lastAlignmentState: intent.alignmentState,
    lastIntentHealthPct: intent.intentHealthPct,
    lastOrchestrationBudgetMax: intent.orchestrationBudgetMax,
    intentTimeline: intent.intentTimeline,
    refreshCount: intent.intentTimeline.length,
  });
  applyHumanIntentContinuityOrchestrationOverrides({
    budgetMax: intent.orchestrationBudgetMax,
    drifting: intent.alignmentState === 'INTENT_DRIFTING',
    fragmented: intent.alignmentState === 'INTENT_FRAGMENTED',
    reinterpreting: intent.alignmentState === 'INTENT_REINTERPRETING',
    uncertain: intent.alignmentState === 'INTENT_UNCERTAIN',
    unsupported: intent.alignmentState === 'INTENT_UNSUPPORTED',
    instructionReinforcement: intent.instructionReinforcementActive,
    contextRebuild: intent.contextRebuildActive,
    reinterpretationSuppression: intent.reinterpretationSuppressionActive,
    clarificationDowngrade: intent.clarificationDowngradeActive,
    semanticFreeze: intent.semanticFreezeActive,
    explanationOnly: intent.explanationOnlyMode,
    orchestrationDeviationClamp: intent.orchestrationDeviationPct >= 50,
  });
}

/** Intent layer does not change strategy actions — alignment audit only. */
export function applyHumanIntentContinuityToStrategy(
  strategy: StrategyExecutionBundle | null,
  _intent: HumanIntentContinuityAlignmentPreservationBundle | null,
  _systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  return strategy;
}

export function applyHumanIntentContinuityToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  intent: HumanIntentContinuityAlignmentPreservationBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !intent) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Intent: ${intent.alignmentStateLabelJa} · health ${intent.intentHealthPct}% · safe ${intent.safeAlignmentPct}%]`;
  if (intent.instructionReinforcementActive) {
    summary = `${summary} [明示指示優先]`;
  }
  if (intent.explanationOnlyMode) {
    summary = `${summary} [意図未支持 — 説明のみ]`;
  }
  summary = summary.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [Intentは systemic safe mode に従属 — governance最優先]`;
  }

  return {
    ...governance,
    unifiedAiSummaryJa: summary,
  };
}

export function attachHumanIntentContinuityToContext(
  payload: AiStrategyContextPayload,
  bundle: HumanIntentContinuityAlignmentPreservationBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return { ...payload, humanIntentContinuityAlignmentPreservation: bundle };
}

export function enrichHumanIntentContinuityBundleWithOrchestration(
  intent: HumanIntentContinuityAlignmentPreservationBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
): HumanIntentContinuityAlignmentPreservationBundle {
  const deviation = Math.max(
    intent.orchestrationDeviationPct,
    100 - (orchestration.orchestrationHealthScore ?? 50),
  );
  return {
    ...intent,
    orchestrationDeviationPct: Math.min(100, Math.round(deviation)),
    mobileRuntimeStateJa: `${intent.mobileRuntimeStateJa} · orch ${orchestration.refreshLatencyMs}ms`,
  };
}
