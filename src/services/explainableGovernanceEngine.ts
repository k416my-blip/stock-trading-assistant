/**
 * Explainable Governance & Transparent Reasoning — safe audit explanations only (not CoT).
 */
import {
  EXPLAINABILITY_HEALTH_FORMULA_JA,
  EXPLAINABLE_FLOW_JA,
  EXPLAINABLE_GOVERNANCE_REGULATORY_JA,
  EXPLAINABLE_FEATURE_LABELS,
  EXPLAINABLE_STATE_LABELS_JA,
  EXPLAINABLE_UI_LABELS_JA,
  EXPLANATION_RISK_FORMULA_JA,
  REAL_TRADING_ENABLED,
  SAFE_EXPLANATION_INTEGRITY_FORMULA_JA,
  TRANSPARENCY_SCORE_FORMULA_JA,
} from '../constants/explainableGovernanceTransparentReasoning';
import type {
  BuildExplainableGovernanceInput,
  ExplainableFeatureId,
  ExplainableFeatureStatus,
  ExplainableGovernanceTransparentReasoningBundle,
} from '../types/explainableGovernanceTransparentReasoning';
import { loadExplainableGovernanceState } from './explainableGovernanceStorage';
import {
  buildSafeGovernanceRationales,
  classifyExplainableState,
  collectExplainableAuditTargets,
  computeTransparencyMetrics,
  resolveExplainableActions,
} from './reasoningTransparencyEngine';
import { guardExplanationRegeneration } from './explanationStormGuard';
import { resolveTriggerBudgetDecision } from './crossLayerTriggerBudget';
import { noteCascadeExplanationRegeneration } from './crossLayerCascadeEngine';
import { cooperativeYield } from './cooperativeYield';

