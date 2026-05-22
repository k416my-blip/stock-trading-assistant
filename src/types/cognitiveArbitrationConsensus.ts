import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { ExecutionRecoveryAdaptiveConfidenceBundle } from './executionRecoveryAdaptiveConfidence';
import type { AutonomousMarketRegimeDetectionBundle } from './autonomousMarketRegimeDetection';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { MacroIntelligenceBundle } from './macroIntelligence';
import type { PortfolioRiskExposureBundle } from './portfolioRiskExposure';
import type { RecursiveMemoryCompressionStrategicAbstractionBundle } from './recursiveMemoryCompressionStrategicAbstraction';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from './metaCognitiveRiskReflectionSelfCritique';
import type { SemanticConsistencyDecisionCoherenceBundle } from './semanticConsistencyDecisionCoherence';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { StrategyAction } from './strategyExecution';

export type ConsensusState =
  | 'CONSENSUS_OK'
  | 'SOFT_CONFLICT'
  | 'HARD_CONFLICT'
  | 'GOVERNANCE_OVERRIDE'
  | 'PANIC_CONSENSUS'
  | 'UNSUPPORTED_STATE';

export type ArbitrationParticipantId =
  | 'governance'
  | 'stability'
  | 'recovery'
  | 'regime'
  | 'risk'
  | 'macro'
  | 'memory'
  | 'reflection'
  | 'orchestration';

export type ArbitrationFeatureId =
  | 'layer_output_collector'
  | 'contradiction_mapper'
  | 'semantic_alignment_scorer'
  | 'weighted_consensus_engine'
  | 'governance_validator'
  | 'unstable_downgrade_gate'
  | 'orchestration_handoff'
  | 'consensus_timeline'
  | 'panic_simplified_consensus'
  | 'hard_conflict_resolver'
  | 'soft_conflict_retainer'
  | 'governance_override_guard'
  | 'unsupported_explanation_mode'
  | 'freeze_signal_clamp'
  | 'recommendation_divergence_scan'
  | 'confidence_spread_analyzer'
  | 'rollback_instability_detector'
  | 'macro_agreement_checker'
  | 'semantic_integrity_meter'
  | 'mobile_arbitration_debounce'
  | 'stale_consensus_retain'
  | 'background_lightweight_mode'
  | 'cognitive_consensus_dashboard'
  | 'paper_trading_safety'
  | 'no_central_ai_dictator'
  | 'uncertainty_preservation'
  | 'participant_priority_queue'
  | 'orchestration_budget_adapter'
  | 'downgrade_reason_tracker';

export type ParticipantSignal = {
  id: ArbitrationParticipantId;
  labelJa: string;
  layerConfidencePct: number;
  layerPriority: number;
  semanticAlignmentPct: number;
  actionLean: StrategyAction;
  active: boolean;
  detailJa: string;
};

export type ArbitrationFeatureStatus = {
  id: ArbitrationFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type ConsensusTimelinePoint = {
  at: string;
  state: ConsensusState;
  contradictionRiskPct: number;
  finalConsensusPct: number;
};

export type CognitiveArbitrationConsensusBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  consensusState: ConsensusState;
  consensusStateLabelJa: string;
  finalConsensusPct: number;
  contradictionRiskPct: number;
  semanticAlignmentPct: number;
  consensusHealthPct: number;
  uncertaintyPct: number;
  governanceOverrideActive: boolean;
  explanationOnlyMode: boolean;
  watchHoldOnly: boolean;
  governancePriorityOnly: boolean;
  orchestrationBudgetMax: number;
  orchestrationImpactJa: string;
  arbitrationLatencyMs: number;
  downgradeReasonJa: string;
  panicInteractionJa: string;
  activeParticipantsJa: string;
  suppressedLayersJa: string;
  mobileRuntimeStateJa: string;
  consensusSummaryJa: string;
  uncertaintyDisclaimerJa: string;
  finalConsensusFormulaJa: string;
  contradictionFormulaJa: string;
  consensusHealthFormulaJa: string;
  consensusFlowJa: string[];
  participantSignals: ParticipantSignal[];
  consensusTimeline: ConsensusTimelinePoint[];
  explainRuleBasisJa: string;
  featureStatuses: ArbitrationFeatureStatus[];
};

export type BuildCognitiveArbitrationInput = {
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null;
  regime: AutonomousMarketRegimeDetectionBundle | null;
  risk: PortfolioRiskExposureBundle | null;
  macro: MacroIntelligenceBundle | null;
  memory: RecursiveMemoryCompressionStrategicAbstractionBundle | null;
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null;
  semantic: SemanticConsistencyDecisionCoherenceBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  strategy: StrategyExecutionBundle | null;
  finalDecision: StrategyAction;
  /** vitest / 実機 — layer disagreement シミュレーション */
  mockLayerDisagreement?: boolean;
  mockContradictionBoost?: number;
  mockUncertaintyPct?: number;
  arbitrationStartedAt?: number;
};
