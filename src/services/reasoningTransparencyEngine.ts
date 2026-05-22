import {
  EXPLANATION_CONSISTENCY_CONTRADICTED_THRESHOLD,
  EXPLANATION_RISK_THRESHOLD,
  FORBIDDEN_EXPLANATION_PHRASES,
  SAFE_EXPLANATION_TEMPLATES_JA,
  TRANSPARENCY_OPAQUE_THRESHOLD,
  TRANSPARENCY_PARTIAL_THRESHOLD,
  UNSUPPORTED_EXPLANATION_RISK_THRESHOLD,
  BUDGET_EXPLAINABLE_OK,
  BUDGET_EXPLAINABLE_PARTIAL,
  BUDGET_EXPLAINABLE_OPAQUE,
  BUDGET_EXPLAINABLE_RISK,
  EXPLAINABLE_AUDIT_LABELS_JA,
} from '../constants/explainableGovernanceTransparentReasoning';
import type {
  BuildExplainableGovernanceInput,
  ExplainableAuditSnapshot,
  ExplainableAuditTargetId,
  ExplainableState,
  SafeGovernanceRationale,
} from '../types/explainableGovernanceTransparentReasoning';
import type { ExplainableGovernancePersisted } from './explainableGovernanceStorage';

export type TransparencyMetrics = {
  governanceExplainabilityPct: number;
  reasoningTransparencyPct: number;
  decisionTraceabilityPct: number;
  downgradeExplainabilityPct: number;
  freezeExplainabilityPct: number;
  overrideAccountabilityPct: number;
  constitutionalAuditabilityPct: number;
  uncertaintyDisclosureIntegrityPct: number;
  safeSummaryIntegrityPct: number;
  hallucinatedExplanationRiskPct: number;
  unsupportedExplanationRiskPct: number;
  explanationConsistencyPct: number;
  explainabilityHealthPct: number;
  safeExplanationIntegrityPct: number;
  explanationRiskPct: number;
  transparencyScorePct: number;
};

export type ExplainableResolution = {
  explainableState: ExplainableState;
  orchestrationBudgetMax: number;
  explanationOnlyMode: boolean;
  safeSimplificationActive: boolean;
  fallbackExplanationMode: boolean;
  explanationSuppressionActive: boolean;
  consistencyRebuildActive: boolean;
  explainableModeJa: string;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function audit(
  id: ExplainableAuditTargetId,
  score: number,
  detail: string,
): ExplainableAuditSnapshot {
  return {
    id,
    labelJa: EXPLAINABLE_AUDIT_LABELS_JA[id],
    scorePct: clamp(score),
    detailJa: detail,
  };
}

function containsForbiddenPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_EXPLANATION_PHRASES.some((p) => lower.includes(p.toLowerCase()));
}

