/**
 * Strategic Memory Graph & Temporal Causality — 時系列因果グラフ監査（記憶保存ではない）。
 */
import {
  GRAPH_FLOW_JA,
  GRAPH_HEALTH_FORMULA_JA,
  CAUSAL_CONFIDENCE_FORMULA_JA,
  MEMORY_INTEGRITY_FORMULA_JA,
  HALLUCINATION_PROPAGATION_FORMULA_JA,
  STRATEGIC_MEMORY_GRAPH_REGULATORY_JA,
  STRATEGIC_MEMORY_UI_LABELS_JA,
  STRATEGIC_MEMORY_FEATURE_LABELS,
  GRAPH_STATE_LABELS_JA,
  REAL_TRADING_ENABLED,
  UNCERTAINTY_DISCLAIMER_JA,
} from '../constants/strategicMemoryGraphTemporalCausality';
import type {
  BuildStrategicMemoryGraphInput,
  StrategicMemoryGraphFeatureId,
  StrategicMemoryGraphFeatureStatus,
  StrategicMemoryGraphTemporalCausalityBundle,
} from '../types/strategicMemoryGraphTemporalCausality';
import { loadStrategicMemoryGraphState } from './strategicMemoryGraphStorage';
import {
  captureCausalNodes,
  classifyGraphState,
  computeGraphMetrics,
  estimateCausalEdges,
  resolveGraphActions,
} from './temporalCausalityEngine';