function buildFeatureStatuses(
  partial: Omit<ExplainableGovernanceTransparentReasoningBundle, 'featureStatuses'>,
): ExplainableFeatureStatus[] {
  const s = (
    id: ExplainableFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): ExplainableFeatureStatus => ({
    id,
    labelJa: EXPLAINABLE_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('safe_summary_cache', true, false, 'cached'),
    s('rationale_generator', partial.safeRationales.length > 0, false, `${partial.safeRationales.length}`),
    s('downgrade_reason_attacher', partial.downgradeReasonsJa.length > 0, false, `${partial.downgradeReasonsJa.length}`),
    s('freeze_reason_attacher', partial.freezeReasonsJa.length > 0, false, `${partial.freezeReasonsJa.length}`),
    s('orchestration_summary', partial.orchestrationRationaleJa.length > 0, false, 'orch'),
    s('override_accountability', partial.overrideAccountabilityPct >= 55, false, `${partial.overrideAccountabilityPct}%`),
    s('uncertainty_disclosure', partial.uncertaintyDisclosureJa.length > 0, false, `${partial.uncertaintyDisclosureJa.length}`),
    s('constitutional_precedence_explain', partial.constitutionalAuditabilityPct >= 50, false, `${partial.constitutionalAuditabilityPct}%`),
    s('no_raw_cot', partial.rawChainOfThoughtForbidden, false, 'forbidden'),
    s('no_hidden_reasoning', partial.internalHiddenReasoningForbidden, false, 'forbidden'),
    s('no_latent_exposure', partial.latentReasoningExposureForbidden, false, 'forbidden'),
    s('explanation_suppression', !partial.explanationSuppressionActive, partial.explanationSuppressionActive, 'suppress'),
    s('fallback_explanation', !partial.fallbackExplanationMode, partial.fallbackExplanationMode, 'fallback'),
    s('consistency_rebuild', !partial.consistencyRebuildActive, partial.consistencyRebuildActive, 'rebuild'),
    s('minimal_governance_summary', partial.fallbackExplanationMode, false, 'minimal'),
    s('explainable_timeline', partial.explainableTimeline.length > 0, false, `${partial.explainableTimeline.length}`),
    s('mobile_lite_rationale', true, false, partial.mobileRuntimeStateJa),
    s('explainable_dashboard', true, false, EXPLAINABLE_UI_LABELS_JA.panelTitle),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
  ];
}

export async function buildExplainableGovernanceTransparentReasoningBundle(
  input: BuildExplainableGovernanceInput,
): Promise<ExplainableGovernanceTransparentReasoningBundle> {
  const persisted = await loadExplainableGovernanceState();
  const started = input.auditStartedAt ?? Date.now();
  const budgetDecision = resolveTriggerBudgetDecision('explanation_regeneration');
  let rationales = buildSafeGovernanceRationales(input);
  if (budgetDecision === 'cache_reuse' || budgetDecision === 'throttle') {
    rationales = guardExplanationRegeneration(rationales);
  } else if (budgetDecision === 'allow') {
    noteCascadeExplanationRegeneration();
    rationales = guardExplanationRegeneration(rationales);
  } else {
    rationales = guardExplanationRegeneration(rationales).slice(0, 3);
  }
  await cooperativeYield();
  const metrics = computeTransparencyMetrics(input, persisted, rationales);
  const explainableState = classifyExplainableState(metrics);
  const resolution = resolveExplainableActions(explainableState, metrics);
  const auditTargets = collectExplainableAuditTargets(metrics);

  const downgradeReasonsJa = rationales
    .filter((r) => r.kind === 'downgrade')
    .map((r) => r.rationaleJa);
  const freezeReasonsJa = rationales.filter((r) => r.kind === 'freeze').map((r) => r.rationaleJa);
  const overrideAccountabilityJa = rationales
    .filter((r) => r.kind === 'override')
    .map((r) => `${r.layerLabelJa}: ${r.rationaleJa}`);
  const uncertaintyDisclosureJa = rationales
    .filter((r) => r.kind === 'uncertainty')
    .map((r) => r.rationaleJa);

  const orchestrationRationaleJa =
    rationales.find((r) => r.kind === 'orchestration')?.rationaleJa ??
    (input.orchestration?.userExplanationJa
      ? input.orchestration.userExplanationJa.slice(0, 200)
      : 'orchestration followed governance precedence — no hidden override');

  const snapshotPoint = {
    at: new Date().toISOString(),
    explainabilityHealthPct: metrics.explainabilityHealthPct,
    explainableState: resolution.explainableState,
    transparencyScorePct: metrics.transparencyScorePct,
  };

  const partial: Omit<ExplainableGovernanceTransparentReasoningBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: EXPLAINABLE_GOVERNANCE_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    internalHiddenReasoningForbidden: true,
    rawChainOfThoughtForbidden: true,
    latentReasoningExposureForbidden: true,
    hiddenPromptExposureForbidden: true,
    hiddenGovernanceExposureForbidden: true,
    selfExplanationHallucinationForbidden: true,
    unsupportedExplanationForbidden: true,
    persuasionExplanationForbidden: true,
    fabricatedRationaleForbidden: true,
    strategyActionChangeForbidden: true,
    explainableState: resolution.explainableState,
    explainableStateLabelJa: EXPLAINABLE_STATE_LABELS_JA[resolution.explainableState],
    explainabilityHealthPct: metrics.explainabilityHealthPct,
    transparencyScorePct: metrics.transparencyScorePct,
    safeExplanationIntegrityPct: metrics.safeExplanationIntegrityPct,
    explanationRiskPct: metrics.explanationRiskPct,
    explanationConsistencyPct: metrics.explanationConsistencyPct,
    governanceExplainabilityPct: metrics.governanceExplainabilityPct,
    reasoningTransparencyPct: metrics.reasoningTransparencyPct,
    decisionTraceabilityPct: metrics.decisionTraceabilityPct,
    downgradeExplainabilityPct: metrics.downgradeExplainabilityPct,
    freezeExplainabilityPct: metrics.freezeExplainabilityPct,
    overrideAccountabilityPct: metrics.overrideAccountabilityPct,
    constitutionalAuditabilityPct: metrics.constitutionalAuditabilityPct,
    uncertaintyDisclosurePct: metrics.uncertaintyDisclosureIntegrityPct,
    hallucinatedExplanationRiskPct: metrics.hallucinatedExplanationRiskPct,
    unsupportedExplanationRiskPct: metrics.unsupportedExplanationRiskPct,
    explanationOnlyMode: resolution.explanationOnlyMode,
    safeSimplificationActive: resolution.safeSimplificationActive,
    fallbackExplanationMode: resolution.fallbackExplanationMode,
    explanationSuppressionActive: resolution.explanationSuppressionActive,
    consistencyRebuildActive: resolution.consistencyRebuildActive,
    orchestrationBudgetMax: resolution.orchestrationBudgetMax,
    explainableSummaryJa: [
      EXPLAINABLE_STATE_LABELS_JA[resolution.explainableState],
      `health ${metrics.explainabilityHealthPct}% · transparency ${metrics.transparencyScorePct}%`,
      resolution.explanationSuppressionActive ? '説明抑制' : resolution.explainableModeJa,
    ]
      .filter(Boolean)
      .join(' — '),
    orchestrationRationaleJa,
    downgradeReasonsJa,
    freezeReasonsJa,
    overrideAccountabilityJa,
    uncertaintyDisclosureJa,
    safeRationales: rationales,
    explainabilityHealthFormulaJa: EXPLAINABILITY_HEALTH_FORMULA_JA,
    transparencyScoreFormulaJa: TRANSPARENCY_SCORE_FORMULA_JA,
    safeExplanationIntegrityFormulaJa: SAFE_EXPLANATION_INTEGRITY_FORMULA_JA,
    explanationRiskFormulaJa: EXPLANATION_RISK_FORMULA_JA,
    explainableFlowJa: [...EXPLAINABLE_FLOW_JA],
    auditTargets,
    explainableTimeline: [...persisted.explainableTimeline, snapshotPoint].slice(-48),
    mobileRuntimeStateJa: `lightweight safe rationale · ${Date.now() - started}ms`,
    explainRuleBasisJa:
      '安全な監査説明のみ。内部推論・CoT・hidden prompt 禁止。downgrade/freeze/override にテンプレート根拠のみ。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}
