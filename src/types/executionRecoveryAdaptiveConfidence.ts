import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { ExplainableCognitiveTraceBundle } from './explainableCognitiveTrace';
import type { ReactiveEventOrchestrationBundle } from './reactiveEventOrchestration';
import type { AdaptiveResourceComputeBudgetBundle } from './adaptiveResourceComputeBudget';
import type { StateIntegrityTemporalConsistencyBundle } from './stateIntegrityTemporalConsistency';
import type { SemanticConsistencyDecisionCoherenceBundle } from './semanticConsistencyDecisionCoherence';
import type { EpistemicReliabilityEvidenceWeightBundle } from './epistemicReliabilityEvidenceWeight';
import type { CognitiveGoalArbitrationIntentPriorityBundle } from './cognitiveGoalArbitrationIntentPriority';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from './metaCognitiveRiskReflectionSelfCritique';
import type { RecursiveMemoryCompressionStrategicAbstractionBundle } from './recursiveMemoryCompressionStrategicAbstraction';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { StrategyAction } from './strategyExecution';

/** 0=freeze … 4=buy-watch (conservative only) */
export type RecoveryStage = 0 | 1 | 2 | 3 | 4;

export type ThawState =
  | 'frozen'
  | 'hold_only'
  | 'reduce_hold'
  | 'watch'
  | 'buy_watch';

export type RecoveryTimelinePoint = {
  at: string;
  recoveryHealth: number;
  thawLevel: number;
  recoveryStage: RecoveryStage;
};

export type RecoveryCooldownEntry = {
  at: string;
  reasonJa: string;
  expiresAt: string;
};

export type ExecutionRecoveryFeatureId =
  | 'recovery_health_scanner'
  | 'confidence_rehabilitation_engine'
  | 'adaptive_thaw_engine'
  | 'conservative_recommendation_rebuilder'
  | 'stability_validation_gate'
  | 'recovery_consensus_engine'
  | 'rollback_immunity_guard'
  | 'anti_oscillation_recovery'
  | 'thaw_level_computer'
  | 'adaptive_confidence_engine'
  | 'freeze_gradual_release'
  | 'hold_watch_exit_bridge'
  | 'replay_integrity_restorer'
  | 'contradiction_trend_dampener'
  | 'unsupported_trend_dampener'
  | 'governance_stability_probe'
  | 'reflection_health_probe'
  | 'systemic_equilibrium_probe'
  | 'recovery_cooldown_engine'
  | 'thaw_rate_limiter'
  | 'recovery_suspend_guard'
  | 'recursive_thaw_blocker'
  | 'governance_cooldown_thaw_limit'
  | 'confidence_ceiling_enforcer'
  | 'safe_mode_respect_guard'
  | 'recovery_timeline_compressor'
  | 'meta_recovery_snapshot'
  | 'partial_restore_engine'
  | 'recovery_dashboard'
  | 'conservative_recovery_safe_mode';

export type ExecutionRecoveryFeatureStatus = {
  id: ExecutionRecoveryFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type ExecutionRecoveryAdaptiveConfidenceBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  recoveryHealthPct: number;
  adaptiveConfidencePct: number;
  thawLevelPct: number;
  recoveryConsensusPct: number;
  oscillationRiskPct: number;
  freezeFrequencyPct: number;
  rollbackDependencyPct: number;
  cooldownActive: boolean;
  cooldownStatusJa: string;
  recoveryStage: RecoveryStage;
  thawState: ThawState;
  recoverySuspended: boolean;
  recoveryBlocked: boolean;
  safeRecovery: boolean;
  partialRestoreActive: boolean;
  replayIntegrityOk: boolean;
  contradictionTrendPct: number;
  unsupportedTrendPct: number;
  recursiveRiskPct: number;
  recoverySummaryJa: string;
  recoveryHealthFormulaJa: string;
  adaptiveConfidenceFormulaJa: string;
  thawLevelFormulaJa: string;
  recoveryConsensusFormulaJa: string;
  recoveryFlowJa: string[];
  adaptiveThawFlowJa: string[];
  confidenceRebuildFlowJa: string[];
  recoveryCooldownFlowJa: string[];
  recoveryTimeline: RecoveryTimelinePoint[];
  cooldownTimeline: RecoveryCooldownEntry[];
  explainRuleBasisJa: string;
  featureStatuses: ExecutionRecoveryFeatureStatus[];
};

export type BuildExecutionRecoveryInput = {
  governance: AiGovernanceDecisionBundle | null;
  trace: ExplainableCognitiveTraceBundle | null;
  strategy: StrategyExecutionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  reactive: ReactiveEventOrchestrationBundle | null;
  resource: AdaptiveResourceComputeBudgetBundle | null;
  temporal: StateIntegrityTemporalConsistencyBundle | null;
  semantic: SemanticConsistencyDecisionCoherenceBundle | null;
  epistemic: EpistemicReliabilityEvidenceWeightBundle | null;
  arbitration: CognitiveGoalArbitrationIntentPriorityBundle | null;
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null;
  compression: RecursiveMemoryCompressionStrategicAbstractionBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  finalDecision: StrategyAction;
};
