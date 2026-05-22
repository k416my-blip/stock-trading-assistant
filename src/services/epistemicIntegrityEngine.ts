/**
 * Epistemic Integrity & Truth Calibration — 推論品質監査（真実判定AIではない）。
 */
import {
  EPISTEMIC_AUDIT_LABELS_JA,
  EPISTEMIC_FEATURE_LABELS,
  EPISTEMIC_FLOW_JA,
  EPISTEMIC_HEALTH_FORMULA_JA,
  EPISTEMIC_INTEGRITY_REGULATORY_JA,
  EPISTEMIC_UI_LABELS_JA,
  CONFIDENCE_CALIBRATION_FORMULA_JA,
  HALLUCINATION_RISK_FORMULA_JA,
  REAL_TRADING_ENABLED,
  TRUTH_STABILITY_FORMULA_JA,
  EPISTEMIC_STATE_LABELS_JA,
  UNCERTAINTY_DISCLAIMER_JA,
} from '../constants/epistemicIntegrityTruthCalibration';
import type {
  BuildEpistemicIntegrityInput,
  EpistemicAuditRow,
  EpistemicAuditTargetId,
  EpistemicIntegrityFeatureId,
  EpistemicIntegrityFeatureStatus,
  EpistemicIntegrityTruthCalibrationBundle,
} from '../types/epistemicIntegrityTruthCalibration';
import { loadEpistemicIntegrityState } from './epistemicIntegrityStorage';
import {
  classifyEpistemicState,
  computeEpistemicMetrics,
  resolveEpistemicActions,
} from './truthCalibrationEngine';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildAuditTargets(metrics: ReturnType<typeof computeEpistemicMetrics>): EpistemicAuditRow[] {
  const row = (
    id: EpistemicAuditTargetId,
    risk: number,
    detail: string,
  ): EpistemicAuditRow => ({
    id,
    labelJa: EPISTEMIC_AUDIT_LABELS_JA[id],
    scorePct: clamp(100 - risk),
    statusJa: risk < 35 ? 'ok' : risk < 60 ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    row('confidenceInflation', metrics.confidenceInflationPct, `${metrics.confidenceInflationPct}%`),
    row('unsupportedClaims', metrics.unsupportedClaimsPct, 'unsupported'),
    row('hallucinationDensity', metrics.hallucinationDensityPct, 'density'),
    row('staleAssumptions', metrics.staleAssumptionsPct, 'stale'),
    row('temporalDrift', metrics.temporalDriftPct, 'drift'),
    row('crossLayerContradiction', metrics.contradictionPct, 'contradiction'),
    row('narrativeMutation', metrics.narrativeMutationPct, 'narrative'),
    row('evidenceScarcity', metrics.evidenceScarcityPct, 'scarcity'),
    row('speculativeExpansion', metrics.speculativeExpansionPct, 'speculative'),
    row('recursiveBeliefLoops', metrics.recursiveBeliefLoopsPct, 'loops'),
    row('memoryTruthDivergence', metrics.temporalDriftPct * 0.5, 'memory'),
    row('explanationStability', metrics.truthStabilityPct, 'stability'),
  ];
}

function buildFeatureStatuses(
  partial: Omit<EpistemicIntegrityTruthCalibrationBundle, 'featureStatuses'>,
): EpistemicIntegrityFeatureStatus[] {
  const s = (
    id: EpistemicIntegrityFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): EpistemicIntegrityFeatureStatus => ({
    id,
    labelJa: EPISTEMIC_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('reasoning_metrics_collector', true, false, `${partial.epistemicHealthPct}%`),
    s('unsupported_expansion_detector', partial.unsupportedClaimsPct < 70, false, `${partial.unsupportedClaimsPct}%`),
    s('contradiction_detector', partial.contradictionDensityPct < 65, false, `${partial.contradictionDensityPct}%`),
    s('stale_assumption_detector', partial.temporalDriftPct < 50, false, 'stale'),
    s('confidence_calibrator', partial.confidenceCalibrationPct >= 40, false, `${partial.confidenceCalibrationPct}%`),
    s('speculative_amplifier_reducer', !partial.speculationSuppressed, partial.speculationSuppressed, 'spec'),
    s('governance_validation_gate', true, false, 'gov'),
    s('explanation_fallback_gate', !partial.explanationOnlyMode, partial.explanationOnlyMode, 'fallback'),
    s('hallucination_suppression', partial.hallucinationRiskPct < 60, partial.hallucinationRiskPct >= 45, `${partial.hallucinationRiskPct}%`),
    s('unknown_state_normalizer', partial.unknownStateRatioPct > 0, false, `${partial.unknownStateRatioPct}%`),
    s('epistemic_timeline', partial.epistemicTimeline.length > 0, false, `${partial.epistemicTimeline.length}`),
    s('temporal_drift_meter', partial.temporalDriftPct < 55, false, `${partial.temporalDriftPct}%`),
    s('narrative_mutation_scan', true, false, 'narrative'),
    s('evidence_density_estimator', partial.evidenceStabilityPct >= 50, false, `${partial.evidenceStabilityPct}%`),
    s('recursive_belief_loop_scan', true, false, 'loops'),
    s('memory_truth_divergence_probe', true, false, 'memory'),
    s('cross_layer_agreement_meter', true, false, 'agreement'),
    s('truth_stability_scorer', partial.truthStabilityPct >= 55, false, `${partial.truthStabilityPct}%`),
    s('prediction_throttle', !partial.predictionThrottleActive, partial.predictionThrottleActive, 'throttle'),
    s('consensus_revalidation_request', !partial.consensusRevalidationRequested, partial.consensusRevalidationRequested, 'revalidate'),
    s('mobile_lite_epistemic_scan', true, false, partial.mobileRuntimeStateJa),
    s('deferred_deep_validation', true, false, 'deferred'),
    s('background_hallucination_batch', true, false, 'batch'),
    s('epistemic_integrity_dashboard', true, false, EPISTEMIC_UI_LABELS_JA.panelTitle),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
    s('integrity_over_confidence', true, false, 'integrity'),
    s('no_certainty_escalation', true, false, 'no certainty'),
  ];
}

export async function buildEpistemicIntegrityTruthCalibrationBundle(
  input: BuildEpistemicIntegrityInput,
): Promise<EpistemicIntegrityTruthCalibrationBundle> {
  const persisted = await loadEpistemicIntegrityState();
  const started = input.auditStartedAt ?? Date.now();
  const metrics = computeEpistemicMetrics(input);

  const governanceBlocks =
    input.systemic?.systemicEmergencySafeMode === true ||
    input.metaReliability?.governancePriorityOnly === true ||
    input.governance?.finalDecision === 'avoid';

  const epistemicState = classifyEpistemicState(metrics, governanceBlocks);
  const resolution = resolveEpistemicActions(epistemicState, metrics);

  const snapshotPoint = {
    at: new Date().toISOString(),
    epistemicHealthPct: metrics.epistemicHealthPct,
    epistemicState: resolution.epistemicState,
    hallucinationRiskPct: metrics.hallucinationRiskPct,
    confidenceCalibrationPct: metrics.confidenceCalibrationPct,
  };

  const partial: Omit<EpistemicIntegrityTruthCalibrationBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: EPISTEMIC_INTEGRITY_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    epistemicState: resolution.epistemicState,
    epistemicStateLabelJa: EPISTEMIC_STATE_LABELS_JA[resolution.epistemicState],
    epistemicHealthPct: metrics.epistemicHealthPct,
    confidenceCalibrationPct: metrics.confidenceCalibrationPct,
    rawConfidencePct: metrics.rawConfidencePct,
    hallucinationRiskPct: metrics.hallucinationRiskPct,
    unsupportedClaimsPct: metrics.unsupportedClaimsPct,
    temporalDriftPct: metrics.temporalDriftPct,
    contradictionDensityPct: metrics.contradictionPct,
    evidenceStabilityPct: metrics.truthStabilityPct,
    speculativeExpansionPct: metrics.speculativeExpansionPct,
    truthStabilityPct: metrics.truthStabilityPct,
    unknownStateRatioPct: metrics.unknownStateRatioPct,
    confidenceClampPct: resolution.confidenceClampPct,
    explanationOnlyMode: resolution.explanationOnlyMode,
    explanationDowngradeActive: resolution.explanationDowngradeActive,
    speculationSuppressed: resolution.speculationSuppressed,
    predictionThrottleActive: resolution.predictionThrottleActive,
    consensusRevalidationRequested: resolution.consensusRevalidationRequested,
    orchestrationBudgetMax: resolution.orchestrationBudgetMax,
    epistemicSummaryJa: [
      EPISTEMIC_STATE_LABELS_JA[resolution.epistemicState],
      `health ${metrics.epistemicHealthPct}% · calibration ${metrics.confidenceCalibrationPct}%`,
      metrics.unknownStateRatioPct > 20 ? '（不明状態は正常）' : null,
    ]
      .filter(Boolean)
      .join(' — '),
    uncertaintyDisclaimerJa: UNCERTAINTY_DISCLAIMER_JA,
    epistemicHealthFormulaJa: EPISTEMIC_HEALTH_FORMULA_JA,
    confidenceCalibrationFormulaJa: CONFIDENCE_CALIBRATION_FORMULA_JA,
    hallucinationRiskFormulaJa: HALLUCINATION_RISK_FORMULA_JA,
    truthStabilityFormulaJa: TRUTH_STABILITY_FORMULA_JA,
    epistemicFlowJa: [...EPISTEMIC_FLOW_JA],
    auditTargets: buildAuditTargets(metrics),
    epistemicTimeline: [...persisted.epistemicTimeline, snapshotPoint].slice(-24),
    mobileRuntimeStateJa: `lightweight scan · snapshot audit · ${Date.now() - started}ms`,
    explainRuleBasisJa:
      '推論品質監査。integrity優先。断定予測禁止。unknown許可。governance最優先。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}
