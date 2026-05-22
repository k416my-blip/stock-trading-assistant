/**
 * Dynamic Layer Orchestration & Mobile Runtime Optimization — metrics bundle.
 */
import {
  COMPUTE_BUDGET_FORMULA_JA,
  DEPENDENCY_RECOMPUTE_FLOW_JA,
  MOBILE_OPTIMIZATION_JA,
  ORCHESTRATION_FEATURE_LABELS,
  ORCHESTRATION_FLOW_JA,
  ORCHESTRATION_REGULATORY_JA,
  PRIORITY_FORMULA_JA,
  REAL_TRADING_ENABLED,
  SLEEP_WAKE_FORMULA_JA,
} from '../constants/dynamicLayerOrchestrationMobileRuntimeOptimization';
import type {
  BuildDynamicOrchestrationInput,
  DynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
  DynamicOrchestrationFeatureId,
  DynamicOrchestrationFeatureStatus,
  OrchestratedLayerId,
} from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import {
  appendOrchestrationTimeline,
  loadDynamicOrchestrationState,
} from './dynamicLayerOrchestrationMobileRuntimeOptimizationStorage';
import {
  getOrchestrationCyclePlan,
  getOrchestrationRefreshLatencyMs,
  getOrchestrationUserExplanationsJa,
} from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildFeatureStatuses(
  partial: Omit<DynamicLayerOrchestrationMobileRuntimeOptimizationBundle, 'featureStatuses'>,
): DynamicOrchestrationFeatureStatus[] {
  const s = (
    id: DynamicOrchestrationFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): DynamicOrchestrationFeatureStatus => ({
    id,
    labelJa: ORCHESTRATION_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('dynamic_layer_scheduler', partial.skippedLayerCount < 8, partial.skippedLayerCount >= 12, `${partial.skippedLayerCount} skipped`),
    s('event_based_activation', true, false, 'event-driven'),
    s('layer_priority_queue', partial.orchestrationHealthScore >= 50, false, 'priority'),
    s('mobile_runtime_budget', partial.computeBudgetUsed <= partial.computeBudgetMax, partial.computeBudgetUsed > partial.computeBudgetMax, `${partial.computeBudgetUsed}/${partial.computeBudgetMax}`),
    s('thermal_battery_guard', !partial.mobileOptimizationMode || partial.computeBudgetRemaining > 10, partial.computeBudgetRemaining <= 5, 'battery'),
    s('progressive_hydration', true, partial.progressiveHydration === 'summary', partial.progressiveHydration),
    s('lazy_dashboard_loading', partial.deferredLayers.length < 6, partial.deferredLayers.length >= 8, `${partial.deferredLayers.length}`),
    s('stale_layer_reuse', partial.sleepingLayers.length > 0, false, 'stale'),
    s('dependency_recompute', true, false, 'deps'),
    s('layer_sleep_wake', partial.activeLayers.length > 0, false, `${partial.activeLayers.length} active`),
    s('compute_cost_score', partial.computeBudgetRemaining >= 15, partial.computeBudgetRemaining < 10, `${partial.computeBudgetRemaining}`),
    s('emergency_override', !partial.emergencyOverrideActive, partial.emergencyOverrideActive, 'override'),
    s('background_pause', partial.blockedLayers.length === 0, partial.blockedLayers.length > 0, `${partial.blockedLayers.length}`),
    s('queue_backpressure', partial.eventQueueSize < 20, partial.eventQueueSize >= 30, `${partial.eventQueueSize}`),
    s('render_budget_integration', true, false, 'render'),
    s('memory_pressure_guard', partial.memoryPressurePct < 70, partial.memoryPressurePct >= 70, `${partial.memoryPressurePct}%`),
    s('offline_slow_api_mode', true, false, 'offline'),
    s('deterministic_order', true, false, 'order'),
    s('orchestration_dashboard', true, false, 'panel'),
    s('ai_context_compression', true, false, 'compress'),
    s('layer_result_cache', true, false, 'cache'),
    s('selective_invalidation', true, false, 'invalidate'),
    s('user_visible_explanation', partial.userExplanationJa.length > 0, false, 'explain'),
    s('real_order_safety', partial.realTradingEnabled === false, false, 'paper'),
    s('dependency_graph_resolver', true, false, 'graph'),
    s('thaw_defer_coordinator', true, false, 'thaw'),
    s('cognitive_chain_scheduler', true, false, 'cognitive'),
    s('dashboard_sampling', partial.progressiveHydration === 'summary', false, 'sample'),
    s('refresh_latency_tracker', partial.refreshLatencyMs < 3000, partial.refreshLatencyMs >= 5000, `${partial.refreshLatencyMs}ms`),
    s('mobile_redmi_guard', partial.mobileOptimizationMode, false, 'mobile'),
    s('conservative_execution_gate', true, false, 'gate'),
  ];
}

export async function buildDynamicLayerOrchestrationMobileRuntimeOptimizationBundle(
  input: BuildDynamicOrchestrationInput,
): Promise<DynamicLayerOrchestrationMobileRuntimeOptimizationBundle> {
  const persisted = await loadDynamicOrchestrationState();
  const plan = getOrchestrationCyclePlan();
  const latencyMs = getOrchestrationRefreshLatencyMs() || Date.now() - input.refreshStartedAt;

  const schedule = plan?.schedule ?? [];
  const activeLayers = schedule.filter((e) => e.willRun).map((e) => e.id);
  const sleepingLayers = schedule.filter((e) => e.state === 'sleeping').map((e) => e.id);
  const deferredLayers = schedule.filter((e) => e.state === 'deferred').map((e) => e.id);
  const blockedLayers = schedule.filter((e) => e.state === 'blocked').map((e) => e.id);
  const skippedLayers = plan?.skipped ?? [];

  const budgetMax = plan?.budgetMax ?? 100;
  const budgetUsed = plan?.budgetUsed ?? 0;
  const budgetRemaining = Math.max(0, budgetMax - budgetUsed);

  const memoryPressurePct = clamp(
    (input.memoryPressure ? 45 : 0) +
      (input.reactive?.queuedEvents.length ?? 0) * 2 +
      (input.resource?.memoryPressurePct ?? 0) * 0.4,
  );

  const eventQueueSize =
    (input.reactive?.queuedEvents.length ?? 0) + (input.reactive?.offlineQueueSize ?? 0);

  let health = clamp(
    100 -
      skippedLayers.length * 3 -
      (budgetUsed > budgetMax ? 15 : 0) -
      memoryPressurePct * 0.2 -
      (latencyMs > 4000 ? 12 : 0),
  );
  if (input.emergencyOverride) health = clamp(health - 5);

  const userExplanationJa =
    getOrchestrationUserExplanationsJa() ||
    (input.mobileOptimizationMode
      ? 'モバイル最適化モード: 必要レイヤーのみ実行中'
      : '標準オーケストレーション');

  await appendOrchestrationTimeline({
    at: new Date().toISOString(),
    computeUsed: budgetUsed,
    skipped: skippedLayers.length,
    latencyMs,
  });

  const partial: Omit<DynamicLayerOrchestrationMobileRuntimeOptimizationBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: ORCHESTRATION_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    orchestrationHealthScore: health,
    healthLabelJa: health >= 75 ? '軽量安定' : health >= 50 ? '制御中' : '負荷高',
    computeBudgetMax: budgetMax,
    computeBudgetUsed: budgetUsed,
    computeBudgetRemaining: budgetRemaining,
    refreshLatencyMs: latencyMs,
    memoryPressurePct,
    eventQueueSize,
    skippedLayerCount: skippedLayers.length,
    emergencyOverrideActive: input.emergencyOverride,
    mobileOptimizationMode: input.mobileOptimizationMode,
    progressiveHydration:
      input.mobileOptimizationMode && input.batterySaver ? 'summary' : 'full',
    activeLayers,
    sleepingLayers,
    deferredLayers,
    blockedLayers,
    skippedLayers,
    layerSchedule: schedule,
    userExplanationJa,
    priorityFormulaJa: PRIORITY_FORMULA_JA,
    computeBudgetFormulaJa: COMPUTE_BUDGET_FORMULA_JA,
    sleepWakeFormulaJa: SLEEP_WAKE_FORMULA_JA,
    orchestrationFlowJa: [...ORCHESTRATION_FLOW_JA],
    dependencyRecomputeFlowJa: [...DEPENDENCY_RECOMPUTE_FLOW_JA],
    mobileOptimizationJa: [...MOBILE_OPTIMIZATION_JA],
    orchestrationTimeline: [
      ...persisted.orchestrationTimeline,
      {
        at: new Date().toISOString(),
        computeUsed: budgetUsed,
        skipped: skippedLayers.length,
        latencyMs,
      },
    ].slice(-8),
    explainRuleBasisJa:
      '動的 layer 実行制御のみ。realTradingEnabled=false・実注文禁止・新規売買判断は増やさない。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}

export function shouldShowOrchestratedDashboard(
  layerId: OrchestratedLayerId,
  bundle: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null,
): boolean {
  if (!bundle) return true;
  if (bundle.progressiveHydration === 'full') return true;
  const entry = bundle.layerSchedule.find((e) => e.id === layerId);
  return entry?.hydrateDashboard ?? false;
}
