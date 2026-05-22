/**
 * Constitutional Governance & System Coherence — 中央憲法層（autonomy・self-amendmentではない）。
 */
import {
  CONSTITUTIONAL_FLOW_JA,
  CONSTITUTIONAL_GOVERNANCE_REGULATORY_JA,
  CONSTITUTIONAL_HEALTH_FORMULA_JA,
  CONSTITUTIONAL_PRECEDENCE_JA,
  CONSTITUTIONAL_STATE_LABELS_JA,
  CONFLICT_PRESSURE_FORMULA_JA,
  CONSTITUTIONAL_FEATURE_LABELS,
  CONSTITUTIONAL_UI_LABELS_JA,
  PRECEDENCE_INTEGRITY_FORMULA_JA,
  REAL_TRADING_ENABLED,
  SYSTEM_STABILITY_INDEX_FORMULA_JA,
} from '../constants/constitutionalGovernanceSystemCoherence';
import type {
  BuildConstitutionalGovernanceInput,
  ConstitutionalFeatureId,
  ConstitutionalFeatureStatus,
  ConstitutionalGovernanceSystemCoherenceBundle,
} from '../types/constitutionalGovernanceSystemCoherence';
import { loadConstitutionalGovernanceState } from './constitutionalGovernanceStorage';
import {
  classifyConstitutionalState,
  collectConstitutionalAuditTargets,
  computeSystemCoherenceMetrics,
  resolveConstitutionalActions,
} from './systemCoherenceEngine';

