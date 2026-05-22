import type { ExplainableGovernanceTransparentReasoningBundle } from './explainableGovernanceTransparentReasoning';
import type { ConstitutionalGovernanceSystemCoherenceBundle } from './constitutionalGovernanceSystemCoherence';
import type { CognitiveResourceEconomyAttentionAllocationBundle } from './cognitiveResourceEconomyAttentionAllocation';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { PerformanceCostRuntimeSnapshot } from './performanceCost';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { MobileRuntimeMetricsSnapshot } from './layerRuntimeScheduler';
import type { CrossLayerCascadeMetrics } from './crossLayerCascade';
import type { AsyncRuntimeMetricsSnapshot } from './asyncRuntimeCoordinator';

export type RuntimeState =
  | 'RUNTIME_STABLE'
  | 'RUNTIME_STRESSED'
  | 'RUNTIME_DEGRADED'
  | 'RUNTIME_FRAGMENTED'
  | 'RUNTIME_OFFLINE'
  | 'RUNTIME_CRITICAL';

export type RuntimeAuditTargetId =
  | 'runtimeHealth'
  | 'backgroundContinuity'
  | 'memoryPressure'
  | 'thermalPressure'
  | 'batteryPressure'
  | 'offlineResilience'
  | 'websocketContinuity'
  | 'hydrationIntegrity'
  | 'resumeRecoveryIntegrity'
  | 'apiTimeoutPressure'
  | 'runtimeFragmentation'
  | 'processKillRisk'
  | 'mobileSurvivability';

export type RuntimeAuditSnapshot = {
  id: RuntimeAuditTargetId;
  labelJa: string;
  scorePct: number;
  detailJa: string;
};

export type RuntimeTimelinePoint = {
  at: string;
  runtimeHealthPct: number;
  runtimeState: RuntimeState;
  runtimeStabilityPct: number;
};

export type RuntimeFeatureId =
  | 'appstate_lifecycle'
  | 'netinfo_offline'
  | 'hydration_persistence'
  | 'websocket_reconnect_policy'
  | 'cache_first_orchestration'
  | 'suspend_resume_recovery'
  | 'offline_fallback'
  | 'stale_dashboard_recovery'
  | 'lightweight_timers'
  | 'no_infinite_polling'
  | 'reconnect_backoff'
  | 'survival_mode'
  | 'lightweight_mode'
  | 'deep_orch_suppression'
  | 'runtime_rebuild_hint'
  | 'no_stealth_wakelock'
  | 'no_hidden_background'
  | 'runtime_timeline'
  | 'mobile_lite_survival'
  | 'runtime_dashboard'
  | 'paper_trading_safety';

export type RuntimeFeatureStatus = {
  id: RuntimeFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type RuntimeSurvivalMobileResilienceBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  hiddenBackgroundExecutionForbidden: true;
  stealthPersistenceForbidden: true;
  batteryBypassForbidden: true;
  hiddenWakeLockForbidden: true;
  silentBackgroundTradingForbidden: true;
  autonomousRestartLoopForbidden: true;
  strategyActionChangeForbidden: true;
  runtimeState: RuntimeState;
  runtimeStateLabelJa: string;
  runtimeHealthPct: number;
  runtimeStabilityPct: number;
  runtimePressurePct: number;
  runtimeRecoveryScorePct: number;
  memoryPressurePct: number;
  batteryPressurePct: number;
  thermalPressurePct: number;
  websocketContinuityPct: number;
  hydrationIntegrityPct: number;
  processKillRiskPct: number;
  offlineResiliencePct: number;
  backgroundContinuityPct: number;
  apiTimeoutPressurePct: number;
  runtimeFragmentationPct: number;
  mobileSurvivabilityPct: number;
  survivalModeActive: boolean;
  lightweightModeActive: boolean;
  deepOrchestrationSuppressionActive: boolean;
  runtimeRebuildSuggestionActive: boolean;
  offlineSafeFallbackActive: boolean;
  websocketPauseActive: boolean;
  cacheFirstModeActive: boolean;
  dashboardLowRefreshActive: boolean;
  speculativeProcessingStopped: boolean;
  deepReflectionStopped: boolean;
  orchestrationBudgetMax: number;
  runtimeSummaryJa: string;
  runtimeStabilityFormulaJa: string;
  runtimePressureFormulaJa: string;
  runtimeRecoveryFormulaJa: string;
  runtimeFlowJa: string[];
  auditTargets: RuntimeAuditSnapshot[];
  runtimeTimeline: RuntimeTimelinePoint[];
  mobileRuntimeStateJa: string;
  explainRuleBasisJa: string;
  featureStatuses: RuntimeFeatureStatus[];
  layerSchedulerModeJa: string;
  mobileRuntimeMetrics: MobileRuntimeMetricsSnapshot;
  crossLayerCascadeMetrics: CrossLayerCascadeMetrics;
  cascadeGuardSummaryJa: string;
  asyncRuntimeMetrics: AsyncRuntimeMetricsSnapshot;
  asyncCoordinatorSummaryJa: string;
  runtimeTelemetrySummaryJa: string;
  runtimeTelemetryStateLabelJa: string;
};

export type BuildRuntimeSurvivalInput = {
  governance: AiGovernanceDecisionBundle | null;
  performance: PerformanceCostRuntimeSnapshot;
  memoryPressure: boolean;
  queueSize: number;
  cognitiveResourceEconomy: CognitiveResourceEconomyAttentionAllocationBundle | null;
  constitutionalGovernance: ConstitutionalGovernanceSystemCoherenceBundle | null;
  explainableGovernance: ExplainableGovernanceTransparentReasoningBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  strategy: StrategyExecutionBundle | null;
  refreshCount: number;
  lastResumeAt?: string | null;
  websocketConnected?: boolean;
  mockRuntimePressurePct?: number;
  mockRuntimeHealthPct?: number;
  mockRuntimeFragmentationPct?: number;
  mockOfflineResiliencePct?: number;
  mockThermalPressurePct?: number;
  mockProcessKillRiskPct?: number;
  auditStartedAt?: number;
  layerSchedulePlan?: import('./layerRuntimeScheduler').LayerRuntimeSchedulePlan;
  cascadeEvaluation?: import('./crossLayerCascade').CrossLayerCascadeEvaluation;
  asyncEvaluation?: import('./asyncRuntimeCoordinator').AsyncRuntimeEvaluation;
  telemetryEvaluation?: import('./runtimeTelemetry').RuntimeTelemetryEvaluation;
};
