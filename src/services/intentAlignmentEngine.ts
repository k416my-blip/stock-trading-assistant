import {
  ALIGNMENT_INTEGRITY_UNCERTAIN_THRESHOLD,
  BUDGET_INTENT_ALIGNED,
  BUDGET_INTENT_DRIFTING,
  BUDGET_INTENT_FRAGMENTED,
  BUDGET_INTENT_RISK,
  INTENT_AUDIT_LABELS_JA,
  INTENT_HEALTH_DRIFTING_THRESHOLD,
  INTENT_HEALTH_FRAGMENTED_THRESHOLD,
  REINTERPRETATION_PRESSURE_THRESHOLD,
  UNSUPPORTED_INTENT_INFERENCE_THRESHOLD,
} from '../constants/humanIntentContinuityAlignmentPreservation';
import type {
  BuildHumanIntentContinuityInput,
  IntentAlignmentState,
  IntentAuditSnapshot,
  IntentAuditTargetId,
} from '../types/humanIntentContinuityAlignmentPreservation';

export type IntentAlignmentMetrics = {
  instructionContinuityPct: number;
  semanticConsistencyPct: number;
  goalIntegrityPct: number;
  contextIntegrityPct: number;
  intentCoherencePct: number;
  governanceAlignmentPct: number;
  directivePreservationPct: number;
  memoryAlignmentPct: number;
  strategyAlignmentPct: number;
  explanationConsistencyPct: number;
  conversationDriftPct: number;
  reinterpretationPressurePct: number;
  contextCorruptionPct: number;
  orchestrationDeviationPct: number;
  unsupportedIntentInferencePct: number;
  userPriorityIntegrityPct: number;
  predictionAlignmentPct: number;
  orchestrationAlignmentPct: number;
  intentHealthPct: number;
  alignmentIntegrityPct: number;
  intentDriftPct: number;
  safeAlignmentPct: number;
  semanticContinuityPct: number;
};

