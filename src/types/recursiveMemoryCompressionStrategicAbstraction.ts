import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { ExplainableCognitiveTraceBundle } from './explainableCognitiveTrace';
import type { ReactiveEventOrchestrationBundle } from './reactiveEventOrchestration';
import type { AdaptiveResourceComputeBudgetBundle } from './adaptiveResourceComputeBudget';
import type { StateIntegrityTemporalConsistencyBundle } from './stateIntegrityTemporalConsistency';
import type { SemanticConsistencyDecisionCoherenceBundle } from './semanticConsistencyDecisionCoherence';
import type { EpistemicReliabilityEvidenceWeightBundle } from './epistemicReliabilityEvidenceWeight';
import type { CognitiveGoalArbitrationIntentPriorityBundle } from './cognitiveGoalArbitrationIntentPriority';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from './metaCognitiveRiskReflectionSelfCritique';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { StrategyAction } from './strategyExecution';

export type CompressedTimelineChunk = {
  id: string;
  periodJa: string;
  summaryJa: string;
  entropyBefore: number;
  entropyAfter: number;
};

export type MetaStateSnapshot = {
  id: string;
  at: string;
  abstractionLevel: number;
  bytesEstimate: number;
};

export type MemoryCompressionFeatureId =
  | 'recursive_memory_compressor'
  | 'strategic_abstraction_engine'
  | 'narrative_deduplication'
  | 'timeline_entropy_reducer'
  | 'context_window_optimizer'
  | 'semantic_density_balancer'
  | 'drift_memory_pruner'
  | 'replay_compression_engine'
  | 'governance_snapshot_generator'
  | 'layer_state_aggregator'
  | 'longitudinal_summary_compressor'
  | 'reflection_archive_optimizer'
  | 'arbitration_history_reducer'
  | 'contradiction_archive_compressor'
  | 'unsupported_claim_decay'
  | 'confidence_history_quantizer'
  | 'freeze_timeline_condenser'
  | 'meta_state_snapshot_engine'
  | 'hierarchical_memory_layering'
  | 'temporal_chunk_partitioning'
  | 'recursive_context_sanitizer'
  | 'ai_cognitive_load_estimator'
  | 'memory_saturation_detector'
  | 'replay_corruption_isolation'
  | 'context_recovery_engine'
  | 'safe_compression_mode'
  | 'emergency_context_collapse'
  | 'snapshot_recovery_engine'
  | 'compression_dashboard'
  | 'cognitive_stability_freeze';

export type MemoryCompressionFeatureStatus = {
  id: MemoryCompressionFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type RecursiveMemoryCompressionStrategicAbstractionBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  memorySaturationPct: number;
  contextLoadPct: number;
  replaySizeBytes: number;
  abstractionLevel: number;
  compressionRatioPct: number;
  replayCorruptionDetected: boolean;
  recursiveDepth: number;
  timelineEntropyPct: number;
  semanticDensityPct: number;
  snapshotCount: number;
  recoveryHealthPct: number;
  cognitiveLoadPct: number;
  safeCompressionMode: boolean;
  emergencyContextCollapse: boolean;
  cognitiveStabilityFreeze: boolean;
  replayIsolated: boolean;
  contextOverflowRisk: boolean;
  compressionSummaryJa: string;
  abstractedNarrativeJa: string;
  compressedTimeline: CompressedTimelineChunk[];
  metaSnapshots: MetaStateSnapshot[];
  entropyReductionFormulaJa: string;
  recursiveDepthFormulaJa: string;
  compressionRatioFormulaJa: string;
  memorySaturationFormulaJa: string;
  replayIsolationFlowJa: string[];
  snapshotRecoveryFlowJa: string[];
  emergencyCollapseFlowJa: string[];
  compressionFlowJa: string[];
  abstractionFlowJa: string[];
  explainRuleBasisJa: string;
  featureStatuses: MemoryCompressionFeatureStatus[];
};

export type BuildMemoryCompressionInput = {
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
  finalDecision: StrategyAction;
};
