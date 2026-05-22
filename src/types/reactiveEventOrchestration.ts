export type ConciergeEventType =
  | 'market_update'
  | 'risk_change'
  | 'macro_shift'
  | 'governance_veto'
  | 'execution_update'
  | 'portfolio_change'
  | 'health_alert'
  | 'ui_visibility_change';

export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

export type LayerRecomputeId =
  | 'data_reliability'
  | 'macro'
  | 'meta'
  | 'strategy'
  | 'reality'
  | 'execution'
  | 'self_eval'
  | 'portfolio_risk'
  | 'capital'
  | 'stability'
  | 'governance'
  | 'proactive_queue';

export type DependencyEdge = {
  eventType: ConciergeEventType;
  triggers: LayerRecomputeId[];
  noteJa: string;
};

export type ConciergeEventRecord = {
  id: string;
  type: ConciergeEventType;
  priority: EventPriority;
  at: string;
  dedupeKey: string;
  status: 'queued' | 'processed' | 'dropped' | 'batched';
  dropReasonJa: string | null;
  layersToRecompute: LayerRecomputeId[];
  latencyMs: number | null;
};

export type OrchestrationFeatureId =
  | 'event_bus'
  | 'typed_event_system'
  | 'dependency_trigger_graph'
  | 'selective_recompute_engine'
  | 'render_budget_orchestrator'
  | 'event_debounce'
  | 'event_throttle'
  | 'priority_queue'
  | 'event_deduplication'
  | 'snapshot_diff_engine'
  | 'incremental_update_engine'
  | 'reactive_cooldown'
  | 'circular_dependency_guard'
  | 'state_mutation_audit'
  | 'immutable_state_boundary'
  | 'background_task_scheduler'
  | 'visibility_aware_updates'
  | 'ai_refresh_coordinator'
  | 'autonomous_safe_scheduler'
  | 'recovery_replay_engine'
  | 'event_persistence'
  | 'zombie_event_cleanup'
  | 'async_batch_engine'
  | 'market_burst_protection'
  | 'battery_aware_scheduler'
  | 'memory_pressure_guard'
  | 'offline_event_queue'
  | 'reactive_health_score'
  | 'event_timeline_viewer'
  | 'reactive_dashboard';

export type OrchestrationFeatureStatus = {
  id: OrchestrationFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type ReactiveEventOrchestrationBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  reactiveHealthScore: number;
  healthLabelJa: string;
  activeEvents: ConciergeEventRecord[];
  queuedEvents: ConciergeEventRecord[];
  droppedEvents: ConciergeEventRecord[];
  timeline: ConciergeEventRecord[];
  rerenderPerSec: number;
  recomputePerSec: number;
  renderBudgetInFlight: number;
  renderBudgetMax: number;
  renderBudgetBlocked: number;
  staleQueueCount: number;
  avgEventLatencyMs: number;
  eventFlowJa: string[];
  dependencyGraph: DependencyEdge[];
  recomputeRulesJa: string[];
  debounceConditionJa: string;
  throttleConditionJa: string;
  circularGuardFormulaJa: string;
  renderBudgetFormulaJa: string;
  batteryModeConditionJa: string;
  selectiveRecomputeActive: boolean;
  pendingLayers: LayerRecomputeId[];
  droppedTotal: number;
  batchedTotal: number;
  offlineQueueSize: number;
  burstProtectionActive: boolean;
  visibilityPaused: boolean;
  featureStatuses: OrchestrationFeatureStatus[];
  orchestrationSummaryJa: string;
  explainRuleBasisJa: string;
};

export type BuildReactiveOrchestrationInput = {
  batterySaverEnabled: boolean;
  appForeground: boolean;
  memoryPressure: boolean;
  renderBudgetInFlight: number;
  renderBudgetBlocked: number;
  renderBudgetMax: number;
};
