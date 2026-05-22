import type { ProductionStabilitySnapshot } from './productionStability';
import type { CapitalAllocationBundle } from './capitalAllocation';
import type { DataReliabilityBundle } from './dataReliability';
import type { MacroIntelligenceBundle } from './macroIntelligence';
import type { PortfolioRiskExposureBundle } from './portfolioRiskExposure';
import type { ExecutionDashboardBundle } from './paperBroker';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { RealityValidationBundle } from './portfolioRealityValidation';
import type { SelfEvaluationBundle } from './selfEvaluation';

export type IntegrityFeatureId =
  | 'global_state_audit'
  | 'cross_layer_dependency'
  | 'async_race_detector'
  | 'stale_cache_guard'
  | 'memory_leak_watcher'
  | 'render_frequency_guard'
  | 'event_storm_prevention'
  | 'duplicate_execution_guard'
  | 'zombie_order_cleaner'
  | 'invalid_state_recovery'
  | 'session_restore_engine'
  | 'background_resume_recovery'
  | 'api_retry_throttle'
  | 'websocket_reconnect_guard'
  | 'portfolio_snapshot_engine'
  | 'immutable_critical_state'
  | 'crash_safe_persistence'
  | 'safe_fallback_mode'
  | 'emergency_readonly_mode'
  | 'full_system_health_score';

export type IntegrityFeatureStatus = {
  id: IntegrityFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type DependencyEdge = {
  from: string;
  to: string;
  noteJa: string;
};

export type LayerIntegrityRow = {
  layerId: string;
  labelJa: string;
  enabled: boolean;
  loaded: boolean;
  generatedAt: string | null;
};

export type SystemStabilityIntegrityBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  systemHealthScore: number;
  healthLabelJa: string;
  emergencyReadOnlyActive: boolean;
  safeFallbackActive: boolean;
  freezePreventionJa: string;
  racePreventionJa: string;
  stateFlowJa: string[];
  persistenceFlowJa: string[];
  dependencyGraph: DependencyEdge[];
  layerRows: LayerIntegrityRow[];
  featureStatuses: IntegrityFeatureStatus[];
  productionSnapshot: ProductionStabilitySnapshot;
  integritySummaryJa: string;
  explainRuleBasisJa: string;
};

export type BuildSystemStabilityIntegrityInput = {
  productionSnapshot: ProductionStabilitySnapshot;
  layerEnabled: Record<string, boolean>;
  layers: {
    macro: MacroIntelligenceBundle | null;
    dataReliability: DataReliabilityBundle | null;
    capitalAllocation: CapitalAllocationBundle | null;
    execution: ExecutionDashboardBundle | null;
    portfolioRisk: PortfolioRiskExposureBundle | null;
    strategy: StrategyExecutionBundle | null;
    reality: RealityValidationBundle | null;
    selfEvaluation: SelfEvaluationBundle | null;
  };
  proactiveRefreshInFlight: boolean;
  duplicateRefreshBlocked: boolean;
  staleHoldingsCount: number;
  priceSyncStale: boolean;
  readOnlyMode: boolean;
  degradedMode: boolean;
  storageIntegrityOk: boolean;
  zombieOrderCount: number;
  proactiveQueueSize: number;
};
