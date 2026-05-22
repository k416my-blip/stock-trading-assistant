import type { LayerRecomputeId } from './reactiveEventOrchestration';
import type { ReactiveEventOrchestrationBundle } from './reactiveEventOrchestration';
import type { AdaptiveResourceComputeBudgetBundle } from './adaptiveResourceComputeBudget';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';

export type OrchestratedLayerId =
  | LayerRecomputeId
  | 'cognitive_trace'
  | 'temporal'
  | 'semantic'
  | 'epistemic'
  | 'arbitration'
  | 'reflection'
  | 'compression'
  | 'systemic'
  | 'recovery'
  | 'orchestration';

export type LayerWakeState =
  | 'active'
  | 'sleeping'
  | 'deferred'
  | 'blocked'
  | 'stale'
  | 'critical';

export type OrchestrationEventKind =
  | 'market_update'
  | 'portfolio_change'
  | 'governance_veto'
  | 'risk_change'
  | 'user_refresh'
  | 'background_resume'
  | 'full_refresh';

export type LayerScheduleEntry = {
  id: OrchestratedLayerId;
  state: LayerWakeState;
  priorityRank: number;
  computeCost: number;
  willRun: boolean;
  retainPrevious: boolean;
  hydrateDashboard: boolean;
  detailJa: string;
};

export type OrchestrationTimelinePoint = {
  at: string;
  computeUsed: number;
  skipped: number;
  latencyMs: number;
};

export type DynamicOrchestrationFeatureId =
  | 'dynamic_layer_scheduler'
  | 'event_based_activation'
  | 'layer_priority_queue'
  | 'mobile_runtime_budget'
  | 'thermal_battery_guard'
  | 'progressive_hydration'
  | 'lazy_dashboard_loading'
  | 'stale_layer_reuse'
  | 'dependency_recompute'
  | 'layer_sleep_wake'
  | 'compute_cost_score'
  | 'emergency_override'
  | 'background_pause'
  | 'queue_backpressure'
  | 'render_budget_integration'
  | 'memory_pressure_guard'
  | 'offline_slow_api_mode'
  | 'deterministic_order'
  | 'orchestration_dashboard'
  | 'ai_context_compression'
  | 'layer_result_cache'
  | 'selective_invalidation'
  | 'user_visible_explanation'
  | 'real_order_safety'
  | 'dependency_graph_resolver'
  | 'thaw_defer_coordinator'
  | 'cognitive_chain_scheduler'
  | 'dashboard_sampling'
  | 'refresh_latency_tracker'
  | 'mobile_redmi_guard'
  | 'conservative_execution_gate';

export type DynamicOrchestrationFeatureStatus = {
  id: DynamicOrchestrationFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type DynamicLayerOrchestrationMobileRuntimeOptimizationBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  orchestrationHealthScore: number;
  healthLabelJa: string;
  computeBudgetMax: number;
  computeBudgetUsed: number;
  computeBudgetRemaining: number;
  refreshLatencyMs: number;
  memoryPressurePct: number;
  eventQueueSize: number;
  skippedLayerCount: number;
  emergencyOverrideActive: boolean;
  mobileOptimizationMode: boolean;
  progressiveHydration: 'summary' | 'full';
  activeLayers: OrchestratedLayerId[];
  sleepingLayers: OrchestratedLayerId[];
  deferredLayers: OrchestratedLayerId[];
  blockedLayers: OrchestratedLayerId[];
  skippedLayers: OrchestratedLayerId[];
  layerSchedule: LayerScheduleEntry[];
  userExplanationJa: string;
  priorityFormulaJa: string;
  computeBudgetFormulaJa: string;
  sleepWakeFormulaJa: string;
  orchestrationFlowJa: string[];
  dependencyRecomputeFlowJa: string[];
  mobileOptimizationJa: string[];
  orchestrationTimeline: OrchestrationTimelinePoint[];
  explainRuleBasisJa: string;
  featureStatuses: DynamicOrchestrationFeatureStatus[];
};

export type BuildDynamicOrchestrationInput = {
  reactive: ReactiveEventOrchestrationBundle | null;
  resource: AdaptiveResourceComputeBudgetBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  stateFingerprintJa: string;
  batterySaver: boolean;
  appForeground: boolean;
  memoryPressure: boolean;
  offlineMode: boolean;
  emergencyOverride: boolean;
  dataReliabilityLow: boolean;
  governanceVeto: boolean;
  mobileOptimizationMode: boolean;
  refreshStartedAt: number;
};
