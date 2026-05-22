import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { ExplainableCognitiveTraceBundle } from './explainableCognitiveTrace';
import type { ReactiveEventOrchestrationBundle } from './reactiveEventOrchestration';
import type { AdaptiveResourceComputeBudgetBundle } from './adaptiveResourceComputeBudget';
import type { StateIntegrityTemporalConsistencyBundle } from './stateIntegrityTemporalConsistency';
import type { SemanticConsistencyDecisionCoherenceBundle } from './semanticConsistencyDecisionCoherence';
import type { EpistemicReliabilityEvidenceWeightBundle } from './epistemicReliabilityEvidenceWeight';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { StrategyAction } from './strategyExecution';

export type ArbitrationGoalId =
  | 'safety'
  | 'governance'
  | 'semantic'
  | 'temporal'
  | 'reliability'
  | 'replay'
  | 'resource'
  | 'reactive'
  | 'performance'
  | 'consensus';

export type ActiveGoalRow = {
  goalId: ArbitrationGoalId;
  labelJa: string;
  priorityRank: number;
  priorityScore: number;
  active: boolean;
  isolated: boolean;
};

export type ArbitrationConflictRow = {
  id: string;
  layersJa: string;
  conflictJa: string;
  resolverJa: string;
  winnerJa: string;
};

export type GoalStackEntry = {
  rank: number;
  goalId: ArbitrationGoalId;
  labelJa: string;
  reasonJa: string;
};

export type ArbitrationTimelinePoint = {
  at: string;
  healthScore: number;
  deadlockDetected: boolean;
  safeMode: boolean;
};

export type ArbitrationFeatureId =
  | 'global_intent_priority_engine'
  | 'goal_arbitration_matrix'
  | 'safety_first_override'
  | 'governance_supreme_authority'
  | 'semantic_freeze_priority'
  | 'temporal_rollback_priority'
  | 'reliability_override'
  | 'resource_emergency_priority'
  | 'replay_integrity_priority'
  | 'contradiction_arbitration'
  | 'unsupported_claim_suppression'
  | 'confidence_priority_clamp'
  | 'reactive_emergency_arbitration'
  | 'multi_layer_conflict_resolver'
  | 'governance_vs_reactive_resolver'
  | 'temporal_vs_semantic_resolver'
  | 'reliability_vs_performance_resolver'
  | 'consensus_arbitration'
  | 'intent_downgrade_engine'
  | 'emergency_intent_freeze'
  | 'ai_goal_stack'
  | 'priority_escalation_engine'
  | 'decision_deadlock_detector'
  | 'arbitration_replay_timeline'
  | 'priority_drift_detector'
  | 'explainability_priority_narrator'
  | 'goal_isolation_guard'
  | 'arbitration_health_score'
  | 'arbitration_dashboard'
  | 'emergency_safe_mode';

export type ArbitrationFeatureStatus = {
  id: ArbitrationFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type CognitiveGoalArbitrationIntentPriorityBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  arbitrationHealthScore: number;
  healthLabelJa: string;
  priorityOrderJa: string[];
  activeGoals: ActiveGoalRow[];
  arbitrationConflicts: ArbitrationConflictRow[];
  goalStack: GoalStackEntry[];
  overrideReasonJa: string | null;
  freezeSourceJa: string | null;
  downgradeReasonJa: string | null;
  governanceAuthorityJa: string;
  semanticVetoJa: string | null;
  reliabilityOverrideJa: string | null;
  emergencySafeMode: boolean;
  intentFreeze: boolean;
  deadlockDetected: boolean;
  priorityDriftPct: number;
  priorityNarrativeJa: string;
  arbitrationTimeline: ArbitrationTimelinePoint[];
  priorityFormulaJa: string;
  overrideHierarchyJa: string[];
  governancePriorityFormulaJa: string;
  semanticVetoFlowJa: string[];
  rollbackArbitrationFlowJa: string[];
  conflictResolverFormulaJa: string;
  deadlockResolverFormulaJa: string;
  downgradeFlowJa: string[];
  emergencySafeModeFlowJa: string[];
  arbitrationFlowJa: string[];
  arbitrationSummaryJa: string;
  explainRuleBasisJa: string;
  featureStatuses: ArbitrationFeatureStatus[];
};

export type BuildCognitiveGoalArbitrationInput = {
  governance: AiGovernanceDecisionBundle | null;
  trace: ExplainableCognitiveTraceBundle | null;
  strategy: StrategyExecutionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  reactive: ReactiveEventOrchestrationBundle | null;
  resource: AdaptiveResourceComputeBudgetBundle | null;
  temporal: StateIntegrityTemporalConsistencyBundle | null;
  semantic: SemanticConsistencyDecisionCoherenceBundle | null;
  epistemic: EpistemicReliabilityEvidenceWeightBundle | null;
  finalDecision: StrategyAction;
};
