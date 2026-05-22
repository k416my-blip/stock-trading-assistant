/**
 * Unified Cognitive State & Executive Awareness — 統合監査（意思決定主体ではない）。
 */
import {
  EXECUTIVE_FLOW_JA,
  EXECUTIVE_FRAGMENTATION_FORMULA_JA,
  EXECUTIVE_HEALTH_FORMULA_JA,
  EXECUTIVE_STATE_LABELS_JA,
  GLOBAL_COHERENCE_FORMULA_JA,
  REAL_TRADING_ENABLED,
  RECURSIVE_DANGER_FORMULA_JA,
  SAFE_REASONING_DEPTH_FORMULA_JA,
  UNIFIED_COGNITIVE_FEATURE_LABELS,
  UNIFIED_COGNITIVE_STATE_REGULATORY_JA,
  UNIFIED_COGNITIVE_UI_LABELS_JA,
} from '../constants/unifiedCognitiveStateExecutiveAwareness';
import type {
  BuildUnifiedCognitiveStateInput,
  UnifiedCognitiveFeatureId,
  UnifiedCognitiveFeatureStatus,
  UnifiedCognitiveStateExecutiveAwarenessBundle,
} from '../types/unifiedCognitiveStateExecutiveAwareness';
import { loadUnifiedCognitiveState } from './unifiedCognitiveStateStorage';
import {
  classifyExecutiveState,
  collectLayerStates,
  computeExecutiveMetrics,
  resolveExecutiveActions,
} from './executiveAwarenessEngine';