export function buildSafeGovernanceRationales(
  input: BuildExplainableGovernanceInput,
): SafeGovernanceRationale[] {
  const rationales: SafeGovernanceRationale[] = [];
  const ep = input.epistemic;
  const intent = input.humanIntentContinuity;
  const economy = input.cognitiveResourceEconomy;
  const constitutional = input.constitutionalGovernance;
  const explore = input.adaptiveExploration;
  const executive = input.unifiedCognitiveState;
  const consensus = input.consensus;
  const gov = input.governance;

  if (ep?.explanationOnlyMode || (ep?.unsupportedClaimsPct ?? 0) > 50) {
    rationales.push({
      layerId: 'epistemic',
      layerLabelJa: 'Epistemic Integrity',
      rationaleJa: SAFE_EXPLANATION_TEMPLATES_JA.epistemicUnsupported,
      kind: 'uncertainty',
    });
  }
  if ((ep?.epistemicHealthPct ?? 100) < 55 || ep?.predictionThrottleActive || ep?.speculationSuppressed) {
    rationales.push({
      layerId: 'epistemic',
      layerLabelJa: 'Epistemic Integrity',
      rationaleJa: SAFE_EXPLANATION_TEMPLATES_JA.confidenceReduced,
      kind: 'downgrade',
    });
  }
  if (economy?.speculativeComputeClampActive || economy?.deepReflectionSuppressed) {
    rationales.push({
      layerId: 'resource',
      layerLabelJa: 'Resource Economy',
      rationaleJa: SAFE_EXPLANATION_TEMPLATES_JA.resourceSpeculativeReduced,
      kind: 'freeze',
    });
  }
  if (constitutional?.overrideFreezeActive || constitutional?.precedenceArbitrationActive) {
    rationales.push({
      layerId: 'constitutional',
      layerLabelJa: 'Constitutional Governance',
      rationaleJa: SAFE_EXPLANATION_TEMPLATES_JA.constitutionalOverridePrevented,
      kind: 'override',
    });
  }
  if (intent?.clarificationDowngradeActive || intent?.explanationOnlyMode) {
    rationales.push({
      layerId: 'intent',
      layerLabelJa: 'Human Intent Continuity',
      rationaleJa: SAFE_EXPLANATION_TEMPLATES_JA.humanIntentClarification,
      kind: 'downgrade',
    });
  }
  if (intent?.semanticFreezeActive || executive?.deepReasoningFreezeActive) {
    rationales.push({
      layerId: 'intent',
      layerLabelJa: 'Human Intent / Executive',
      rationaleJa: SAFE_EXPLANATION_TEMPLATES_JA.predictionDepthLimited,
      kind: 'freeze',
    });
  }
  if (explore?.fallbackFreezeActive || explore?.explanationOnlyMode) {
    rationales.push({
      layerId: 'exploration',
      layerLabelJa: 'Adaptive Exploration',
      rationaleJa: SAFE_EXPLANATION_TEMPLATES_JA.predictionDepthLimited,
      kind: 'freeze',
    });
  }
  if (
    consensus?.consensusState === 'HARD_CONFLICT' ||
    consensus?.consensusState === 'PANIC_CONSENSUS'
  ) {
    rationales.push({
      layerId: 'consensus',
      layerLabelJa: 'Consensus',
      rationaleJa: SAFE_EXPLANATION_TEMPLATES_JA.confidenceReduced,
      kind: 'downgrade',
    });
  }
  if (gov?.finalDecision === 'watch' || gov?.finalDecision === 'hold') {
    rationales.push({
      layerId: 'governance',
      layerLabelJa: 'Governance',
      rationaleJa: `decision held at ${gov.finalDecisionLabelJa} per governance policy`,
      kind: 'orchestration',
    });
  }

  return rationales.slice(0, 12);
}

export function collectExplainableAuditTargets(
  metrics: TransparencyMetrics,
): ExplainableAuditSnapshot[] {
  return [
    audit('governanceExplainability', metrics.governanceExplainabilityPct, 'governance'),
    audit('reasoningTransparency', metrics.reasoningTransparencyPct, 'transparency'),
    audit('decisionTraceability', metrics.decisionTraceabilityPct, 'trace'),
    audit('downgradeExplainability', metrics.downgradeExplainabilityPct, 'downgrade'),
    audit('freezeExplainability', metrics.freezeExplainabilityPct, 'freeze'),
    audit('overrideAccountability', metrics.overrideAccountabilityPct, 'override'),
    audit('constitutionalAuditability', metrics.constitutionalAuditabilityPct, 'constitutional'),
    audit('uncertaintyDisclosureIntegrity', metrics.uncertaintyDisclosureIntegrityPct, 'uncertainty'),
    audit('safeSummaryIntegrity', metrics.safeSummaryIntegrityPct, 'safe summary'),
    audit('hallucinatedExplanationRisk', 100 - metrics.hallucinatedExplanationRiskPct, 'hallucination'),
    audit('unsupportedExplanationRisk', 100 - metrics.unsupportedExplanationRiskPct, 'unsupported'),
    audit('explanationConsistency', metrics.explanationConsistencyPct, 'consistency'),
  ];
}

