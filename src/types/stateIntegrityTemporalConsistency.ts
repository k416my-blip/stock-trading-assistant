import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { ReactiveEventOrchestrationBundle } from './reactiveEventOrchestration';
import type { AdaptiveResourceComputeBudgetBundle } from './adaptiveResourceComputeBudget';
import type { ExplainableCognitiveTraceBundle } from './explainableCognitiveTrace';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { StrategyExecutionBundle } from './strategyExecution';

export type TemporalLayerId =
  | 'stability'
  | 'governance'
  | 'reactive'
  | 'resource'
  | 'cognitive_trace'
  | 'strategy'
  | 'data_reliability'
  | 'macro'
  | 'portfolio_risk'
  | 'capital'
  | 'execution';

export type StateSnapshotRecord = {
  id: string;
  version: number;
  at: string;
  fingerprint: string;
  immutable: true;
  compressedBytes: number;
};

export type ReplayCheckpoint = {
  id: string;
  at: string;
  version: number;
  integrityHash: string;
  rollbackSafe: boolean;
};

export type LayerTimestampRow = {
  layerId: TemporalLayerId;
  generatedAt: string | null;
  aligned: boolean;
  ageMs: number | null;
};

export type IntegrityFeatureId =
  | 'global_state_versioning'
  | 'immutable_snapshot_system'
  | 'temporal_ordering_engine'
  | 'event_causality_validation'
  | 'replay_integrity_guard'
  | 'snapshot_fingerprint'
  | 'zombie_state_detection'
  | 'async_race_resolver'
  | 'consensus_drift_detector'
  | 'governance_freshness_gate'
  | 'stale_replay_isolation'
  | 'timeline_integrity_audit'
  | 'layer_dependency_validator'
  | 'circular_state_guard'
  | 'multi_refresh_lock'
  | 'temporal_rollback'
  | 'snapshot_compression'
  | 'replay_checkpoint'
  | 'state_recovery_engine'
  | 'partial_recompute_validator'
  | 'contradiction_persistence_audit'
  | 'governance_version_sync'
  | 'layer_timestamp_alignment'
  | 'deterministic_rebuild'
  | 'ai_context_isolation'
  | 'trace_consistency_score'
  | 'event_replay_simulator'
  | 'state_health_score'
  | 'integrity_dashboard'
  | 'emergency_state_freeze';

export type IntegrityTemporalFeatureStatus = {
  id: IntegrityFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type StateIntegrityTemporalConsistencyBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  stateVersion: number;
  globalStateVersionLabelJa: string;
  stateHealthScore: number;
  healthLabelJa: string;
  consistencyScore: number;
  traceConsistencyScore: number;
  driftScore: number;
  replayFreshnessJa: string;
  governanceAgeMs: number | null;
  governanceFresh: boolean;
  staleStateCount: number;
  asyncConflictCount: number;
  snapshotCount: number;
  replayIntegrityOk: boolean;
  replayIntegrityFormulaJa: string;
  versioningFormulaJa: string;
  driftDetectionFormulaJa: string;
  asyncRaceFormulaJa: string;
  temporalFlowJa: string[];
  rollbackFlowJa: string[];
  staleIsolationFlowJa: string[];
  deterministicRebuildFlowJa: string[];
  rollbackPoints: ReplayCheckpoint[];
  staleStatesJa: string[];
  asyncConflictsJa: string[];
  zombieStatesJa: string[];
  timelineGapCount: number;
  circularStateDetected: boolean;
  multiRefreshLocked: boolean;
  emergencyStateFreeze: boolean;
  rollbackApplied: boolean;
  governanceVersionSynced: boolean;
  layerTimestamps: LayerTimestampRow[];
  snapshots: StateSnapshotRecord[];
  featureStatuses: IntegrityTemporalFeatureStatus[];
  integritySummaryJa: string;
  explainRuleBasisJa: string;
};

export type BuildStateIntegrityTemporalInput = {
  stateFingerprintJa: string;
  refreshGeneration: number;
  refreshGenerationStale: boolean;
  governance: AiGovernanceDecisionBundle | null;
  reactive: ReactiveEventOrchestrationBundle | null;
  resource: AdaptiveResourceComputeBudgetBundle | null;
  trace: ExplainableCognitiveTraceBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  strategy: StrategyExecutionBundle | null;
  partialRecomputeActive: boolean;
  duplicateRefreshBlocked: boolean;
};
