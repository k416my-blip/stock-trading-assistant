import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { CognitiveArbitrationConsensusBundle } from './cognitiveArbitrationConsensus';
import type { EpistemicIntegrityTruthCalibrationBundle } from './epistemicIntegrityTruthCalibration';
import type { StrategicMemoryGraphTemporalCausalityBundle } from './strategicMemoryGraphTemporalCausality';
import type { CognitiveResourceEconomyAttentionAllocationBundle } from './cognitiveResourceEconomyAttentionAllocation';
import type { UnifiedCognitiveStateExecutiveAwarenessBundle } from './unifiedCognitiveStateExecutiveAwareness';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { StrategyExecutionBundle } from './strategyExecution';

export type IntentAlignmentState =
  | 'INTENT_ALIGNED'
  | 'INTENT_DRIFTING'
  | 'INTENT_FRAGMENTED'
  | 'INTENT_REINTERPRETING'
  | 'INTENT_UNCERTAIN'
  | 'INTENT_UNSUPPORTED';

export type IntentAuditTargetId =
  | 'instructionContinuity'
  | 'semanticConsistency'
  | 'goalIntegrity'
  | 'contextIntegrity'
  | 'intentCoherence'
  | 'memoryAlignment'
  | 'directivePreservation'
  | 'conversationDrift'
  | 'strategyAlignment'
  | 'governanceAlignment'
  | 'userPriorityIntegrity'
  | 'predictionAlignment'
  | 'explanationConsistency'
  | 'orchestrationAlignment';

export type IntentAuditSnapshot = {
  id: IntentAuditTargetId;
  labelJa: string;
  scorePct: number;
  detailJa: string;
};

export type IntentTimelinePoint = {
  at: string;
  intentHealthPct: number;
  alignmentState: IntentAlignmentState;
  safeAlignmentPct: number;
};

export type HumanIntentFeatureId =
  | 'alignment_collector'
  | 'semantic_continuity_checker'
  | 'goal_integrity_guard'
  | 'context_integrity_probe'
  | 'reinterpretation_suppressor'
  | 'instruction_reinforcer'
  | 'context_rebuild'
  | 'clarification_downgrade'
  | 'explanation_only_fallback'
  | 'semantic_freeze'
  | 'orchestration_deviation_clamp'
  | 'intent_timeline'
  | 'no_hidden_agenda'
  | 'no_goal_mutation'
  | 'no_persuasion_optimization'
  | 'mobile_lite_alignment'
  | 'cached_intent_snapshots'
  | 'human_intent_dashboard'
  | 'paper_trading_safety';

export type HumanIntentFeatureStatus = {
  id: HumanIntentFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type HumanIntentContinuityAlignmentPreservationBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  autonomousGoalCreationForbidden: true;
  hiddenIntentionForbidden: true;
  strategyActionChangeForbidden: true;
  alignmentState: IntentAlignmentState;
  alignmentStateLabelJa: string;
  intentHealthPct: number;
  alignmentIntegrityPct: number;
  reinterpretationPressurePct: number;
  semanticContinuityPct: number;
  strategyAlignmentPct: number;
  contextIntegrityPct: number;
  instructionContinuityPct: number;
  orchestrationDeviationPct: number;
  unsupportedInferenceRiskPct: number;
  intentDriftPct: number;
  safeAlignmentPct: number;
  explanationOnlyMode: boolean;
  instructionReinforcementActive: boolean;
  contextRebuildActive: boolean;
  reinterpretationSuppressionActive: boolean;
  clarificationDowngradeActive: boolean;
  semanticFreezeActive: boolean;
  orchestrationBudgetMax: number;
  alignmentSummaryJa: string;
  intentHealthFormulaJa: string;
  intentDriftFormulaJa: string;
  alignmentIntegrityFormulaJa: string;
  safeAlignmentFormulaJa: string;
  alignmentFlowJa: string[];
  auditTargets: IntentAuditSnapshot[];
  intentTimeline: IntentTimelinePoint[];
  mobileRuntimeStateJa: string;
  explainRuleBasisJa: string;
  featureStatuses: HumanIntentFeatureStatus[];
};

export type BuildHumanIntentContinuityInput = {
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  consensus: CognitiveArbitrationConsensusBundle | null;
  epistemic: EpistemicIntegrityTruthCalibrationBundle | null;
  strategicMemoryGraph: StrategicMemoryGraphTemporalCausalityBundle | null;
  cognitiveResourceEconomy: CognitiveResourceEconomyAttentionAllocationBundle | null;
  unifiedCognitiveState: UnifiedCognitiveStateExecutiveAwarenessBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  strategy: StrategyExecutionBundle | null;
  refreshCount: number;
  mockSemanticDriftBoost?: number;
  mockReinterpretationPressureBoost?: number;
  mockUnsupportedIntentInferenceBoost?: number;
  mockIntentHealthPct?: number;
  mockAlignmentIntegrityPct?: number;
  auditStartedAt?: number;
};