export function computeTransparencyMetrics(
  input: BuildExplainableGovernanceInput,
  persisted: ExplainableGovernancePersisted,
  rationales: SafeGovernanceRationale[],
): TransparencyMetrics {
  const ep = input.epistemic;
  const intent = input.humanIntentContinuity;
  const constitutional = input.constitutionalGovernance;
  const explore = input.adaptiveExploration;
  const executive = input.unifiedCognitiveState;
  const consensus = input.consensus;
  const meta = input.metaReliability;
  const economy = input.cognitiveResourceEconomy;
  const orch = input.orchestration;
  const gov = input.governance;

  const rationaleCount = rationales.length;
  const downgradeCount = rationales.filter((r) => r.kind === 'downgrade').length;
  const freezeCount = rationales.filter((r) => r.kind === 'freeze').length;
  const overrideCount = rationales.filter((r) => r.kind === 'override').length;

  const governanceExplainabilityPct = clamp(
    (gov?.consensusScore ?? 58) * 0.4 +
      (constitutional?.governanceHierarchyIntegrityPct ?? 60) * 0.35 +
      (100 - (constitutional?.conflictPressurePct ?? 30) * 0.5) * 0.25,
  );

  const reasoningTransparencyPct = clamp(
    85 -
      (ep?.unsupportedClaimsPct ?? 0) * 0.35 -
      (explore?.unsupportedExplorationRiskPct ?? 0) * 0.2 -
      persisted.lastTransparencyScorePct * 0.05,
  );

  const decisionTraceabilityPct = clamp(
    rationaleCount * 12 +
      (orch ? 40 : 25) +
      (consensus?.consensusHealthPct ?? 55) * 0.2 -
      (orch?.skippedLayerCount ?? 0) * 3,
  );

  const downgradeExplainabilityPct = clamp(
    downgradeCount > 0 ? 70 + downgradeCount * 5 : 45,
  );

  const freezeExplainabilityPct = clamp(freezeCount > 0 ? 72 + freezeCount * 6 : 48);

  const overrideAccountabilityPct = clamp(
    overrideCount > 0 ? 75 + overrideCount * 8 : 55 - (constitutional?.overrideFreezeActive ? 0 : 10),
  );

  const constitutionalAuditabilityPct = clamp(
    (constitutional?.constitutionalHealthPct ?? 65) * 0.5 +
      (constitutional?.precedenceIntegrityPct ?? 60) * 0.5,
  );

  const uncertaintyDisclosureIntegrityPct = clamp(
    (ep?.uncertaintyDisclaimerJa ? 15 : 0) +
      (explore?.uncertaintyAcknowledgmentActive === true ? 12 : 0) +
      (intent?.explanationOnlyMode ? 10 : 0) +
      55 -
      (ep?.unsupportedClaimsPct ?? 0) * 0.3,
  );

  const safeSummaryIntegrityPct = clamp(
    90 - rationaleCount * 2 - (input.mockHallucinatedExplanationBoost ?? 0),
  );

  let hallucinatedExplanationRiskPct = clamp(
    rationales.filter((r) => containsForbiddenPhrase(r.rationaleJa)).length * 25 +
      (gov?.unifiedAiSummaryJa && containsForbiddenPhrase(gov.unifiedAiSummaryJa) ? 40 : 0) +
      (input.mockHallucinatedExplanationBoost ?? 0),
  );

  let unsupportedExplanationRiskPct = clamp(
    (ep?.unsupportedClaimsPct ?? 0) * 0.4 +
      (intent?.unsupportedInferenceRiskPct ?? 0) * 0.3 +
      (explore?.unsupportedExplorationRiskPct ?? 0) * 0.2 +
      (constitutional?.unsupportedGovernanceRiskPct ?? 0) * 0.15 +
      (input.mockUnsupportedExplanationBoost ?? 0),
  );

  let explanationConsistencyPct = clamp(
    82 -
      Math.abs(downgradeCount - freezeCount) * 8 -
      (consensus?.contradictionRiskPct ?? 0) * 0.25 -
      (ep?.contradictionDensityPct ?? 0) * 0.2 -
      (meta?.trustState === 'EXPLANATION_DIVERGENCE' ? 25 : 0),
  );
  if (typeof input.mockExplanationConsistencyPct === 'number') {
    explanationConsistencyPct = clamp(input.mockExplanationConsistencyPct);
  }

  let explainabilityHealthPct = clamp(
    (governanceExplainabilityPct +
      reasoningTransparencyPct +
      decisionTraceabilityPct +
      constitutionalAuditabilityPct) /
      4,
  );
  if (typeof input.mockExplainabilityHealthPct === 'number') {
    explainabilityHealthPct = clamp(input.mockExplainabilityHealthPct);
  }

  const safeExplanationIntegrityPct = clamp(
    (safeSummaryIntegrityPct +
      uncertaintyDisclosureIntegrityPct +
      explanationConsistencyPct +
      overrideAccountabilityPct) /
      4,
  );

  let explanationRiskPct = clamp(
    (hallucinatedExplanationRiskPct + unsupportedExplanationRiskPct) / 2,
  );
  if (typeof input.mockExplanationRiskPct === 'number') {
    explanationRiskPct = clamp(input.mockExplanationRiskPct);
  }

  let transparencyScorePct = clamp(
    explainabilityHealthPct + safeExplanationIntegrityPct - explanationRiskPct,
  );
  if (typeof input.mockTransparencyScorePct === 'number') {
    transparencyScorePct = clamp(input.mockTransparencyScorePct);
  }

  return {
    governanceExplainabilityPct,
    reasoningTransparencyPct,
    decisionTraceabilityPct,
    downgradeExplainabilityPct,
    freezeExplainabilityPct,
    overrideAccountabilityPct,
    constitutionalAuditabilityPct,
    uncertaintyDisclosureIntegrityPct: uncertaintyDisclosureIntegrityPct,
    safeSummaryIntegrityPct,
    hallucinatedExplanationRiskPct,
    unsupportedExplanationRiskPct,
    explanationConsistencyPct,
    explainabilityHealthPct,
    safeExplanationIntegrityPct,
    explanationRiskPct,
    transparencyScorePct,
  };
}

