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
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { StrategyAction } from './strategyExecution';

export type StabilityTimelinePoint = {
  at: string;
  stabilityHealth: number;
  recursiveRisk: number;
  cascadeRisk: number;
};

export type MetaStabilitySnapshot = {
  id: string;
  at: string;
  stabilityHealth: number;
  governanceLoadPct: number;
};

export type SystemicStabilityFeatureId =
  | 'recursive_governance_stabilizer'
  | 'systemic_stability_engine'
  | 'self_conflict_isolation'
  | 'cascade_prevention_engine'
  | 'freeze_chain_breaker'
  | 'recursive_loop_detector'
  | 'arbitration_oscillation_guard'
  | 'confidence_collapse_preventer'
  | 'governance_saturation_detector'
  | 'stability_consensus_engine'
  | 'meta_governance_layer'
  | 'reflection_recursion_guard'
  | 'downgrade_cascade_limiter'
  | 'self_critique_dampener'
  | 'cognitive_oscillation_clamp'
  | 'layer_interference_resolver'
  | 'recursive_freeze_governor'
  | 'meta_stability_snapshot'
  | 'stability_recovery_engine'
  | 'governance_cooldown_engine'
  | 'recursive_load_balancer'
  | 'stability_drift_tracker'
  | 'emergency_governance_halt'
  | 'self_healing_stabilizer'
  | 'cognitive_equilibrium_engine'
  | 'recursive_arbitration_isolation'
  | 'stability_timeline_compressor'
  | 'governance_memory_pruner'
  | 'stability_dashboard'
  | 'systemic_emergency_safe_mode';

export type SystemicStabilityFeatureStatus = {
  id: SystemicStabilityFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type SystemicStabilityRecursiveGovernanceBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  stabilityHealthScore: number;
  healthLabelJa: string;
  recursiveLoopRiskPct: number;
  governanceSaturationPct: number;
  cascadeRiskPct: number;
  oscillationRiskPct: number;
  freezeChainCount: number;
  arbitrationRecursionPct: number;
  downgradeCascadePct: number;
  stabilityConsensusPct: number;
  cognitiveEquilibriumPct: number;
  governanceLoadPct: number;
  stabilityDriftPct: number;
  recoveryHealthPct: number;
  recursiveRiskPct: number;
  arbitrationHalted: boolean;
  governanceCooldownActive: boolean;
  cascadeIsolationActive: boolean;
  recursiveFreezeActive: boolean;
  systemicEmergencySafeMode: boolean;
  emergencyGovernanceHalt: boolean;
  stabilitySummaryJa: string;
  equilibriumFormulaJa: string;
  cascadePreventionFormulaJa: string;
  stabilityHealthFormulaJa: string;
  recursiveRiskFormulaJa: string;
  stabilityFlowJa: string[];
  recursiveGovernanceFlowJa: string[];
  cascadePreventionFlowJa: string[];
  oscillationClampFlowJa: string[];
  recursiveIsolationFlowJa: string[];
  freezeChainBreakerFlowJa: string[];
  governanceCooldownFlowJa: string[];
  emergencySafeModeFlowJa: string[];
  stabilityTimeline: StabilityTimelinePoint[];
  metaStabilitySnapshots: MetaStabilitySnapshot[];
  explainRuleBasisJa: string;
  featureStatuses: SystemicStabilityFeatureStatus[];
};

export type BuildSystemicStabilityInput = {
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
  finalDecision: StrategyAction;
};