function buildFeatureStatuses(
  partial: Omit<ConstitutionalGovernanceSystemCoherenceBundle, 'featureStatuses'>,
): ConstitutionalFeatureStatus[] {
  const s = (
    id: ConstitutionalFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): ConstitutionalFeatureStatus => ({
    id,
    labelJa: CONSTITUTIONAL_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('precedence_tree_cache', true, false, 'cached'),
    s('conflict_arbitrator', partial.conflictPressurePct < 60, partial.conflictPressurePct >= 60, `${partial.conflictPressurePct}%`),
    s('override_registry', true, false, 'registry'),
    s('clamp_priority_table', true, false, 'centralized'),
    s('hierarchy_enforcer', partial.governanceHierarchyIntegrityPct >= 55, false, `${partial.governanceHierarchyIntegrityPct}%`),
    s('coherence_scorer', partial.systemCoherencePct >= 50, false, `${partial.systemCoherencePct}%`),
    s('precedence_arbitration', !partial.precedenceArbitrationActive, partial.precedenceArbitrationActive, 'arbitrate'),
    s('override_freeze', !partial.overrideFreezeActive, partial.overrideFreezeActive, 'freeze'),
    s('hierarchy_rebuild_hint', !partial.hierarchyRebuildSuggestionActive, partial.hierarchyRebuildSuggestionActive, 'rebuild'),
    s('constitutional_emergency', !partial.constitutionalEmergencyActive, partial.constitutionalEmergencyActive, 'emergency'),
    s('fallback_freeze', !partial.fallbackFreezeActive, partial.fallbackFreezeActive, 'fallback'),
    s('downgrade_cascade_audit', partial.conflictPressurePct < 75, partial.conflictPressurePct >= 60, 'cascade'),
    s('recursive_governance_detector', partial.contradictionPressurePct < 65, false, `${partial.contradictionPressurePct}%`),
    s('no_self_amendment', partial.selfAmendmentForbidden, false, 'forbidden'),
    s('no_layer_bypass', partial.layerBypassForbidden, false, 'forbidden'),
    s('constitutional_timeline', partial.constitutionalTimeline.length > 0, false, `${partial.constitutionalTimeline.length}`),
    s('mobile_lite_arbitration', true, false, partial.mobileRuntimeStateJa),
    s('constitutional_dashboard', true, false, CONSTITUTIONAL_UI_LABELS_JA.panelTitle),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
  ];
}

export async function buildConstitutionalGovernanceSystemCoherenceBundle(
  input: BuildConstitutionalGovernanceInput,
): Promise<ConstitutionalGovernanceSystemCoherenceBundle> {
  const persisted = await loadConstitutionalGovernanceState();
  const started = input.auditStartedAt ?? Date.now();
  const metrics = computeSystemCoherenceMetrics(input, persisted);
  const constitutionalState = classifyConstitutionalState(metrics);
  const resolution = resolveConstitutionalActions(constitutionalState, metrics);
  const auditTargets = collectConstitutionalAuditTargets(metrics);

  const snapshotPoint = {
    at: new Date().toISOString(),
    constitutionalHealthPct: metrics.constitutionalHealthPct,
    constitutionalState: resolution.constitutionalState,
    systemStabilityIndexPct: metrics.systemStabilityIndexPct,
  };

  const partial: Omit<ConstitutionalGovernanceSystemCoherenceBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: CONSTITUTIONAL_GOVERNANCE_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    constitutionalGovernanceSupreme: true,
    hiddenAuthorityForbidden: true,
    recursiveGovernanceForbidden: true,
    autonomousConstitutionalRewriteForbidden: true,
    selfAmendmentForbidden: true,
    layerBypassForbidden: true,
    humanIntentOverrideForbidden: true,
    strategyOverrideForbidden: true,
    strategyActionChangeForbidden: true,
    constitutionalState: resolution.constitutionalState,
    constitutionalStateLabelJa: CONSTITUTIONAL_STATE_LABELS_JA[resolution.constitutionalState],
    constitutionalHealthPct: metrics.constitutionalHealthPct,
    systemCoherencePct: metrics.systemCoherencePct,
    conflictPressurePct: metrics.conflictPressurePct,
    clampCollisionRiskPct: metrics.clampCollisionRiskPct,
    governanceHierarchyIntegrityPct: metrics.governanceHierarchyIntegrityPct,
    precedenceIntegrityPct: metrics.precedenceIntegrityPct,
    contradictionPressurePct: metrics.contradictionPressurePct,
    orchestrationConsistencyPct: metrics.orchestrationConsistencyPct,
    systemStabilityIndexPct: metrics.systemStabilityIndexPct,
    unsupportedGovernanceRiskPct: metrics.unsupportedGovernanceRiskPct,
    emergencyPrecedenceIntegrityPct: metrics.emergencyPrecedenceIntegrityPct,
    explanationOnlyMode: resolution.explanationOnlyMode,
    precedenceArbitrationActive: resolution.precedenceArbitrationActive,
    overrideFreezeActive: resolution.overrideFreezeActive,
    hierarchyRebuildSuggestionActive: resolution.hierarchyRebuildSuggestionActive,
    constitutionalEmergencyActive: resolution.constitutionalEmergencyActive,
    fallbackFreezeActive: resolution.fallbackFreezeActive,
    orchestrationBudgetMax: resolution.orchestrationBudgetMax,
    constitutionalSummaryJa: [
      CONSTITUTIONAL_STATE_LABELS_JA[resolution.constitutionalState],
      `health ${metrics.constitutionalHealthPct}% · stability ${metrics.systemStabilityIndexPct}%`,
      resolution.explanationOnlyMode ? '説明のみ' : resolution.constitutionalModeJa,
    ]
      .filter(Boolean)
      .join(' — '),
    constitutionalHealthFormulaJa: CONSTITUTIONAL_HEALTH_FORMULA_JA,
    conflictPressureFormulaJa: CONFLICT_PRESSURE_FORMULA_JA,
    precedenceIntegrityFormulaJa: PRECEDENCE_INTEGRITY_FORMULA_JA,
    systemStabilityIndexFormulaJa: SYSTEM_STABILITY_INDEX_FORMULA_JA,
    constitutionalPrecedenceJa: [...CONSTITUTIONAL_PRECEDENCE_JA],
    constitutionalFlowJa: [...CONSTITUTIONAL_FLOW_JA],
    auditTargets,
    constitutionalTimeline: [...persisted.constitutionalTimeline, snapshotPoint].slice(-48),
    mobileRuntimeStateJa: `lightweight constitutional arbitration · ${Date.now() - started}ms`,
    explainRuleBasisJa:
      '中央憲法層。全 override は憲法経由。下位レイヤーは上位憲法を bypass 不可。strategy変更禁止。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}
