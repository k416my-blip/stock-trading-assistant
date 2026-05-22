/**
 * Cognitive Resource Economy & Attention Allocation — 有限リソース下の思考配分。
 */
import {
  ATTENTION_EFFICIENCY_FORMULA_JA,
  COMPUTE_WASTE_FORMULA_JA,
  COGNITIVE_RESOURCE_ECONOMY_REGULATORY_JA,
  ECONOMY_FLOW_JA,
  MOBILE_PRESSURE_FORMULA_JA,
  REAL_TRADING_ENABLED,
  RECURSIVE_PRESSURE_FORMULA_JA,
  RESOURCE_ECONOMY_FEATURE_LABELS,
  RESOURCE_ECONOMY_UI_LABELS_JA,
  RESOURCE_HEALTH_FORMULA_JA,
  RESOURCE_STATE_LABELS_JA,
} from '../constants/cognitiveResourceEconomyAttentionAllocation';
import type {
  BuildCognitiveResourceEconomyInput,
  CognitiveResourceEconomyAttentionAllocationBundle,
  CognitiveResourceEconomyFeatureId,
  CognitiveResourceEconomyFeatureStatus,
} from '../types/cognitiveResourceEconomyAttentionAllocation';
import { loadCognitiveResourceEconomyState } from './cognitiveResourceEconomyStorage';
import {
  classifyResourceState,
  collectComputeMetrics,
  computeEconomyMetrics,
  estimateLayerUtility,
  resolveEconomyActions,
} from './attentionAllocationEngine';

