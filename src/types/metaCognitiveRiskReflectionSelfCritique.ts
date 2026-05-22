import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { ExplainableCognitiveTraceBundle } from './explainableCognitiveTrace';
import type { ReactiveEventOrchestrationBundle } from './reactiveEventOrchestration';
import type { AdaptiveResourceComputeBudgetBundle } from './adaptiveResourceComputeBudget';
import type { StateIntegrityTemporalConsistencyBundle } from './stateIntegrityTemporalConsistency';
import type { SemanticConsistencyDecisionCoherenceBundle } from './semanticConsistencyDecisionCoherence';
import type { EpistemicReliabilityEvidenceWeightBundle } from './epistemicReliabilityEvidenceWeight';
import type { CognitiveGoalArbitrationIntentPriorityBundle } from './cognitiveGoalArbitrationIntentPriority';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { StrategyAction } from './strategyExecution';

export type DriftTimelinePoint = {
  at: string;
  confidenceDriftPct: number;
  metaConfidencePct: number;
  fatigueScore: number;
};

export type ReflectionFeatureId =
  | 'self_critique_engine'
  | 'long_term_confidence_drift_detector'
  | 'overconfidence_clamp'
  | 'narrative_bias_detector'
  | 'freeze_frequency_audit'
  | 'rollback_dependency_detector'
  | 'semantic_saturation_detector'
  | 'governance_dependency_audit'
  | 'replay_trust_fatigue'
  | 'contradiction_trend_tracker'
  | 'unsupported_claim_trend'
  | 'drift_memory_timeline'
  | 'confidence_volatility_score'
  | 'recommendation_stability_score'
  | 'longitudinal_consistency_audit'
  | 'recursive_bias_reflection'
  | 'explainability_regression_detector'
  | 'reliability_decay_audit'
  | 'arbitration_stress_detector'
  | 'ai_fatigue_estimator'
  | 'emergency_reflection_freeze'
  | 'conservative_recovery_engine'
  | 'historical_behavior_replay'
  | 'meta_confidence_score'
  | 'reflection_consensus_merge'
  | 'self_healing_downgrade'
  | 'reflection_timeline_compression'
  | 'meta_audit_dashboard'
  | 'reflection_safe_mode'
  | 'meta_emergency_shutdown';

export type ReflectionFeatureStatus = {
  id: ReflectionFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type MetaCognitiveRiskReflectionSelfCritiqueBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  selfCritiqueScore: number;
  metaConfidencePct: number;
  fatigueScore: number;
  healthLabelJa: string;
  confidenceDriftPct: number;
  confidenceVolatilityPct: number;
  bullishBiasPct: number;
  bearishBiasPct: number;
  rollbackDependencyPct: number;
  freezeFrequencyPct: number;
  unsupportedTrendPct: number;
  contradictionTrendPct: number;
  recommendationStabilityPct: number;
  longitudinalConsistencyPct: number;
  reflectionConsensusPct: number;
  reflectionSafeMode: boolean;
  reflectionFreeze: boolean;
  metaEmergencyShutdown: boolean;
  conservativeRecoveryActive: boolean;
  selfCritiqueSummaryJa: string;
  metaWarningJa: string | null;
  driftTimeline: DriftTimelinePoint[];
  reflectionFormulaJa: string;
  confidenceDriftFormulaJa: string;
  fatigueFormulaJa: string;
  rollbackDependencyFormulaJa: string;
  biasDetectionFlowJa: string[];
  longitudinalAuditFlowJa: string[];
  conservativeRecoveryFlowJa: string[];
  reflectionFreezeFlowJa: string[];
  reflectionFlowJa: string[];
  explainRuleBasisJa: string;
  featureStatuses: ReflectionFeatureStatus[];
};

export type BuildMetaCognitiveReflectionInput = {
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
  finalDecision: StrategyAction;
};