export function classifyExplainableState(metrics: TransparencyMetrics): ExplainableState {
  if (metrics.unsupportedExplanationRiskPct > UNSUPPORTED_EXPLANATION_RISK_THRESHOLD) {
    return 'EXPLAINABLE_UNSUPPORTED';
  }
  if (metrics.explanationConsistencyPct < EXPLANATION_CONSISTENCY_CONTRADICTED_THRESHOLD) {
    return 'EXPLAINABLE_CONTRADICTED';
  }
  if (metrics.explanationRiskPct > EXPLANATION_RISK_THRESHOLD) {
    return 'EXPLAINABLE_RISK';
  }
  if (metrics.transparencyScorePct < TRANSPARENCY_OPAQUE_THRESHOLD) {
    return 'EXPLAINABLE_OPAQUE';
  }
  if (metrics.transparencyScorePct < TRANSPARENCY_PARTIAL_THRESHOLD) {
    return 'EXPLAINABLE_PARTIAL';
  }
  return 'EXPLAINABLE_OK';
}

export function resolveExplainableActions(
  state: ExplainableState,
  _metrics: TransparencyMetrics,
): ExplainableResolution {
  const base: ExplainableResolution = {
    explainableState: state,
    orchestrationBudgetMax: BUDGET_EXPLAINABLE_OK,
    explanationOnlyMode: false,
    safeSimplificationActive: false,
    fallbackExplanationMode: false,
    explanationSuppressionActive: false,
    consistencyRebuildActive: false,
    explainableModeJa: 'full safe governance explanations',
  };

  switch (state) {
    case 'EXPLAINABLE_PARTIAL':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXPLAINABLE_PARTIAL,
        safeSimplificationActive: true,
        explainableModeJa: 'safe simplification — shortened rationales',
      };
    case 'EXPLAINABLE_OPAQUE':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXPLAINABLE_OPAQUE,
        fallbackExplanationMode: true,
        safeSimplificationActive: true,
        explainableModeJa: 'fallback explanation mode — minimal governance summary',
      };
    case 'EXPLAINABLE_RISK':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXPLAINABLE_RISK,
        explanationSuppressionActive: true,
        explainableModeJa: 'explanation suppression — risk containment',
      };
    case 'EXPLAINABLE_UNSUPPORTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXPLAINABLE_RISK,
        explanationOnlyMode: true,
        fallbackExplanationMode: true,
        explanationSuppressionActive: true,
        explainableModeJa: 'explanation-only fallback',
      };
    case 'EXPLAINABLE_CONTRADICTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXPLAINABLE_PARTIAL,
        consistencyRebuildActive: true,
        safeSimplificationActive: true,
        explainableModeJa: 'consistency repair mode',
      };
    default:
      return base;
  }
}