function buildFeatureStatuses(
  partial: Omit<UnifiedCognitiveStateExecutiveAwarenessBundle, 'featureStatuses'>,
): UnifiedCognitiveFeatureStatus[] {
  const s = (
    id: UnifiedCognitiveFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): UnifiedCognitiveFeatureStatus => ({
    id,
    labelJa: UNIFIED_COGNITIVE_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('layer_state_collector', partial.layerStates.length > 0, false, `${partial.layerStates.length}`),
    s('integrity_normalizer', true, false, 'normalized'),
    s('executive_coherence_calculator', partial.executiveHealthPct >= 55, false, `${partial.executiveHealthPct}%`),
    s('fragmentation_detector', partial.fragmentationScorePct < 65, false, `${partial.fragmentationScorePct}%`),
    s('recursive_instability_detector', partial.recursiveDangerPct < 70, false, `${partial.recursiveDangerPct}%`),
    s('safe_reasoning_depth_gate', partial.safeReasoningDepthPct >= 40, false, `${partial.safeReasoningDepthPct}%`),
    s('orchestration_mode_selector', true, false, partial.orchestrationModeJa),
    s('executive_timeline', partial.executiveTimeline.length > 0, false, `${partial.executiveTimeline.length}`),
    s('governance_priority_guard', true, false, 'gov highest'),
    s('no_hidden_cognition', partial.hiddenCognitionForbidden, false, 'no hidden'),
    s('no_self_direction', partial.autonomousSelfDirectionForbidden, false, 'no self-direction'),
    s('prediction_throttle', !partial.predictionThrottleActive, partial.predictionThrottleActive, 'throttle'),
    s('recursive_shutdown', !partial.recursiveSuppressionActive, partial.recursiveSuppressionActive, 'shutdown'),
    s('explanation_only_fallback', !partial.explanationOnlyMode, partial.explanationOnlyMode, 'fallback'),
    s('deep_reasoning_freeze', !partial.deepReasoningFreezeActive, partial.deepReasoningFreezeActive, 'freeze'),
    s('mobile_lite_aggregation', true, false, partial.mobileRuntimeStateJa),
    s('executive_cache_reuse', true, false, 'cache'),
    s('unified_cognitive_dashboard', true, false, UNIFIED_COGNITIVE_UI_LABELS_JA.panelTitle),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
  ];
}

export async function buildUnifiedCognitiveStateExecutiveAwarenessBundle(
  input: BuildUnifiedCognitiveStateInput,
): Promise<UnifiedCognitiveStateExecutiveAwarenessBundle> {
  const persisted = await loadUnifiedCognitiveState();
  const started = input.auditStartedAt ?? Date.now();
  const layerStates = collectLayerStates(input);
  const metrics = computeExecutiveMetrics(input, layerStates);

  const governanceBlocks =
    input.systemic?.systemicEmergencySafeMode === true ||
    input.governance?.finalDecision === 'avoid' ||
    input.epistemic?.explanationOnlyMode === true;

  const executiveState = classifyExecutiveState(metrics, governanceBlocks);
  const resolution = resolveExecutiveActions(executiveState, metrics);

  const snapshotPoint = {
    at: new Date().toISOString(),
    executiveHealthPct: metrics.executiveHealthPct,
    executiveState: resolution.executiveState,
    safeReasoningDepthPct: metrics.safeReasoningDepthPct,
  };

  const partial: Omit<UnifiedCognitiveStateExecutiveAwarenessBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: UNIFIED_COGNITIVE_STATE_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    hiddenCognitionForbidden: true,
    autonomousSelfDirectionForbidden: true,
    strategyActionChangeForbidden: true,
    executiveState: resolution.executiveState,
    executiveStateLabelJa: EXECUTIVE_STATE_LABELS_JA[resolution.executiveState],
    executiveHealthPct: metrics.executiveHealthPct,
    globalCoherencePct: metrics.globalCoherencePct,
    safeReasoningDepthPct: metrics.safeReasoningDepthPct,
    recursiveDangerPct: metrics.recursiveDangerPct,
    orchestrationSaturationPct: metrics.orchestrationSaturationPct,
    hallucinationRiskPct: metrics.hallucinationRiskPct,
    trustHealthPct: metrics.trustHealthPct,
    contradictionPressurePct: metrics.contradictionPressurePct,
    fragmentationScorePct: metrics.fragmentationScorePct,
    reasoningModeJa: resolution.reasoningModeJa,
    orchestrationModeJa: resolution.orchestrationModeJa,
    explanationOnlyMode: resolution.explanationOnlyMode,
    predictionThrottleActive: resolution.predictionThrottleActive,
    recursiveSuppressionActive: resolution.recursiveSuppressionActive,
    deepReasoningFreezeActive: resolution.deepReasoningFreezeActive,
    priorityCoherenceRebuildActive: resolution.priorityCoherenceRebuildActive,
    reduceReasoningDepthActive: resolution.reduceReasoningDepthActive,
    orchestrationBudgetMax: resolution.orchestrationBudgetMax,
    executiveSummaryJa: [
      EXECUTIVE_STATE_LABELS_JA[resolution.executiveState],
      `health ${metrics.executiveHealthPct}% · depth ${metrics.safeReasoningDepthPct}%`,
      resolution.explanationOnlyMode ? '説明のみ' : null,
    ]
      .filter(Boolean)
      .join(' — '),
    executiveHealthFormulaJa: EXECUTIVE_HEALTH_FORMULA_JA,
    globalCoherenceFormulaJa: GLOBAL_COHERENCE_FORMULA_JA,
    safeReasoningDepthFormulaJa: SAFE_REASONING_DEPTH_FORMULA_JA,
    recursiveDangerFormulaJa: RECURSIVE_DANGER_FORMULA_JA,
    executiveFlowJa: [...EXECUTIVE_FLOW_JA],
    layerStates,
    executiveTimeline: [...persisted.executiveTimeline, snapshotPoint].slice(-24),
    mobileRuntimeStateJa: `lightweight executive aggregation · ${Date.now() - started}ms`,
    explainRuleBasisJa:
      '統合認知状態監査。Executiveは意思決定主体ではない。安全整合・推論深度制御のみ。strategy変更禁止。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}
