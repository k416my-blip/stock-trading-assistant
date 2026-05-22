import type {
  DynamicOrchestrationFeatureId,
  OrchestratedLayerId,
} from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';

export const ORCHESTRATION_REGULATORY_JA =
  'Dynamic Layer Orchestration & Mobile Runtime Optimization — 必要レイヤーのみ動的実行。Paper Trading・realTradingEnabled=false・実注文禁止。';

export const ORCHESTRATION_AI_PROMPT_JA = `
【Dynamic Layer Orchestration】
- 端末負荷のため遅延・スキップ中の layer は userExplanationJa を要約に含める。
- real order は絶対に送信しない。新規 aggressive buy/sell は生成しない。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const MOBILE_REFRESH_BUDGET_MAX = 85;
export const DESKTOP_REFRESH_BUDGET_MAX = 120;
export const STALE_TTL_MS = 45_000;
export const STALE_GATE_TTL_MS = 20_000;
export const ORCHESTRATION_TIMELINE_MAX = 32;

export const PRIORITY_FORMULA_JA =
  'priority = safety→governance→integrity→reliability→risk→execution→capital→macro→semantic→trace→memory→ux（rank 昇順で実行）';

export const COMPUTE_BUDGET_FORMULA_JA =
  'budgetUsed = Σ(layerCost) for active layers; run while used ≤ budgetMax; critical/emergency は常に実行';

export const SLEEP_WAKE_FORMULA_JA =
  'sleeping/deferred: batterySaver|!foreground|budget|reactive skip; stale: fingerprint 一致かつ TTL 内；blocked: background pause';

export const ORCHESTRATION_FLOW_JA = [
  'Event → Priority queue → Dependency graph → Budget scheduler',
  'Active layers execute → Stale/deferred retain cache → Progressive UI hydrate',
];

export const DEPENDENCY_RECOMPUTE_FLOW_JA = [
  'portfolio_change → risk,capital,execution,governance',
  'governance_veto → governance,strategy',
  'market_update → data,macro,strategy,risk',
  '価格/設定変更 → selective invalidation',
];

export const MOBILE_OPTIMIZATION_JA = [
  'Redmi-class: budget 85, lazy dashboards, trace/replay sampling',
  'batterySaver/background: low tier sleep, debounce×2',
  'offline: cached summary + paper state',
];

export const ORCHESTRATION_UI_LABELS_JA = {
  panelTitle: 'Orchestration Dashboard',
  health: 'Orchestration Health',
  budget: 'Compute Budget',
  latency: 'Refresh Latency',
  memory: 'Memory Pressure',
  queue: 'Event Queue',
  active: 'Active Layers',
  sleeping: 'Sleeping',
  deferred: 'Deferred',
  skipped: 'Skipped',
  emergency: 'Emergency Override',
  mobile: 'Mobile Mode',
  explanation: 'User Explanation',
} as const;

/** Priority rank — lower runs first / survives budget cuts last */
export const LAYER_PRIORITY_RANK: Record<OrchestratedLayerId, number> = {
  stability: 0,
  governance: 1,
  temporal: 2,
  data_reliability: 3,
  epistemic: 4,
  portfolio_risk: 5,
  execution: 6,
  reality: 7,
  capital: 8,
  macro: 9,
  semantic: 10,
  cognitive_trace: 11,
  compression: 12,
  arbitration: 13,
  reflection: 14,
  systemic: 15,
  recovery: 16,
  strategy: 17,
  meta: 18,
  self_eval: 19,
  proactive_queue: 20,
  orchestration: 21,
};

export const LAYER_COMPUTE_COST: Record<OrchestratedLayerId, number> = {
  stability: 12,
  governance: 14,
  temporal: 16,
  data_reliability: 10,
  epistemic: 14,
  portfolio_risk: 12,
  execution: 11,
  reality: 10,
  capital: 10,
  macro: 22,
  semantic: 14,
  cognitive_trace: 32,
  compression: 24,
  arbitration: 18,
  reflection: 18,
  systemic: 20,
  recovery: 16,
  strategy: 15,
  meta: 12,
  self_eval: 10,
  proactive_queue: 8,
  orchestration: 6,
};

export const STALE_GATE_LAYER_IDS: OrchestratedLayerId[] = [
  'governance',
  'data_reliability',
  'portfolio_risk',
  'stability',
];

export const ALL_ORCHESTRATED_LAYER_IDS: OrchestratedLayerId[] = Object.keys(
  LAYER_PRIORITY_RANK,
) as OrchestratedLayerId[];

export const DASHBOARD_LAYER_IDS: OrchestratedLayerId[] = [
  'macro',
  'cognitive_trace',
  'compression',
  'systemic',
  'recovery',
  'arbitration',
  'reflection',
];

export const ORCHESTRATION_FEATURE_LABELS: Record<DynamicOrchestrationFeatureId, string> = {
  dynamic_layer_scheduler: 'Dynamic Layer Scheduler',
  event_based_activation: 'Event-based Activation',
  layer_priority_queue: 'Layer Priority Queue',
  mobile_runtime_budget: 'Mobile Runtime Budget',
  thermal_battery_guard: 'Thermal / Battery Guard',
  progressive_hydration: 'Progressive Hydration',
  lazy_dashboard_loading: 'Lazy Dashboard Loading',
  stale_layer_reuse: 'Stale Layer Reuse',
  dependency_recompute: 'Dependency-aware Recompute',
  layer_sleep_wake: 'Layer Sleep / Wake',
  compute_cost_score: 'Compute Cost Score',
  emergency_override: 'Emergency Override',
  background_pause: 'Background Pause',
  queue_backpressure: 'Queue Backpressure',
  render_budget_integration: 'Render Budget Integration',
  memory_pressure_guard: 'Memory Pressure Guard',
  offline_slow_api_mode: 'Offline / Slow API Mode',
  deterministic_order: 'Deterministic Execution Order',
  orchestration_dashboard: 'Orchestration Dashboard',
  ai_context_compression: 'AI Context Compression',
  layer_result_cache: 'Layer Result Cache',
  selective_invalidation: 'Selective Invalidation',
  user_visible_explanation: 'User-visible Explanation',
  real_order_safety: 'Real Order Safety',
  dependency_graph_resolver: 'Dependency Graph Resolver',
  thaw_defer_coordinator: 'Thaw Defer Coordinator',
  cognitive_chain_scheduler: 'Cognitive Chain Scheduler',
  dashboard_sampling: 'Dashboard Sampling',
  refresh_latency_tracker: 'Refresh Latency Tracker',
  mobile_redmi_guard: 'Mobile Redmi Guard',
  conservative_execution_gate: 'Conservative Execution Gate',
};
