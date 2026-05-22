import type {
  ConciergeEventType,
  DependencyEdge,
  LayerRecomputeId,
  OrchestrationFeatureId,
} from '../types/reactiveEventOrchestration';

export const REACTIVE_REGULATORY_JA =
  'Reactive Event Orchestration — 全 Intelligence の state 更新・再計算・再描画を制御し state explosion を防ぎます。Paper Trading のみ（実注文なし）。';

export const REACTIVE_AI_PROMPT_JA = `
【Reactive Event Orchestration】
- reactiveHealthScore / dropped events / render budget を優先。不要 refresh を避ける説明。
- 非表示・バッテリー・offline 時は更新抑制されている旨を伝える。
`.trim();

export const REACTIVE_UI_LABELS_JA = {
  panelTitle: 'Reactive Event Dashboard',
  health: 'Reactive Health',
  active: 'Active Events',
  queued: 'Queued',
  dropped: 'Dropped',
  metrics: 'Metrics',
  timeline: 'Event Timeline',
  deps: 'Dependency Graph',
} as const;

export const EVENT_DEBOUNCE_MS = 400;
export const EVENT_THROTTLE_MS = 800;
export const EVENT_THROTTLE_MAX_PER_WINDOW = 6;
export const REACTIVE_COOLDOWN_MS = 2_500;
export const MARKET_BURST_WINDOW_MS = 3_000;
export const MARKET_BURST_MAX = 4;
export const ZOMBIE_EVENT_AGE_MS = 10 * 60_000;
export const OFFLINE_QUEUE_MAX = 40;
export const BATCH_FLUSH_MS = 120;
export const TIMELINE_MAX = 24;

export const RENDER_BUDGET_FORMULA_JA =
  'acquire 成功 ⇔ inFlight < RENDER_BUDGET_MAX(4)；Orchestrator が refresh 前に renderBudget を確認し、blocked は dropped に計上';

export const DEBOUNCE_CONDITION_JA = `同一 dedupeKey の event が ${EVENT_DEBOUNCE_MS}ms 以内 → 1 件にマージ（最新 payload 優先）`;

export const THROTTLE_CONDITION_JA = `${EVENT_THROTTLE_MS}ms 窓で type あたり最大 ${EVENT_THROTTLE_MAX_PER_WINDOW} 件、超過は dropped`;

export const CIRCULAR_GUARD_FORMULA_JA =
  '処理スタックに同一 eventType が再入 → 循環とみなし drop（例: market_update→risk_change→market_update）';

export const BATTERY_MODE_CONDITION_JA =
  'batterySaver ON → debounce×2、throttle 厳格、background 層は scheduler で遅延、full refresh 間隔を延長';

export const EVENT_FLOW_STEPS_JA = [
  'dispatchConciergeEvent → priority queue → debounce/throttle/dedup',
  'dependency graph → selective layer flags → orchestrated refreshProactive',
  'renderBudget acquire → 各 layer 再計算（スキップ可）→ bundle metrics',
  'visibility/battery/offline → pause または offline queue → resume replay',
];

export const RECOMPUTE_RULES_JA = [
  '未指定 event → 全 layer 再計算',
  'governance_veto → governance + strategy のみ',
  'ui_visibility_change + background → 再計算なし',
  'health_alert → stability + governance + data',
  'execution_update → execution + capital + governance',
  'incremental: pendingLayers が空でなければそれ以外 skip',
];

export const EVENT_DEPENDENCY_GRAPH: DependencyEdge[] = [
  { eventType: 'market_update', triggers: ['data_reliability', 'macro', 'strategy', 'portfolio_risk', 'capital', 'governance'], noteJa: '価格・シグナル変化' },
  { eventType: 'risk_change', triggers: ['portfolio_risk', 'governance', 'capital', 'strategy'], noteJa: 'リスク escalation' },
  { eventType: 'macro_shift', triggers: ['macro', 'meta', 'strategy', 'portfolio_risk'], noteJa: 'レジーム変化' },
  { eventType: 'governance_veto', triggers: ['governance', 'strategy'], noteJa: 'veto / downgrade' },
  { eventType: 'execution_update', triggers: ['execution', 'capital', 'governance', 'stability'], noteJa: '紙上 DD・注文' },
  { eventType: 'portfolio_change', triggers: ['portfolio_risk', 'capital', 'execution', 'reality', 'governance'], noteJa: '保有変更' },
  { eventType: 'health_alert', triggers: ['stability', 'governance', 'data_reliability'], noteJa: '健全性・API' },
  { eventType: 'ui_visibility_change', triggers: ['proactive_queue'], noteJa: '表示のみ（foreground で full）' },
];

export const ALL_LAYER_IDS: LayerRecomputeId[] = [
  'data_reliability',
  'macro',
  'meta',
  'strategy',
  'reality',
  'execution',
  'self_eval',
  'portfolio_risk',
  'capital',
  'stability',
  'governance',
  'proactive_queue',
];

export const ORCHESTRATION_FEATURE_LABELS: Record<OrchestrationFeatureId, string> = {
  event_bus: 'Event Bus',
  typed_event_system: 'Typed Event System',
  dependency_trigger_graph: 'Dependency-trigger Graph',
  selective_recompute_engine: 'Selective Recompute Engine',
  render_budget_orchestrator: 'Render Budget Orchestrator',
  event_debounce: 'Event Debounce',
  event_throttle: 'Event Throttle',
  priority_queue: 'Priority Queue',
  event_deduplication: 'Event Deduplication',
  snapshot_diff_engine: 'Snapshot Diff Engine',
  incremental_update_engine: 'Incremental Update Engine',
  reactive_cooldown: 'Reactive Cooldown',
  circular_dependency_guard: 'Circular Dependency Guard',
  state_mutation_audit: 'State Mutation Audit',
  immutable_state_boundary: 'Immutable State Boundary',
  background_task_scheduler: 'Background Task Scheduler',
  visibility_aware_updates: 'Visibility-aware Updates',
  ai_refresh_coordinator: 'AI Refresh Coordinator',
  autonomous_safe_scheduler: 'Autonomous-safe Scheduler',
  recovery_replay_engine: 'Recovery Replay Engine',
  event_persistence: 'Event Persistence',
  zombie_event_cleanup: 'Zombie Event Cleanup',
  async_batch_engine: 'Async Batch Engine',
  market_burst_protection: 'Market Burst Protection',
  battery_aware_scheduler: 'Battery-aware Scheduler',
  memory_pressure_guard: 'Memory Pressure Guard',
  offline_event_queue: 'Offline Event Queue',
  reactive_health_score: 'Reactive Health Score',
  event_timeline_viewer: 'Event Timeline Viewer',
  reactive_dashboard: 'Reactive Dashboard',
};

export function layersForEventType(type: ConciergeEventType): LayerRecomputeId[] {
  const edge = EVENT_DEPENDENCY_GRAPH.find((e) => e.eventType === type);
  return edge ? [...edge.triggers] : [...ALL_LAYER_IDS];
}