function buildFeatureStatuses(
  partial: Omit<StrategicMemoryGraphTemporalCausalityBundle, 'featureStatuses'>,
): StrategicMemoryGraphFeatureStatus[] {
  const s = (
    id: StrategicMemoryGraphFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): StrategicMemoryGraphFeatureStatus => ({
    id,
    labelJa: STRATEGIC_MEMORY_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('event_snapshot_collector', true, false, `${partial.causalNodes.length} nodes`),
    s('temporal_ordering', partial.timelineContinuityPct >= 55, false, `${partial.timelineContinuityPct}%`),
    s('causal_edge_estimator', partial.causalEdges.length > 0, false, `${partial.causalEdges.length} edges`),
    s('contradiction_detector', partial.contradictionDensityPct < 65, false, `${partial.contradictionDensityPct}%`),
    s('confidence_decay_tracker', true, false, 'decay'),
    s('unsupported_causality_suppressor', partial.unsupportedCausalityPct < 60, false, `${partial.unsupportedCausalityPct}%`),
    s('governance_validation_gate', true, false, 'gov'),
    s('graph_timeline', partial.graphTimeline.length > 0, false, `${partial.graphTimeline.length}`),
    s('correlation_causation_separator', true, false, 'hypothesis'),
    s('hallucination_propagation_guard', partial.hallucinationPropagationPct < 55, false, `${partial.hallucinationPropagationPct}%`),
    s('recursive_loop_pruner', !partial.edgePruningActive, partial.edgePruningActive, 'prune'),
    s('timeline_rebuild', !partial.timelineRebuildActive, partial.timelineRebuildActive, 'rebuild'),
    s('memory_simplification', partial.graphState !== 'GRAPH_FRAGMENTED', partial.graphState === 'GRAPH_FRAGMENTED', 'simplify'),
    s('causal_freeze', !partial.causalFreezeActive, partial.causalFreezeActive, 'freeze'),
    s('consensus_rebuild_request', !partial.consensusRebuildRequested, partial.consensusRebuildRequested, 'rebuild'),
    s('mobile_lite_traversal', true, false, partial.mobileRuntimeStateJa),
    s('compressed_temporal_edges', true, false, 'compressed'),
    s('deferred_causal_reconstruction', true, false, 'deferred'),
    s('background_graph_pruning', true, false, 'batch'),
    s('strategic_memory_dashboard', true, false, STRATEGIC_MEMORY_UI_LABELS_JA.panelTitle),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
    s('no_hidden_learning', partial.hiddenLearningForbidden, false, 'no hidden'),
    s('hypothesis_only_causality', partial.causalHypothesisOnly, false, 'hypothesis'),
  ];
}

export async function buildStrategicMemoryGraphTemporalCausalityBundle(
  input: BuildStrategicMemoryGraphInput,
): Promise<StrategicMemoryGraphTemporalCausalityBundle> {
  const persisted = await loadStrategicMemoryGraphState();
  const started = input.auditStartedAt ?? Date.now();
  const nodes = captureCausalNodes(input);
  const edges = estimateCausalEdges(nodes, input);
  const metrics = computeGraphMetrics(input, nodes, edges);

  const governanceBlocks =
    input.systemic?.systemicEmergencySafeMode === true ||
    input.epistemic?.explanationOnlyMode === true ||
    input.governance?.finalDecision === 'avoid';

  const graphState = classifyGraphState(metrics, governanceBlocks);
  const resolution = resolveGraphActions(graphState, metrics);

  const snapshotPoint = {
    at: new Date().toISOString(),
    graphHealthPct: metrics.graphHealthPct,
    graphState: resolution.graphState,
    edgeCount: edges.length,
  };

  const partial: Omit<StrategicMemoryGraphTemporalCausalityBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: STRATEGIC_MEMORY_GRAPH_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    selfModifyingForbidden: true,
    hiddenLearningForbidden: true,
    causalHypothesisOnly: true,
    graphState: resolution.graphState,
    graphStateLabelJa: GRAPH_STATE_LABELS_JA[resolution.graphState],
    graphHealthPct: metrics.graphHealthPct,
    causalConfidencePct: metrics.causalConfidencePct,
    timelineContinuityPct: metrics.timelineContinuityPct,
    contradictionDensityPct: metrics.contradictionPct,
    recursiveLoopRiskPct: metrics.recursiveLoopsPct,
    hallucinationPropagationPct: metrics.hallucinationPropagationPct,
    memoryIntegrityPct: metrics.memoryIntegrityPct,
    unsupportedCausalityPct: metrics.unsupportedCausalityPct,
    edgeDensityPct: metrics.edgeDensityPct,
    causalDriftPct: metrics.causalDriftPct,
    temporalFragmentationPct: metrics.fragmentationPct,
    explanationOnlyMode: resolution.explanationOnlyMode,
    causalFreezeActive: resolution.causalFreezeActive,
    consensusRebuildRequested: resolution.consensusRebuildRequested,
    edgePruningActive: resolution.edgePruningActive,
    timelineRebuildActive: resolution.timelineRebuildActive,
    orchestrationBudgetMax: resolution.orchestrationBudgetMax,
    graphSummaryJa: [
      GRAPH_STATE_LABELS_JA[resolution.graphState],
      `health ${metrics.graphHealthPct}% · edges ${edges.length}（因果=仮説）`,
      resolution.causalFreezeActive ? '因果 freeze' : null,
    ]
      .filter(Boolean)
      .join(' — '),
    uncertaintyDisclaimerJa: UNCERTAINTY_DISCLAIMER_JA,
    graphHealthFormulaJa: GRAPH_HEALTH_FORMULA_JA,
    causalConfidenceFormulaJa: CAUSAL_CONFIDENCE_FORMULA_JA,
    memoryIntegrityFormulaJa: MEMORY_INTEGRITY_FORMULA_JA,
    hallucinationPropagationFormulaJa: HALLUCINATION_PROPAGATION_FORMULA_JA,
    graphFlowJa: [...GRAPH_FLOW_JA],
    causalNodes: nodes,
    causalEdges: edges,
    graphTimeline: [...persisted.graphTimeline, snapshotPoint].slice(-24),
    mobileRuntimeStateJa: `lightweight snapshot · ${Date.now() - started}ms`,
    explainRuleBasisJa:
      '時系列因果グラフ監査。相関と因果を区別。因果は仮説。自己改変・hidden learning禁止。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}
