import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { ExecutionRecoveryAdaptiveConfidenceBundle } from './executionRecoveryAdaptiveConfidence';
import type { AutonomousMarketRegimeDetectionBundle } from './autonomousMarketRegimeDetection';
import type { CognitiveArbitrationConsensusBundle } from './cognitiveArbitrationConsensus';
import type { MetaReliabilityLongitudinalTrustBundle } from './metaReliabilityLongitudinalTrust';
import type { SelfEvolvingArchitectureReflectiveRefactorBundle } from './selfEvolvingArchitectureReflectiveRefactor';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from './metaCognitiveRiskReflectionSelfCritique';
import type { SemanticConsistencyDecisionCoherenceBundle } from './semanticConsistencyDecisionCoherence';
import type { StateIntegrityTemporalConsistencyBundle } from './stateIntegrityTemporalConsistency';
import type { EpistemicReliabilityEvidenceWeightBundle } from './epistemicReliabilityEvidenceWeight';
import type { ExplainableCognitiveTraceBundle } from './explainableCognitiveTrace';
import type { RecursiveMemoryCompressionStrategicAbstractionBundle } from './recursiveMemoryCompressionStrategicAbstraction';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { StrategyExecutionBundle } from './strategyExecution';

export type EpistemicIntegrityState =
  | 'EPISTEMIC_STABLE'
  | 'EPISTEMIC_UNCERTAIN'
  | 'EPISTEMIC_DRIFTING'
  | 'EPISTEMIC_SPECULATIVE'
  | 'EPISTEMIC_CONTRADICTED'
  | 'EPISTEMIC_UNSUPPORTED'
  | 'EPISTEMIC_HALLUCINATION_RISK';

export type EpistemicAuditTargetId =
  | 'confidenceInflation'
  | 'unsupportedClaims'
  | 'hallucinationDensity'
  | 'staleAssumptions'
  | 'temporalDrift'
  | 'crossLayerContradiction'
  | 'narrativeMutation'
  | 'evidenceScarcity'
  | 'speculativeExpansion'
  | 'recursiveBeliefLoops'
  | 'memoryTruthDivergence'
  | 'explanationStability';

export type EpistemicAuditRow = {
  id: EpistemicAuditTargetId;
  labelJa: string;
  scorePct: number;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type EpistemicSnapshotPoint = {
  at: string;
  epistemicHealthPct: number;
  epistemicState: EpistemicIntegrityState;
  hallucinationRiskPct: number;
  confidenceCalibrationPct: number;
};

export type EpistemicIntegrityFeatureId =
  | 'reasoning_metrics_collector'
  | 'unsupported_expansion_detector'
  | 'contradiction_detector'
  | 'stale_assumption_detector'
  | 'confidence_calibrator'
  | 'speculative_amplifier_reducer'
  | 'governance_validation_gate'
  | 'explanation_fallback_gate'
  | 'hallucination_suppression'
  | 'unknown_state_normalizer'
  | 'epistemic_timeline'
  | 'temporal_drift_meter'
  | 'narrative_mutation_scan'
  | 'evidence_density_estimator'
  | 'recursive_belief_loop_scan'
  | 'memory_truth_divergence_probe'
  | 'cross_layer_agreement_meter'
  | 'truth_stability_scorer'
  | 'prediction_throttle'
  | 'consensus_revalidation_request'
  | 'mobile_lite_epistemic_scan'
  | 'deferred_deep_validation'
  | 'background_hallucination_batch'
  | 'epistemic_integrity_dashboard'
  | 'paper_trading_safety'
  | 'integrity_over_confidence'
  | 'no_certainty_escalation';

export type EpistemicIntegrityFeatureStatus = {
  id: EpistemicIntegrityFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type EpistemicIntegrityTruthCalibrationBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  epistemicState: EpistemicIntegrityState;
  epistemicStateLabelJa: string;
  epistemicHealthPct: number;
  confidenceCalibrationPct: number;
  rawConfidencePct: number;
  hallucinationRiskPct: number;
  unsupportedClaimsPct: number;
  temporalDriftPct: number;
  contradictionDensityPct: number;
  evidenceStabilityPct: number;
  speculativeExpansionPct: number;
  truthStabilityPct: number;
  unknownStateRatioPct: number;
  confidenceClampPct: number;
  explanationOnlyMode: boolean;
  explanationDowngradeActive: boolean;
  speculationSuppressed: boolean;
  predictionThrottleActive: boolean;
  consensusRevalidationRequested: boolean;
  orchestrationBudgetMax: number;
  epistemicSummaryJa: string;
  uncertaintyDisclaimerJa: string;
  epistemicHealthFormulaJa: string;
  confidenceCalibrationFormulaJa: string;
  hallucinationRiskFormulaJa: string;
  truthStabilityFormulaJa: string;
  epistemicFlowJa: string[];
  auditTargets: EpistemicAuditRow[];
  epistemicTimeline: EpistemicSnapshotPoint[];
  mobileRuntimeStateJa: string;
  explainRuleBasisJa: string;
  featureStatuses: EpistemicIntegrityFeatureStatus[];
};

export type BuildEpistemicIntegrityInput = {
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null;
  regime: AutonomousMarketRegimeDetectionBundle | null;
  consensus: CognitiveArbitrationConsensusBundle | null;
  metaReliability: MetaReliabilityLongitudinalTrustBundle | null;
  selfArchitecture: SelfEvolvingArchitectureReflectiveRefactorBundle | null;
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null;
  semantic: SemanticConsistencyDecisionCoherenceBundle | null;
  temporal: StateIntegrityTemporalConsistencyBundle | null;
  epistemicWeight: EpistemicReliabilityEvidenceWeightBundle | null;
  trace: ExplainableCognitiveTraceBundle | null;
  memory: RecursiveMemoryCompressionStrategicAbstractionBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  strategy: StrategyExecutionBundle | null;
  /** vitest / mock injection */
  mockUnsupportedClaimsBoost?: number;
  mockHallucinationDensityBoost?: number;
  mockContradictionBoost?: number;
  mockSpeculativeExpansionBoost?: number;
  mockConfidenceInflation?: number;
  mockEpistemicHealthPct?: number;
  auditStartedAt?: number;
};
