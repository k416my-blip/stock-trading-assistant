import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { ExecutionRecoveryAdaptiveConfidenceBundle } from './executionRecoveryAdaptiveConfidence';
import type { AutonomousMarketRegimeDetectionBundle } from './autonomousMarketRegimeDetection';
import type { CognitiveArbitrationConsensusBundle } from './cognitiveArbitrationConsensus';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from './metaCognitiveRiskReflectionSelfCritique';
import type { SemanticConsistencyDecisionCoherenceBundle } from './semanticConsistencyDecisionCoherence';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { StrategyAction } from './strategyExecution';

export type LongitudinalTrustState =
  | 'TRUST_STABLE'
  | 'TRUST_DECAYING'
  | 'TRUST_UNSTABLE'
  | 'TRUST_CRITICAL'
  | 'EXPLANATION_DIVERGENCE'
  | 'LONGITUDINAL_UNSUPPORTED';

export type TrustAuditTargetId =
  | 'recommendationConsistency'
  | 'confidenceIntegrity'
  | 'semanticStability'
  | 'explanationAlignment'
  | 'consensusReliability'
  | 'regimePersistence'
  | 'rollbackFrequency'
  | 'freezeFrequency'
  | 'orchestrationStability'
  | 'recoveryDurability';

export type MetaReliabilityFeatureId =
  | 'longitudinal_snapshot_collector'
  | 'historical_consistency_comparator'
  | 'semantic_drift_detector'
  | 'confidence_inflation_scanner'
  | 'trust_scoring_engine'
  | 'governance_validation_gate'
  | 'unstable_downgrade_gate'
  | 'orchestration_handoff'
  | 'trust_timeline'
  | 'hallucination_risk_guard'
  | 'explanation_divergence_mode'
  | 'longitudinal_unsupported_freeze'
  | 'rollback_frequency_tracker'
  | 'freeze_frequency_tracker'
  | 'stale_consensus_detector'
  | 'replay_reliability_probe'
  | 'governance_deviation_meter'
  | 'orchestration_volatility_meter'
  | 'recursive_instability_scan'
  | 'mobile_snapshot_compression'
  | 'trust_cache_retain'
  | 'background_audit_batch'
  | 'meta_reliability_dashboard'
  | 'paper_trading_safety'
  | 'long_term_consistency_only'
  | 'uncertainty_preservation'
  | 'confidence_decay_on_trust_loss'
  | 'recommendation_consistency_audit'
  | 'recovery_durability_probe';

export type TrustAuditRow = {
  id: TrustAuditTargetId;
  labelJa: string;
  scorePct: number;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type LongitudinalSnapshotPoint = {
  at: string;
  metaReliabilityPct: number;
  trustState: LongitudinalTrustState;
  trustDecayPct: number;
  semanticDriftPct: number;
  finalDecision: StrategyAction;
  regimeId: string;
};

export type MetaReliabilityFeatureStatus = {
  id: MetaReliabilityFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type MetaReliabilityLongitudinalTrustBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  trustState: LongitudinalTrustState;
  trustStateLabelJa: string;
  metaReliabilityPct: number;
  trustDecayPct: number;
  semanticDriftPct: number;
  confidenceInflationPct: number;
  hallucinationRiskPct: number;
  governanceDeviationPct: number;
  longitudinalConsistencyPct: number;
  explanationIntegrityPct: number;
  staleReasoningRiskPct: number;
  confidenceClampPct: number;
  orchestrationBudgetMax: number;
  explanationOnlyMode: boolean;
  watchHoldOnly: boolean;
  freezeAdaptiveLearning: boolean;
  governancePriorityOnly: boolean;
  downgradeReasonJa: string;
  orchestrationInteractionJa: string;
  mobileRuntimeStateJa: string;
  trustSummaryJa: string;
  uncertaintyDisclaimerJa: string;
  metaReliabilityFormulaJa: string;
  trustDecayFormulaJa: string;
  confidenceInflationFormulaJa: string;
  semanticDriftFormulaJa: string;
  trustFlowJa: string[];
  auditTargets: TrustAuditRow[];
  longitudinalTimeline: LongitudinalSnapshotPoint[];
  explainRuleBasisJa: string;
  featureStatuses: MetaReliabilityFeatureStatus[];
};

export type BuildMetaReliabilityInput = {
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null;
  regime: AutonomousMarketRegimeDetectionBundle | null;
  consensus: CognitiveArbitrationConsensusBundle | null;
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null;
  semantic: SemanticConsistencyDecisionCoherenceBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  strategy: StrategyExecutionBundle | null;
  finalDecision: StrategyAction;
  /** vitest / 長時間 mock refresh 用 */
  mockSemanticDriftBoost?: number;
  mockTrustDecayBoost?: number;
  mockConfidenceInflation?: number;
  mockHallucinationRisk?: number;
  mockMetaReliabilityPct?: number;
  auditStartedAt?: number;
};
