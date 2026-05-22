import type {
  ResourceFeatureId,
  ScheduledIntelligenceLayerId,
  LayerScheduleTier,
} from '../types/adaptiveResourceComputeBudget';

export const RESOURCE_REGULATORY_JA =
  'Adaptive Resource & Compute Budget — モバイル端末の計算・描画・AI 負荷を予算管理します。Paper Trading のみ・実注文なし・orchestration/resource 専用。';

export const RESOURCE_AI_PROMPT_JA = `
【Adaptive Resource & Compute Budget】
- resourceHealthScore / render budget / memory / battery / thermal を優先して説明。
- sleeping layers・throttled events・trace 圧縮は「安定性のため」と伝える。新しい売買指示は出さない。
`.trim();

export const RESOURCE_UI_LABELS_JA = {
  panelTitle: 'Resource Dashboard',
  health: 'Resource Health',
  renderBudget: 'Render Budget',
  aiLoad: 'AI Load',
  memory: 'Memory Pressure',
  battery: 'Battery Mode',
  thermal: 'Thermal',
  active: 'Active Layers',
  sleeping: 'Sleeping Layers',
  throttled: 'Throttled Events',
  dropped: 'Dropped Recomputes',
  trace: 'Trace Size',
  replay: 'Replay Size',
  timeline: 'Compute Timeline',
} as const;

export const LAYER_SCHEDULE_TIER: Record<ScheduledIntelligenceLayerId, LayerScheduleTier> = {
  stability: 'critical',
  governance: 'critical',
  data_reliability: 'critical',
  portfolio_risk: 'critical',
  macro: 'high',
  strategy: 'high',
  execution: 'high',
  capital: 'high',
  meta: 'normal',
  reality: 'normal',
  self_eval: 'normal',
  proactive_queue: 'normal',
  reactive_orchestration: 'normal',
  cognitive_trace: 'low',
  autonomous: 'low',
};

export const TIER_PRIORITY_RANK: Record<LayerScheduleTier, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const BASE_REFRESH_MS = 30_000;
export const BATTERY_REFRESH_MULTIPLIER = 2;
export const HIGH_VOLATILITY_REFRESH_MS = 20_000;
export const MEMORY_PRESSURE_QUEUE_THRESHOLD = 50;
export const TRACE_MAX_BYTES = 48_000;
export const REPLAY_MAX_ENTRIES = 40;
export const COMPUTE_TIMELINE_MAX = 48;

export const SCHEDULER_FORMULA_JA =
  'layerScore = tierRank×25 + enabled×10；実行順は score 昇順。emergencyCut 時は critical のみ、aiSleep 時は critical+high のみ';

export const RENDER_BUDGET_RESOURCE_FORMULA_JA =
  'remaining% = max(0, (max−inFlight)/max×100)；blocked>3 で renderCostScore +15、priority queue は critical panel 先';

export const EVENT_PRESSURE_FORMULA_JA =
  'pressure = clamp(0.35×recompute/s×10 + 0.25×dropped + 0.2×queue/60 + 0.2×memoryPct) × 100';

export const BATTERY_DOWNGRADE_FORMULA_JA =
  'batterySaver ON または !foreground → mode=saver；saver かつ queue>40 → critical；debounce×2、low tier sleep、trace sampling 50%';

export const TRACE_COMPRESSION_FORMULA_JA =
  'traceBytes > TRACE_MAX → reasoning/timeline を slice、replay は差分のみ保持、古い timeline>48h 破棄';

export const COMPUTE_FLOW_STEPS_JA = [
  'Compute Budget Engine が端末スナップショットを評価',
  'Dynamic Layer Scheduler → lazy load / sleep 判定',
  'Render Priority Queue + Visibility → 非表示 UI は描画停止',
  'Adaptive debounce/throttle + Event Pressure → 再計算抑制',
  'Trace compression + GC hint → 永続化サイズ抑制',
];

export const MEMORY_CLEANUP_FLOW_JA = [
  'memoryPressure 検知 → sleepingLayers に low/normal を移動',
  'Garbage Collection Hint → 未使用 bundle null 化',
  'Smart Cache Expiry → trace/replay 上限超過を trim',
  'Snapshot Deduplication → 同一 fingerprint の再保存をスキップ',
];

export const LAZY_LOADING_FLOW_JA = [
  'layerEnabled=false → 即スキップ',
  'emergencyComputeCut → critical のみ build',
  'aiSleepMode → high 未満は deferred',
  'Progressive Hydration → critical→high→normal の順で UI 更新',
];

export const RESOURCE_FEATURE_LABELS: Record<ResourceFeatureId, string> = {
  compute_budget_engine: 'Compute Budget Engine',
  dynamic_layer_scheduler: 'Dynamic Layer Scheduler',
  priority_based_rendering: 'Priority-based Rendering',
  adaptive_refresh_rate: 'Adaptive Refresh Rate',
  background_downgrade: 'Background Downgrade',
  battery_aware_ai: 'Battery-aware AI',
  thermal_protection: 'Thermal Protection',
  memory_pressure_detector: 'Memory Pressure Detector',
  garbage_collection_hint: 'Garbage Collection Hint',
  trace_compression: 'Trace Compression',
  incremental_replay: 'Incremental Replay',
  snapshot_deduplication: 'Snapshot Deduplication',
  ai_sleep_mode: 'AI Sleep Mode',
  emergency_compute_cut: 'Emergency Compute Cut',
  render_priority_queue: 'Render Priority Queue',
  visibility_aware_rendering: 'Visibility-aware Rendering',
  lazy_intelligence_loading: 'Lazy Intelligence Loading',
  progressive_hydration: 'Progressive Hydration',
  bundle_fragmentation: 'Bundle Fragmentation',
  smart_cache_expiry: 'Smart Cache Expiry',
  ai_tick_throttling: 'AI Tick Throttling',
  event_pressure_score: 'Event Pressure Score',
  adaptive_debounce: 'Adaptive Debounce',
  predictive_precompute: 'Predictive Precompute',
  offline_lightweight_mode: 'Offline Lightweight Mode',
  explainability_sampling: 'Explainability Sampling',
  render_cost_scoring: 'Render Cost Scoring',
  resource_health_score: 'Resource Health Score',
  compute_timeline: 'Compute Timeline',
  resource_dashboard: 'Resource Dashboard',
};
