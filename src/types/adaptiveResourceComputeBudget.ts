export type ScheduledIntelligenceLayerId =
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
  | 'reactive_orchestration'
  | 'cognitive_trace'
  | 'proactive_queue'
  | 'autonomous';

export type LayerScheduleTier = 'critical' | 'high' | 'normal' | 'low';

export type MemoryPressureLevel = 'low' | 'medium' | 'high' | 'critical';

export type ThermalState = 'normal' | 'warm' | 'hot';

export type BatteryResourceMode = 'normal' | 'saver' | 'critical';

export type ComputeTimelinePoint = {
  at: string;
  cpuLoadPct: number;
  memoryPressurePct: number;
  aiLoadPct: number;
};

export type ResourceFeatureId =
  | 'compute_budget_engine'
  | 'dynamic_layer_scheduler'
  | 'priority_based_rendering'
  | 'adaptive_refresh_rate'
  | 'background_downgrade'
  | 'battery_aware_ai'
  | 'thermal_protection'
  | 'memory_pressure_detector'
  | 'garbage_collection_hint'
  | 'trace_compression'
  | 'incremental_replay'
  | 'snapshot_deduplication'
  | 'ai_sleep_mode'
  | 'emergency_compute_cut'
  | 'render_priority_queue'
  | 'visibility_aware_rendering'
  | 'lazy_intelligence_loading'
  | 'progressive_hydration'
  | 'bundle_fragmentation'
  | 'smart_cache_expiry'
  | 'ai_tick_throttling'
  | 'event_pressure_score'
  | 'adaptive_debounce'
  | 'predictive_precompute'
  | 'offline_lightweight_mode'
  | 'explainability_sampling'
  | 'render_cost_scoring'
  | 'resource_health_score'
  | 'compute_timeline'
  | 'resource_dashboard';

export type ResourceFeatureStatus = {
  id: ResourceFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type AdaptiveResourceComputeBudgetBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  resourceHealthScore: number;
  healthLabelJa: string;
  renderBudgetInFlight: number;
  renderBudgetMax: number;
  renderBudgetBlocked: number;
  aiLoadPct: number;
  memoryPressureLevel: MemoryPressureLevel;
  memoryPressurePct: number;
  batteryMode: BatteryResourceMode;
  batteryModeJa: string;
  thermalState: ThermalState;
  thermalStateJa: string;
  activeLayers: string[];
  sleepingLayers: string[];
  throttledEvents: number;
  droppedRecomputes: number;
  traceSizeBytes: number;
  replaySizeBytes: number;
  eventPressureScore: number;
  adaptiveRefreshIntervalMs: number;
  aiSleepMode: boolean;
  emergencyComputeCut: boolean;
  visibilityPaused: boolean;
  offlineLightweight: boolean;
  explainabilitySamplingActive: boolean;
  traceCompressionRatioPct: number;
  renderCostScore: number;
  computeBudgetRemainingPct: number;
  schedulerFormulaJa: string;
  renderBudgetFormulaJa: string;
  eventPressureFormulaJa: string;
  batteryDowngradeFormulaJa: string;
  traceCompressionFormulaJa: string;
  computeFlowJa: string[];
  memoryCleanupFlowJa: string[];
  lazyLoadingFlowJa: string[];
  computeTimeline: ComputeTimelinePoint[];
  featureStatuses: ResourceFeatureStatus[];
  resourceSummaryJa: string;
  explainRuleBasisJa: string;
};

export type BuildAdaptiveResourceComputeBudgetInput = {
  batterySaverEnabled: boolean;
  appForeground: boolean;
  memoryPressure: boolean;
  offlineMode: boolean;
  renderBudgetInFlight: number;
  renderBudgetMax: number;
  renderBudgetBlocked: number;
  proactiveQueueSize: number;
  layerEnabled: Partial<Record<ScheduledIntelligenceLayerId, boolean>>;
  reactiveDroppedTotal?: number;
  reactiveRecomputePerSec?: number;
  traceJsonLength?: number;
  replayEntryCount?: number;
  marketVolatilityHigh?: boolean;
};
