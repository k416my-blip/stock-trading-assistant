import {
  BATTERY_MODE_CONDITION_JA,
  CIRCULAR_GUARD_FORMULA_JA,
  DEBOUNCE_CONDITION_JA,
  EVENT_DEPENDENCY_GRAPH,
  EVENT_FLOW_STEPS_JA,
  ORCHESTRATION_FEATURE_LABELS,
  RECOMPUTE_RULES_JA,
  REACTIVE_REGULATORY_JA,
  RENDER_BUDGET_FORMULA_JA,
  THROTTLE_CONDITION_JA,
} from '../constants/reactiveEventOrchestration';
import type {
  BuildReactiveOrchestrationInput,
  OrchestrationFeatureId,
  OrchestrationFeatureStatus,
  ReactiveEventOrchestrationBundle,
} from '../types/reactiveEventOrchestration';
import { getOrchestrationMetrics } from './reactiveEventOrchestrationRuntime';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function computeReactiveHealthScore(
  metrics: ReturnType<typeof getOrchestrationMetrics>,
  input: BuildReactiveOrchestrationInput,
): number {
  let score = 100;
  if (metrics.droppedTotal > 15) score -= 12;
  if (metrics.staleQueueCount > 5) score -= 10;
  if (input.renderBudgetBlocked > 5) score -= 8;
  if (metrics.offlineQueueSize > 20) score -= 6;
  if (metrics.burstProtectionActive) score -= 5;
  if (input.memoryPressure) score -= 15;
  if (!input.appForeground && metrics.queued.length > 3) score -= 8;
  if (metrics.avgEventLatencyMs > 3000) score -= 10;
  return clamp(score);
}

