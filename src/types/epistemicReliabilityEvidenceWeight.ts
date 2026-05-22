import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { ExplainableCognitiveTraceBundle } from './explainableCognitiveTrace';
import type { ReactiveEventOrchestrationBundle } from './reactiveEventOrchestration';
import type { AdaptiveResourceComputeBudgetBundle } from './adaptiveResourceComputeBudget';
import type { StateIntegrityTemporalConsistencyBundle } from './stateIntegrityTemporalConsistency';
import type { SemanticConsistencyDecisionCoherenceBundle } from './semanticConsistencyDecisionCoherence';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { StrategyAction } from './strategyExecution';

export type EpistemicLayerId =
  | 'stability'
  | 'governance'
  | 'reactive'
  | 'resource'
  | 'temporal'
  | 'semantic'
  | 'cognitive_trace'
  | 'strategy'
  | 'data_reliability';

export type LayerReliabilityRow = {
  layerId: EpistemicLayerId;
  labelJa: string;
  reliabilityScore: number;
  evidenceWeightPct: number;
  freshnessPct: number;
  stale: boolean;
};

export type TrustMatrixEdge = {
  from: EpistemicLayerId;
  to: EpistemicLayerId;
  trustPct: number;
};

export type EvidenceWeightRow = {
  id: string;
  sourceJa: string;
  weightPct: number;
  ageMs: number | null;
  stale: boolean;
};

export type ReliabilityTimelinePoint = {
  at: string;
  healthScore: number;
  consensusPct: number;
};

export type EpistemicFeatureId =
  | 'layer_reliability_score'
  | 'dynamic_evidence_weight'
  | 'freshness_reliability_decay'
  | 'replay_corruption_penalty'
  | 'governance_authority_weight'
  | 'reactive_noise_suppression'
  | 'semantic_confidence_merge'
  | 'temporal_reliability_alignment'
  | 'cross_layer_trust_matrix'
  | 'contradiction_reliability_drop'
  | 'unsupported_claim_penalty'
  | 'source_consensus_weight'
  | 'stale_evidence_isolation'
  | 'reliability_drift_detector'
  | 'replay_trust_validator'
  | 'governance_override_authority'
  | 'confidence_saturation_guard'
  | 'hallucination_reliability_clamp'
  | 'ai_confidence_compression'
  | 'layer_trust_recovery'
  | 'reliability_replay_timeline'
  | 'evidence_aging_engine'
  | 'confidence_divergence_detector'
  | 'semantic_trust_alignment'
  | 'multi_layer_reliability_consensus'
  | 'explainability_reliability_merge'
  | 'reliability_freeze'
  | 'reliability_health_score'
  | 'reliability_dashboard'
  | 'emergency_reliability_fallback';

export type EpistemicFeatureStatus = {
  id: EpistemicFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type EpistemicReliabilityEvidenceWeightBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  reliabilityHealthScore: number;
  healthLabelJa: string;
  reliabilityConsensusPct: number;
  governanceAuthorityPct: number;
  replayTrustPct: number;
  semanticTrustPct: number;
  temporalTrustPct: number;
  confidenceDriftPct: number;
  reliabilityDriftPct: number;
  layerReliability: LayerReliabilityRow[];
  evidenceWeights: EvidenceWeightRow[];
  trustMatrix: TrustMatrixEdge[];
  staleEvidenceJa: string[];
  unsupportedClaimsJa: string[];
  reliabilityTimeline: ReliabilityTimelinePoint[];
  reliabilityFreeze: boolean;
  emergencyFallbackApplied: boolean;
  emergencyFallbackJa: string | null;
  reliabilityFormulaJa: string;
  evidenceWeightFormulaJa: string;
  freshnessDecayFormulaJa: string;
  contradictionPenaltyFormulaJa: string;
  consensusMergeFormulaJa: string;
  hallucinationClampFormulaJa: string;
  replayTrustFormulaJa: string;
  reliabilityFlowJa: string[];
  trustRecoveryFlowJa: string[];
  reliabilityFreezeFlowJa: string[];
  reliabilitySummaryJa: string;
  explainRuleBasisJa: string;
  featureStatuses: EpistemicFeatureStatus[];
};

export type BuildEpistemicReliabilityInput = {
  governance: AiGovernanceDecisionBundle | null;
  trace: ExplainableCognitiveTraceBundle | null;
  strategy: StrategyExecutionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  reactive: ReactiveEventOrchestrationBundle | null;
  resource: AdaptiveResourceComputeBudgetBundle | null;
  temporal: StateIntegrityTemporalConsistencyBundle | null;
  semantic: SemanticConsistencyDecisionCoherenceBundle | null;
  finalDecision: StrategyAction;
};
