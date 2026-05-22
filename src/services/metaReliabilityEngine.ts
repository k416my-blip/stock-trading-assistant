/**
 * Meta Reliability & Longitudinal Trust — AI信頼寿命の長期監査（売買強化ではない）。
 */
import {
  META_RELIABILITY_FEATURE_LABELS,
  META_RELIABILITY_FORMULA_JA,
  META_RELIABILITY_REGULATORY_JA,
  META_RELIABILITY_UI_LABELS_JA,
  REAL_TRADING_ENABLED,
  SEMANTIC_DRIFT_FORMULA_JA,
  TRUST_AUDIT_LABELS_JA,
  TRUST_DECAY_FORMULA_JA,
  TRUST_FLOW_JA,
  TRUST_STATE_LABELS_JA,
  CONFIDENCE_INFLATION_FORMULA_JA,
  UNCERTAINTY_DISCLAIMER_JA,
} from '../constants/metaReliabilityLongitudinalTrust';
import type {
  BuildMetaReliabilityInput,
  MetaReliabilityFeatureId,
  MetaReliabilityFeatureStatus,
  MetaReliabilityLongitudinalTrustBundle,
  TrustAuditRow,
  TrustAuditTargetId,
} from '../types/metaReliabilityLongitudinalTrust';
import { loadMetaReliabilityState } from './metaReliabilityLongitudinalTrustStorage';
import {
  classifyTrustState,
  computeLongitudinalMetrics,
  resolveTrustActions,
} from './longitudinalTrustAuditEngine';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildAuditTargets(
  metrics: ReturnType<typeof computeLongitudinalMetrics>,
  input: BuildMetaReliabilityInput,
): TrustAuditRow[] {
  const row = (
    id: TrustAuditTargetId,
    score: number,
    detail: string,
  ): TrustAuditRow => ({
    id,
    labelJa: TRUST_AUDIT_LABELS_JA[id],
    scorePct: clamp(score),
    statusJa: score >= 65 ? 'ok' : score >= 40 ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    row(
      'recommendationConsistency',
      100 - metrics.semanticDriftPct * 0.4,
      `decision ${input.finalDecision}`,
    ),
    row(
      'confidenceIntegrity',
      100 - metrics.confidenceInflationPct,
      `mean ${metrics.confidenceMeanPct}%`,
    ),
    row('semanticStability', 100 - metrics.semanticDriftPct, 'drift audit'),
    row(
      'explanationAlignment',
      metrics.explanationIntegrityPct,
      input.semantic?.semanticSummaryJa?.slice(0, 40) ?? '—',
    ),
    row(
      'consensusReliability',
      input.consensus?.consensusHealthPct ?? 50,
      input.consensus?.consensusState ?? '—',
    ),
    row(
      'regimePersistence',
      input.regime?.regimeConfidencePct ?? 50,
      input.regime?.currentRegime ?? '—',
    ),
    row('rollbackFrequency', 100 - metrics.trustDecayPct * 0.5, 'rollback tracker'),
    row('freezeFrequency', 100 - (input.consensus?.uncertaintyPct ?? 0) * 0.4, 'freeze tracker'),
    row(
      'orchestrationStability',
      input.orchestration?.orchestrationHealthScore ?? 60,
      'orchestration',
    ),
    row('recoveryDurability', input.recovery?.recoveryHealthPct ?? 55, 'recovery'),
  ];
}

function buildFeatureStatuses(
  partial: Omit<MetaReliabilityLongitudinalTrustBundle, 'featureStatuses'>,
): MetaReliabilityFeatureStatus[] {
  const s = (
    id: MetaReliabilityFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): MetaReliabilityFeatureStatus => ({
    id,
    labelJa: META_RELIABILITY_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('longitudinal_snapshot_collector', true, false, `${partial.longitudinalTimeline.length}`),
    s('historical_consistency_comparator', partial.longitudinalConsistencyPct >= 50, false, `${partial.longitudinalConsistencyPct}%`),
    s('semantic_drift_detector', partial.semanticDriftPct < 70, partial.semanticDriftPct >= 45, `${partial.semanticDriftPct}%`),
    s('confidence_inflation_scanner', partial.confidenceInflationPct < 50, false, `${partial.confidenceInflationPct}%`),
    s('trust_scoring_engine', partial.metaReliabilityPct >= 45, partial.metaReliabilityPct < 60, `${partial.metaReliabilityPct}%`),
    s('governance_validation_gate', !partial.governancePriorityOnly, partial.governancePriorityOnly, 'gov'),
    s('unstable_downgrade_gate', !partial.watchHoldOnly, partial.watchHoldOnly, partial.downgradeReasonJa),
    s('orchestration_handoff', true, false, partial.orchestrationInteractionJa),
    s('trust_timeline', partial.longitudinalTimeline.length > 0, false, `${partial.longitudinalTimeline.length}`),
    s('hallucination_risk_guard', partial.hallucinationRiskPct < 75, partial.hallucinationRiskPct >= 60, `${partial.hallucinationRiskPct}%`),
    s('explanation_divergence_mode', !partial.explanationOnlyMode, partial.explanationOnlyMode, 'divergence'),
    s('longitudinal_unsupported_freeze', !partial.freezeAdaptiveLearning, partial.freezeAdaptiveLearning, 'unsupported'),
    s('rollback_frequency_tracker', true, false, 'rollback'),
    s('freeze_frequency_tracker', true, false, 'freeze'),
    s('stale_consensus_detector', partial.staleReasoningRiskPct < 60, false, `${partial.staleReasoningRiskPct}%`),
    s('replay_reliability_probe', true, false, 'replay'),
    s('governance_deviation_meter', partial.governanceDeviationPct < 50, false, `${partial.governanceDeviationPct}%`),
    s('orchestration_volatility_meter', true, false, 'volatility'),
    s('recursive_instability_scan', true, false, 'recursive'),
    s('mobile_snapshot_compression', true, false, partial.mobileRuntimeStateJa),
    s('trust_cache_retain', true, false, 'cache'),
    s('background_audit_batch', true, false, 'batch'),
    s('meta_reliability_dashboard', true, false, META_RELIABILITY_UI_LABELS_JA.panelTitle),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
    s('long_term_consistency_only', true, false, 'long-term'),
    s('uncertainty_preservation', true, false, 'uncertainty'),
    s('confidence_decay_on_trust_loss', partial.trustDecayPct > 0, partial.trustDecayPct > 40, `${partial.trustDecayPct}%`),
    s('recommendation_consistency_audit', partial.longitudinalConsistencyPct >= 55, false, 'consistency'),
    s('recovery_durability_probe', true, false, 'recovery'),
  ];
}

export async function buildMetaReliabilityLongitudinalTrustBundle(
  input: BuildMetaReliabilityInput,
): Promise<MetaReliabilityLongitudinalTrustBundle> {
  const persisted = await loadMetaReliabilityState();
  const started = input.auditStartedAt ?? Date.now();
  const metrics = computeLongitudinalMetrics(input, persisted);

  const governanceBlocks =
    input.systemic?.systemicEmergencySafeMode === true ||
    input.consensus?.governanceOverrideActive === true ||
    input.governance?.finalDecision === 'avoid';

  let trustState = classifyTrustState(metrics, governanceBlocks);
  if (input.consensus?.consensusState === 'UNSUPPORTED_STATE') {
    trustState = 'LONGITUDINAL_UNSUPPORTED';
  }

  const resolution = resolveTrustActions(trustState, metrics);
  const regimeId = input.regime?.currentRegime ?? 'neutral';

  const snapshotPoint = {
    at: new Date().toISOString(),
    metaReliabilityPct: metrics.metaReliabilityPct,
    trustState: resolution.trustState,
    trustDecayPct: metrics.trustDecayPct,
    semanticDriftPct: metrics.semanticDriftPct,
    finalDecision: input.finalDecision,
    regimeId,
  };

  const partial: Omit<MetaReliabilityLongitudinalTrustBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: META_RELIABILITY_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    trustState: resolution.trustState,
    trustStateLabelJa: TRUST_STATE_LABELS_JA[resolution.trustState],
    metaReliabilityPct: metrics.metaReliabilityPct,
    trustDecayPct: metrics.trustDecayPct,
    semanticDriftPct: metrics.semanticDriftPct,
    confidenceInflationPct: metrics.confidenceInflationPct,
    hallucinationRiskPct: metrics.hallucinationRiskPct,
    governanceDeviationPct: metrics.governanceDeviationPct,
    longitudinalConsistencyPct: metrics.longitudinalConsistencyPct,
    explanationIntegrityPct: metrics.explanationIntegrityPct,
    staleReasoningRiskPct: metrics.staleReasoningRiskPct,
    confidenceClampPct: resolution.confidenceClampPct,
    orchestrationBudgetMax: resolution.orchestrationBudgetMax,
    explanationOnlyMode: resolution.explanationOnlyMode,
    watchHoldOnly: resolution.watchHoldOnly,
    freezeAdaptiveLearning: resolution.freezeAdaptiveLearning,
    governancePriorityOnly: resolution.governancePriorityOnly,
    downgradeReasonJa: resolution.downgradeReasonJa,
    orchestrationInteractionJa: resolution.orchestrationInteractionJa,
    mobileRuntimeStateJa: `${resolution.mobileRuntimeStateJa} · audit ${Date.now() - started}ms`,
    trustSummaryJa: [
      TRUST_STATE_LABELS_JA[resolution.trustState],
      `meta ${metrics.metaReliabilityPct}% · decay ${metrics.trustDecayPct}%`,
      '（長期一貫性監査 — 断定予測なし）',
    ].join(' — '),
    uncertaintyDisclaimerJa: UNCERTAINTY_DISCLAIMER_JA,
    metaReliabilityFormulaJa: META_RELIABILITY_FORMULA_JA,
    trustDecayFormulaJa: TRUST_DECAY_FORMULA_JA,
    confidenceInflationFormulaJa: CONFIDENCE_INFLATION_FORMULA_JA,
    semanticDriftFormulaJa: SEMANTIC_DRIFT_FORMULA_JA,
    trustFlowJa: [...TRUST_FLOW_JA],
    auditTargets: buildAuditTargets(metrics, input),
    longitudinalTimeline: [
      ...persisted.longitudinalTimeline,
      snapshotPoint,
    ].slice(-32),
    explainRuleBasisJa:
      '長期信頼寿命管理。governance最優先。systemic emergency bypass禁止。売買強化ではない。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}