function buildFeatureStatuses(
  partial: Omit<CognitiveResourceEconomyAttentionAllocationBundle, 'featureStatuses'>,
): CognitiveResourceEconomyFeatureStatus[] {
  const s = (
    id: CognitiveResourceEconomyFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): CognitiveResourceEconomyFeatureStatus => ({
    id,
    labelJa: RESOURCE_ECONOMY_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('compute_metric_collector', true, false, `${partial.auditTargets.length} targets`),
    s('layer_utility_estimator', partial.layerUtilityRanking.length > 0, false, 'ranked'),
    s('attention_prioritizer', partial.attentionEfficiencyPct >= 45, false, `${partial.attentionEfficiencyPct}%`),
    s('recursion_suppressor', !partial.recursiveThrottleActive, partial.recursiveThrottleActive, 'throttle'),
    s('speculative_compute_clamp', !partial.speculativeComputeClampActive, partial.speculativeComputeClampActive, 'clamp'),
    s('mobile_budget_allocator', !partial.mobileHardClampActive, partial.mobileHardClampActive, 'mobile'),
    s('orchestration_validator', true, false, `budget ${partial.orchestrationBudgetMax}`),
    s('economy_timeline', partial.economyTimeline.length > 0, false, `${partial.economyTimeline.length}`),
    s('reflection_fatigue_guard', partial.reflectionFatiguePct < 65, false, `${partial.reflectionFatiguePct}%`),
    s('hallucination_compute_guard', partial.computePressurePct < 70, false, 'guard'),
    s('background_load_batch', true, false, partial.mobileRuntimeStateJa),
    s('deep_reflection_defer', !partial.deepReflectionSuppressed, partial.deepReflectionSuppressed, 'defer'),
    s('attention_narrowing', !partial.attentionNarrowingActive, partial.attentionNarrowingActive, 'narrow'),
    s('priority_rebuild', !partial.priorityRebuildActive, partial.priorityRebuildActive, 'rebuild'),
    s('recursive_throttle', !partial.recursiveThrottleActive, partial.recursiveThrottleActive, 'recursive'),
    s('speculative_freeze', !partial.speculativeComputeClampActive, partial.speculativeComputeClampActive, 'freeze'),
    s('mobile_hard_clamp', !partial.mobileHardClampActive, partial.mobileHardClampActive, 'hard clamp'),
    s('resource_economy_dashboard', true, false, RESOURCE_ECONOMY_UI_LABELS_JA.panelTitle),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
    s('no_hidden_compute', partial.hiddenComputeForbidden, false, 'no hidden'),
  ];
}

export async function buildCognitiveResourceEconomyAttentionAllocationBundle(
  input: BuildCognitiveResourceEconomyInput,
): Promise<CognitiveResourceEconomyAttentionAllocationBundle> {
  const persisted = await loadCognitiveResourceEconomyState();
  const started = input.auditStartedAt ?? Date.now();
  const audits = collectComputeMetrics(input);
  const layerUtilityRanking = estimateLayerUtility(input);
  const metrics = computeEconomyMetrics(input, audits);

  const governanceBlocks =
    input.systemic?.systemicEmergencySafeMode === true ||
    input.governance?.finalDecision === 'avoid' ||
    input.epistemic?.explanationOnlyMode === true;

  const resourceState = classifyResourceState(metrics, governanceBlocks);
  const resolution = resolveEconomyActions(resourceState, metrics, input);

  const snapshotPoint = {
    at: new Date().toISOString(),
    resourceHealthPct: metrics.resourceHealthPct,
    resourceState: resolution.resourceState,
    attentionEfficiencyPct: metrics.attentionEfficiencyPct,
  };

  const partial: Omit<CognitiveResourceEconomyAttentionAllocationBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: COGNITIVE_RESOURCE_ECONOMY_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    hiddenComputeForbidden: true,
    autonomousEscalationForbidden: true,
    resourceState: resolution.resourceState,
    resourceStateLabelJa: RESOURCE_STATE_LABELS_JA[resolution.resourceState],
    resourceHealthPct: metrics.resourceHealthPct,
    attentionEfficiencyPct: metrics.attentionEfficiencyPct,
    computePressurePct: metrics.computePressurePct,
    recursivePressurePct: metrics.recursivePressurePct,
    orchestrationSaturationPct: metrics.orchestrationSaturationPct,
    speculativeWastePct: metrics.speculativeWastePct,
    reflectionFatiguePct: metrics.reflectionFatiguePct,
    batteryPressurePct: metrics.batteryPressurePct,
    latencyInflationPct: metrics.latencyInflationPct,
    computeWastePct: metrics.computeWastePct,
    mobilePressurePct: metrics.mobilePressurePct,
    explanationOnlyMode: resolution.explanationOnlyMode,
    attentionNarrowingActive: resolution.attentionNarrowingActive,
    priorityRebuildActive: resolution.priorityRebuildActive,
    deepReflectionSuppressed: resolution.deepReflectionSuppressed,
    recursiveThrottleActive: resolution.recursiveThrottleActive,
    speculativeComputeClampActive: resolution.speculativeComputeClampActive,
    mobileHardClampActive: resolution.mobileHardClampActive,
    orchestrationBudgetMax: resolution.orchestrationBudgetMax,
    economySummaryJa: [
      RESOURCE_STATE_LABELS_JA[resolution.resourceState],
      `health ${metrics.resourceHealthPct}% · attention ${metrics.attentionEfficiencyPct}%`,
      resolution.recursiveThrottleActive ? '再帰 throttle' : null,
      resolution.attentionNarrowingActive ? 'attention 集中' : null,
    ]
      .filter(Boolean)
      .join(' — '),
    resourceHealthFormulaJa: RESOURCE_HEALTH_FORMULA_JA,
    attentionEfficiencyFormulaJa: ATTENTION_EFFICIENCY_FORMULA_JA,
    recursivePressureFormulaJa: RECURSIVE_PRESSURE_FORMULA_JA,
    computeWasteFormulaJa: COMPUTE_WASTE_FORMULA_JA,
    mobilePressureFormulaJa: MOBILE_PRESSURE_FORMULA_JA,
    economyFlowJa: [...ECONOMY_FLOW_JA],
    auditTargets: audits,
    layerUtilityRanking,
    economyTimeline: [...persisted.economyTimeline, snapshotPoint].slice(-24),
    mobileRuntimeStateJa: `hard mobile clamp · lightweight attention · ${Date.now() - started}ms`,
    explainRuleBasisJa:
      '認知リソース経済。高コスト≠高品質。重要思考にのみリソース集中。hidden compute・runaway recursion禁止。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}
