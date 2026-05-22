/**
 * Self-Evolving Architecture & Reflective Refactor — 構造監査・提案のみ（自己改造AIではない）。
 */
import {
  ARCHITECTURE_FLOW_JA,
  ARCHITECTURE_HEALTH_FORMULA_JA,
  AUDIT_TARGET_LABELS_JA,
  MOBILE_PRESSURE_FORMULA_JA,
  REAL_TRADING_ENABLED,
  RECURSIVE_INFLATION_FORMULA_JA,
  REDUNDANCY_FORMULA_JA,
  SELF_ARCHITECTURE_FEATURE_LABELS,
  SELF_ARCHITECTURE_REGULATORY_JA,
  SELF_ARCHITECTURE_UI_LABELS_JA,
  STRUCTURE_STATE_LABELS_JA,
  UNCERTAINTY_DISCLAIMER_JA,
} from '../constants/selfEvolvingArchitectureReflectiveRefactor';
import type {
  ArchitectureAuditRow,
  ArchitectureAuditTargetId,
  BuildSelfEvolvingArchitectureInput,
  SelfArchitectureFeatureId,
  SelfArchitectureFeatureStatus,
  SelfEvolvingArchitectureReflectiveRefactorBundle,
} from '../types/selfEvolvingArchitectureReflectiveRefactor';
import { loadSelfArchitectureState } from './selfArchitectureAuditStorage';
import {
  classifyArchitectureState,
  computeArchitectureMetrics,
  generateOptimizationProposals,
  resolveArchitectureActions,
} from './reflectiveRefactorEngine';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildAuditTargets(
  metrics: ReturnType<typeof computeArchitectureMetrics>,
): ArchitectureAuditRow[] {
  const row = (
    id: ArchitectureAuditTargetId,
    score: number,
    detail: string,
  ): ArchitectureAuditRow => ({
    id,
    labelJa: AUDIT_TARGET_LABELS_JA[id],
    scorePct: clamp(100 - score),
    statusJa: score < 35 ? 'ok' : score < 60 ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    row('layerRedundancy', metrics.redundancyPct, `${metrics.redundancyPct}%`),
    row('orchestrationComplexity', metrics.orchestrationComplexityPct, 'complexity'),
    row('semanticOverlap', metrics.semanticOverlapPct, 'overlap'),
    row('unusedGovernancePaths', metrics.redundancyPct * 0.5, 'governance paths'),
    row('staleRecoveryPaths', metrics.stalePipelinesPct, 'recovery'),
    row('recursiveDepthInflation', metrics.recursiveInflationPct, 'recursive'),
    row('dashboardBloat', metrics.fragmentationPct * 0.6, 'dashboard'),
    row('memoryFragmentation', metrics.fragmentationPct, 'memory'),
    row('reflectionLoopDensity', metrics.reflectionDensityPct, 'reflection'),
    row('orchestrationLatency', metrics.latencyPenaltyPct, 'latency'),
    row('mobileBudgetPressure', metrics.mobilePressurePct, 'mobile'),
    row('adaptiveConflictDensity', metrics.adaptiveConflictDensityPct, 'conflict'),
  ];
}

function buildFeatureStatuses(
  partial: Omit<SelfEvolvingArchitectureReflectiveRefactorBundle, 'featureStatuses'>,
): SelfArchitectureFeatureStatus[] {
  const s = (
    id: SelfArchitectureFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): SelfArchitectureFeatureStatus => ({
    id,
    labelJa: SELF_ARCHITECTURE_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('architecture_metrics_collector', true, false, `${partial.architectureHealthPct}%`),
    s('overlap_detector', partial.semanticOverlapPct < 50, false, `${partial.semanticOverlapPct}%`),
    s('fragmentation_detector', partial.fragmentationPct < 55, false, `${partial.fragmentationPct}%`),
    s('recursive_inflation_scanner', partial.recursiveInflationPct < 75, partial.recursiveInflationPct >= 60, `${partial.recursiveInflationPct}%`),
    s('mobile_pressure_estimator', partial.mobilePressurePct < 80, false, `${partial.mobilePressurePct}%`),
    s('optimization_proposal_generator', partial.optimizationProposals.length > 0, false, `${partial.optimizationProposals.length}`),
    s('governance_validation_gate', !partial.governanceApprovalPending, partial.governanceApprovalPending, partial.governanceApprovalStateJa),
    s('orchestration_review_handoff', true, false, partial.orchestrationReviewJa),
    s('proposal_only_guard', partial.proposalOnlyMode, false, 'proposal-only'),
    s('no_auto_refactor_guard', partial.automaticRefactorForbidden, false, 'no refactor'),
    s('no_runtime_mutation_guard', partial.runtimeMutationForbidden, false, 'no mutation'),
    s('sandbox_reflective_optimizer', partial.sandboxReflectiveOnly, false, 'sandbox'),
    s('architecture_timeline', partial.architectureTimeline.length > 0, false, `${partial.architectureTimeline.length}`),
    s('stale_pipeline_detector', partial.stalePipelinesPct < 50, false, `${partial.stalePipelinesPct}%`),
    s('dashboard_bloat_meter', true, false, 'bloat'),
    s('memory_fragmentation_probe', true, false, 'memory'),
    s('reflection_density_meter', partial.reflectionDensityPct < 60, false, `${partial.reflectionDensityPct}%`),
    s('latency_penalty_tracker', partial.latencyPenaltyPct < 50, false, `${partial.latencyPenaltyPct}%`),
    s('governance_approval_tracker', !partial.governanceApprovalPending, partial.governanceApprovalPending, partial.governanceApprovalStateJa),
    s('unsupported_structure_guard', partial.unsupportedStructureRiskPct < 70, partial.unsupportedStructureRiskPct >= 50, `${partial.unsupportedStructureRiskPct}%`),
    s('mobile_lite_scan', true, false, partial.mobileRuntimeStateJa),
    s('lazy_dashboard_hydration_hint', true, false, 'lazy'),
    s('background_proposal_batch', true, false, 'batch'),
    s('self_architecture_dashboard', true, false, SELF_ARCHITECTURE_UI_LABELS_JA.panelTitle),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
    s('structure_audit_only', true, false, 'audit only'),
  ];
}

export async function buildSelfEvolvingArchitectureReflectiveRefactorBundle(
  input: BuildSelfEvolvingArchitectureInput,
): Promise<SelfEvolvingArchitectureReflectiveRefactorBundle> {
  const persisted = await loadSelfArchitectureState();
  const started = input.auditStartedAt ?? Date.now();
  const metrics = computeArchitectureMetrics(input);

  const governanceBlocks =
    input.systemic?.systemicEmergencySafeMode === true ||
    input.metaReliability?.governancePriorityOnly === true ||
    input.governance?.finalDecision === 'avoid';

  const structureState = classifyArchitectureState(metrics, governanceBlocks);
  const proposals = generateOptimizationProposals(structureState, metrics);
  const resolution = resolveArchitectureActions(
    structureState,
    metrics,
    proposals.length,
  );

  const snapshotPoint = {
    at: new Date().toISOString(),
    architectureHealthPct: metrics.architectureHealthPct,
    structureState: resolution.structureState,
    redundancyPct: metrics.redundancyPct,
    recursiveInflationPct: metrics.recursiveInflationPct,
  };

  const partial: Omit<SelfEvolvingArchitectureReflectiveRefactorBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: SELF_ARCHITECTURE_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    automaticRefactorForbidden: true,
    runtimeMutationForbidden: true,
    proposalOnlyMode: true,
    sandboxReflectiveOnly: true,
    structureState: resolution.structureState,
    structureStateLabelJa: STRUCTURE_STATE_LABELS_JA[resolution.structureState],
    architectureHealthPct: metrics.architectureHealthPct,
    redundancyPct: metrics.redundancyPct,
    fragmentationPct: metrics.fragmentationPct,
    recursiveInflationPct: metrics.recursiveInflationPct,
    orchestrationComplexityPct: metrics.orchestrationComplexityPct,
    latencyPenaltyPct: metrics.latencyPenaltyPct,
    mobilePressurePct: metrics.mobilePressurePct,
    reflectionDensityPct: metrics.reflectionDensityPct,
    stalePipelinesPct: metrics.stalePipelinesPct,
    semanticOverlapPct: metrics.semanticOverlapPct,
    governanceApprovalPending: resolution.governanceApprovalPending,
    governanceApprovalStateJa: resolution.governanceApprovalStateJa,
    unsupportedStructureRiskPct: metrics.unsupportedStructureRiskPct,
    orchestrationBudgetMax: resolution.orchestrationBudgetMax,
    orchestrationReviewJa: resolution.orchestrationReviewJa,
    optimizationProposals: proposals,
    architectureSummaryJa: [
      STRUCTURE_STATE_LABELS_JA[resolution.structureState],
      `health ${metrics.architectureHealthPct}% · proposals ${proposals.length}`,
      resolution.governanceApprovalPending ? '（governance 承認待ち — 自動適用なし）' : null,
    ]
      .filter(Boolean)
      .join(' — '),
    uncertaintyDisclaimerJa: UNCERTAINTY_DISCLAIMER_JA,
    architectureHealthFormulaJa: ARCHITECTURE_HEALTH_FORMULA_JA,
    recursiveInflationFormulaJa: RECURSIVE_INFLATION_FORMULA_JA,
    mobilePressureFormulaJa: MOBILE_PRESSURE_FORMULA_JA,
    redundancyFormulaJa: REDUNDANCY_FORMULA_JA,
    architectureFlowJa: [...ARCHITECTURE_FLOW_JA],
    auditTargets: buildAuditTargets(metrics),
    architectureTimeline: [...persisted.architectureTimeline, snapshotPoint].slice(-24),
    mobileRuntimeStateJa: `lightweight scan · snapshot audit · ${Date.now() - started}ms`,
    explainRuleBasisJa:
      '安全な自己構造監査。提案のみ・sandbox・自動リファクタ/自己書き換え/ランタイム変異禁止。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}