export type IntentAlignmentResolution = {
  alignmentState: IntentAlignmentState;
  orchestrationBudgetMax: number;
  explanationOnlyMode: boolean;
  instructionReinforcementActive: boolean;
  contextRebuildActive: boolean;
  reinterpretationSuppressionActive: boolean;
  clarificationDowngradeActive: boolean;
  semanticFreezeActive: boolean;
  alignmentModeJa: string;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function audit(
  id: IntentAuditTargetId,
  score: number,
  detail: string,
): IntentAuditSnapshot {
  return {
    id,
    labelJa: INTENT_AUDIT_LABELS_JA[id],
    scorePct: clamp(score),
    detailJa: detail,
  };
}

export function collectIntentAuditTargets(metrics: IntentAlignmentMetrics): IntentAuditSnapshot[] {
  return [
    audit('instructionContinuity', metrics.instructionContinuityPct, 'explicit directive'),
    audit('semanticConsistency', metrics.semanticConsistencyPct, 'semantic continuity'),
    audit('goalIntegrity', metrics.goalIntegrityPct, 'no goal mutation'),
    audit('contextIntegrity', metrics.contextIntegrityPct, 'context integrity'),
    audit('intentCoherence', metrics.intentCoherencePct, 'intent coherence'),
    audit('memoryAlignment', metrics.memoryAlignmentPct, 'memory alignment'),
    audit('directivePreservation', metrics.directivePreservationPct, 'directive preservation'),
    audit('conversationDrift', 100 - metrics.conversationDriftPct, 'low drift preferred'),
    audit('strategyAlignment', metrics.strategyAlignmentPct, 'strategy unchanged'),
    audit('governanceAlignment', metrics.governanceAlignmentPct, 'governance priority'),
    audit('userPriorityIntegrity', metrics.userPriorityIntegrityPct, 'user priority'),
    audit('predictionAlignment', metrics.predictionAlignmentPct, 'prediction alignment'),
    audit('explanationConsistency', metrics.explanationConsistencyPct, 'explanation consistency'),
    audit('orchestrationAlignment', metrics.orchestrationAlignmentPct, 'orchestration alignment'),
  ];
}

export function computeIntentAlignmentMetrics(
  input: BuildHumanIntentContinuityInput,
): IntentAlignmentMetrics {
  const gov = input.governance;
  const ep = input.epistemic;
  const graph = input.strategicMemoryGraph;
  const economy = input.cognitiveResourceEconomy;
  const executive = input.unifiedCognitiveState;
  const orch = input.orchestration;
  const consensus = input.consensus;

  const instructionContinuityPct = clamp(
    88 -
      (executive?.explanationOnlyMode ? 18 : 0) -
      (ep?.explanationOnlyMode ? 12 : 0) +
      (input.mockSemanticDriftBoost ? -input.mockSemanticDriftBoost * 0.35 : 0),
  );

  const semanticConsistencyPct = clamp(
    (ep?.epistemicHealthPct ?? 62) * 0.45 +
      (consensus?.consensusHealthPct ?? 58) * 0.35 +
      (100 - (ep?.contradictionDensityPct ?? 20)) * 0.2 -
      (input.mockSemanticDriftBoost ?? 0) * 0.4,
  );

  const goalIntegrityPct = clamp(92 - (graph?.recursiveLoopRiskPct ?? 0) * 0.15);

  const contextIntegrityPct = clamp(
    (graph?.memoryIntegrityPct ?? 58) * 0.4 +
      (economy?.resourceHealthPct ?? 60) * 0.35 +
      (executive?.globalCoherencePct ?? 55) * 0.25 -
      (input.mockSemanticDriftBoost ?? 0) * 0.25,
  );

  const intentCoherencePct = clamp(
    (executive?.executiveHealthPct ?? 60) * 0.5 +
      semanticConsistencyPct * 0.3 +
      (gov?.consensusScore ?? 55) * 0.2,
  );

  const governanceAlignmentPct = clamp(
    gov?.finalDecision === 'avoid'
      ? 72
      : (gov?.consensusScore ?? 60) * 0.6 + (consensus?.consensusHealthPct ?? 55) * 0.4,
  );

  let intentHealthPct = clamp(
    (instructionContinuityPct +
      semanticConsistencyPct +
      goalIntegrityPct +
      contextIntegrityPct +
      intentCoherencePct +
      governanceAlignmentPct) /
      6,
  );
  if (typeof input.mockIntentHealthPct === 'number') {
    intentHealthPct = clamp(input.mockIntentHealthPct);
  }

  const directivePreservationPct = clamp(
    instructionContinuityPct * 0.55 + governanceAlignmentPct * 0.45,
  );
  const memoryAlignmentPct = clamp(
    (graph?.timelineContinuityPct ?? 52) * 0.55 + (graph?.memoryIntegrityPct ?? 55) * 0.45,
  );
  const strategyAlignmentPct = clamp(
    input.strategy ? 85 - (executive?.orchestrationSaturationPct ?? 0) * 0.2 : 78,
  );
  const explanationConsistencyPct = clamp(
    (ep?.truthStabilityPct ?? ep?.epistemicHealthPct ?? 58) - (ep?.hallucinationRiskPct ?? 0) * 0.2,
  );

  let alignmentIntegrityPct = clamp(
    (directivePreservationPct +
      memoryAlignmentPct +
      strategyAlignmentPct +
      explanationConsistencyPct) /
      4,
  );
  if (typeof input.mockAlignmentIntegrityPct === 'number') {
    alignmentIntegrityPct = clamp(input.mockAlignmentIntegrityPct);
  }

  const conversationDriftPct = clamp(
    (100 - semanticConsistencyPct) * 0.35 +
      (executive?.fragmentationScorePct ?? 0) * 0.25 +
      (input.mockSemanticDriftBoost ?? 0) * 0.4,
  );

  let reinterpretationPressurePct = clamp(
    (ep?.speculativeExpansionPct ?? 0) * 0.35 +
      (100 - semanticConsistencyPct) * 0.3 +
      (graph?.causalDriftPct ?? graph?.temporalFragmentationPct ?? 0) * 0.2 +
      (input.mockReinterpretationPressureBoost ?? 0),
  );

  const contextCorruptionPct = clamp(
    (100 - contextIntegrityPct) * 0.55 + conversationDriftPct * 0.25,
  );

  const orchestrationDeviationPct = clamp(
    orch
      ? 100 - (orch.orchestrationHealthScore ?? 50)
      : (executive?.orchestrationSaturationPct ?? 28) +
          (economy?.orchestrationSaturationPct ?? 0) * 0.35,
  );

  let unsupportedIntentInferencePct = clamp(
    (ep?.unsupportedClaimsPct ?? 0) * 0.45 +
      (ep?.hallucinationRiskPct ?? 0) * 0.35 +
      (input.mockUnsupportedIntentInferenceBoost ?? 0),
  );

  const userPriorityIntegrityPct = clamp(
    governanceAlignmentPct * 0.6 + directivePreservationPct * 0.4,
  );
  const predictionAlignmentPct = clamp(
    executive?.predictionThrottleActive ? 45 : (consensus?.consensusHealthPct ?? 58),
  );
  const orchestrationAlignmentPct = clamp(100 - orchestrationDeviationPct);

  const intentDriftPct = clamp(
    conversationDriftPct +
      reinterpretationPressurePct +
      contextCorruptionPct +
      orchestrationDeviationPct,
  );

  const safeAlignmentPct = clamp(intentHealthPct - intentDriftPct);
  const semanticContinuityPct = semanticConsistencyPct;

  return {
    instructionContinuityPct,
    semanticConsistencyPct,
    goalIntegrityPct,
    contextIntegrityPct,
    intentCoherencePct,
    governanceAlignmentPct,
    directivePreservationPct,
    memoryAlignmentPct,
    strategyAlignmentPct,
    explanationConsistencyPct,
    conversationDriftPct,
    reinterpretationPressurePct,
    contextCorruptionPct,
    orchestrationDeviationPct,
    unsupportedIntentInferencePct,
    userPriorityIntegrityPct,
    predictionAlignmentPct,
    orchestrationAlignmentPct,
    intentHealthPct,
    alignmentIntegrityPct,
    intentDriftPct,
    safeAlignmentPct,
    semanticContinuityPct,
  };
}

export function classifyIntentAlignmentState(metrics: IntentAlignmentMetrics): IntentAlignmentState {
  if (metrics.unsupportedIntentInferencePct > UNSUPPORTED_INTENT_INFERENCE_THRESHOLD) {
    return 'INTENT_UNSUPPORTED';
  }
  if (metrics.reinterpretationPressurePct > REINTERPRETATION_PRESSURE_THRESHOLD) {
    return 'INTENT_REINTERPRETING';
  }
  if (metrics.intentHealthPct < INTENT_HEALTH_FRAGMENTED_THRESHOLD) {
    return 'INTENT_FRAGMENTED';
  }
  if (metrics.intentHealthPct < INTENT_HEALTH_DRIFTING_THRESHOLD) {
    return 'INTENT_DRIFTING';
  }
  if (metrics.alignmentIntegrityPct < ALIGNMENT_INTEGRITY_UNCERTAIN_THRESHOLD) {
    return 'INTENT_UNCERTAIN';
  }
  return 'INTENT_ALIGNED';
}

export function resolveIntentAlignmentActions(
  state: IntentAlignmentState,
  metrics: IntentAlignmentMetrics,
): IntentAlignmentResolution {
  const base: IntentAlignmentResolution = {
    alignmentState: state,
    orchestrationBudgetMax: BUDGET_INTENT_ALIGNED,
    explanationOnlyMode: false,
    instructionReinforcementActive: false,
    contextRebuildActive: false,
    reinterpretationSuppressionActive: false,
    clarificationDowngradeActive: false,
    semanticFreezeActive: false,
    alignmentModeJa: 'explicit instruction priority',
  };

  switch (state) {
    case 'INTENT_DRIFTING':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_INTENT_DRIFTING,
        instructionReinforcementActive: true,
        alignmentModeJa: 'instruction reinforcement — no reinterpretation',
      };
    case 'INTENT_FRAGMENTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_INTENT_FRAGMENTED,
        contextRebuildActive: true,
        instructionReinforcementActive: true,
        semanticFreezeActive: true,
        alignmentModeJa: 'context rebuild mode',
      };
    case 'INTENT_REINTERPRETING':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_INTENT_FRAGMENTED,
        reinterpretationSuppressionActive: true,
        semanticFreezeActive: true,
        alignmentModeJa: 'semantic freeze — reinterpretation suppressed',
      };
    case 'INTENT_UNCERTAIN':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_INTENT_DRIFTING,
        clarificationDowngradeActive: true,
        alignmentModeJa: 'clarification-only mode',
      };
    case 'INTENT_UNSUPPORTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_INTENT_RISK,
        explanationOnlyMode: true,
        reinterpretationSuppressionActive: true,
        semanticFreezeActive: true,
        alignmentModeJa: 'explanation-only fallback',
      };
    default:
      return base;
  }
}