function buildFeatureStatuses(
  partial: Omit<ReactiveEventOrchestrationBundle, 'featureStatuses'>,
  input: BuildReactiveOrchestrationInput,
): OrchestrationFeatureStatus[] {
  const status = (
    id: OrchestrationFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): OrchestrationFeatureStatus => ({
    id,
    labelJa: ORCHESTRATION_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    status('event_bus', true, false, 'dispatchConciergeEvent 統合'),
    status('typed_event_system', true, false, '8 event types'),
    status('dependency_trigger_graph', true, false, `${EVENT_DEPENDENCY_GRAPH.length} edges`),
    status('selective_recompute_engine', true, partial.selectiveRecomputeActive, partial.pendingLayers.join(', ') || 'full'),
    status('render_budget_orchestrator', input.renderBudgetInFlight < input.renderBudgetMax, input.renderBudgetBlocked > 2, `${input.renderBudgetInFlight}/${input.renderBudgetMax}`),
    status('event_debounce', partial.batchedTotal < 30, partial.batchedTotal >= 10, DEBOUNCE_CONDITION_JA.slice(0, 40)),
    status('event_throttle', partial.droppedTotal < 20, partial.droppedTotal >= 10, 'throttle active'),
    status('priority_queue', true, partial.queuedEvents.length > 8, `queued ${partial.queuedEvents.length}`),
    status('event_deduplication', partial.batchedTotal > 0, false, `batched ${partial.batchedTotal}`),
    status('snapshot_diff_engine', true, false, 'fingerprint diff'),
    status('incremental_update_engine', partial.selectiveRecomputeActive, !partial.selectiveRecomputeActive, 'layer skip'),
    status('reactive_cooldown', true, partial.droppedEvents.some((d) => d.dropReasonJa?.includes('cooldown')), '2.5s'),
    status('circular_dependency_guard', !partial.droppedEvents.some((d) => d.dropReasonJa?.includes('circular')), partial.droppedEvents.some((d) => d.dropReasonJa?.includes('circular')), 'stack guard'),
    status('state_mutation_audit', true, false, 'destructive blocked'),
    status('immutable_state_boundary', true, false, 'immutable bundles'),
    status('background_task_scheduler', true, input.batterySaverEnabled, 'battery defer'),
    status('visibility_aware_updates', !partial.visibilityPaused || partial.queuedEvents.length === 0, partial.visibilityPaused, partial.visibilityPaused ? 'paused' : 'active'),
    status('ai_refresh_coordinator', true, false, 'orchestrated refresh'),
    status('autonomous_safe_scheduler', true, false, 'low priority queue'),
    status('recovery_replay_engine', true, partial.offlineQueueSize > 0, `offline ${partial.offlineQueueSize}`),
    status('event_persistence', partial.timeline.length > 0, false, 'critical/high persist'),
    status('zombie_event_cleanup', partial.staleQueueCount === 0, partial.staleQueueCount > 0, `stale ${partial.staleQueueCount}`),
    status('async_batch_engine', true, false, 'batch flush'),
    status('market_burst_protection', !partial.burstProtectionActive, partial.burstProtectionActive, '3s window'),
    status('battery_aware_scheduler', !input.batterySaverEnabled, input.batterySaverEnabled, BATTERY_MODE_CONDITION_JA.slice(0, 50)),
    status('memory_pressure_guard', !input.memoryPressure, input.memoryPressure, 'batch limit 3'),
    status('offline_event_queue', partial.offlineQueueSize < 10, partial.offlineQueueSize >= 10, `${partial.offlineQueueSize}`),
    status('reactive_health_score', partial.reactiveHealthScore >= 60, partial.reactiveHealthScore < 60, `${partial.reactiveHealthScore}`),
    status('event_timeline_viewer', partial.timeline.length > 0, false, `${partial.timeline.length} events`),
    status('reactive_dashboard', true, false, 'panel'),
  ];
}

export function buildReactiveEventOrchestrationBundle(
  input: BuildReactiveOrchestrationInput,
): ReactiveEventOrchestrationBundle {
  const metrics = getOrchestrationMetrics();
  const reactiveHealthScore = computeReactiveHealthScore(metrics, input);
  const healthLabelJa =
    reactiveHealthScore >= 75 ? '安定' : reactiveHealthScore >= 50 ? '注意' : '危険 — 更新抑制中';

  const partial: Omit<ReactiveEventOrchestrationBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: REACTIVE_REGULATORY_JA,
    reactiveHealthScore,
    healthLabelJa,
    activeEvents: metrics.active,
    queuedEvents: metrics.queued,
    droppedEvents: metrics.dropped.slice(-8),
    timeline: metrics.timeline,
    rerenderPerSec: metrics.rerenderPerSec,
    recomputePerSec: metrics.recomputePerSec,
    renderBudgetInFlight: input.renderBudgetInFlight,
    renderBudgetMax: input.renderBudgetMax,
    renderBudgetBlocked: input.renderBudgetBlocked,
    staleQueueCount: metrics.staleQueueCount,
    avgEventLatencyMs: metrics.avgEventLatencyMs,
    eventFlowJa: [...EVENT_FLOW_STEPS_JA],
    dependencyGraph: [...EVENT_DEPENDENCY_GRAPH],
    recomputeRulesJa: [...RECOMPUTE_RULES_JA],
    debounceConditionJa: DEBOUNCE_CONDITION_JA,
    throttleConditionJa: THROTTLE_CONDITION_JA,
    circularGuardFormulaJa: CIRCULAR_GUARD_FORMULA_JA,
    renderBudgetFormulaJa: RENDER_BUDGET_FORMULA_JA,
    batteryModeConditionJa: BATTERY_MODE_CONDITION_JA,
    selectiveRecomputeActive: metrics.selectiveActive,
    pendingLayers: metrics.pendingLayers,
    droppedTotal: metrics.droppedTotal,
    batchedTotal: metrics.batchedTotal,
    offlineQueueSize: metrics.offlineQueueSize,
    burstProtectionActive: metrics.burstProtectionActive,
    visibilityPaused: metrics.visibilityPaused,
    orchestrationSummaryJa: [
      `健全性 ${reactiveHealthScore}/100`,
      `recompute ${metrics.recomputePerSec}/s · rerender ${metrics.rerenderPerSec}/s`,
      metrics.selectiveActive ? `部分再計算: ${metrics.pendingLayers.join(',')}` : 'フル再計算',
      metrics.droppedTotal > 0 ? `dropped ${metrics.droppedTotal}` : 'drop なし',
    ].join(' — '),
    explainRuleBasisJa:
      'Event bus + dependency graph + ProductionStability renderBudget。Paperのみ・破壊的 state 更新禁止。',
  };

  const featureStatuses = buildFeatureStatuses(partial, input);
  return { ...partial, featureStatuses };
}
