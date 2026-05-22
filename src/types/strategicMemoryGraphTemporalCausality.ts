import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { ExecutionRecoveryAdaptiveConfidenceBundle } from './executionRecoveryAdaptiveConfidence';
import type { AutonomousMarketRegimeDetectionBundle } from './autonomousMarketRegimeDetection';
import type { CognitiveArbitrationConsensusBundle } from './cognitiveArbitrationConsensus';
import type { MetaReliabilityLongitudinalTrustBundle } from './metaReliabilityLongitudinalTrust';
import type { SelfEvolvingArchitectureReflectiveRefactorBundle } from './selfEvolvingArchitectureReflectiveRefactor';
import type { EpistemicIntegrityTruthCalibrationBundle } from './epistemicIntegrityTruthCalibration';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from './metaCognitiveRiskReflectionSelfCritique';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { StrategyExecutionBundle } from './strategyExecution';

export type GraphStructureState =
  | 'GRAPH_STABLE'
  | 'GRAPH_FRAGMENTED'
  | 'GRAPH_OVERCONNECTED'
  | 'GRAPH_TEMPORALLY_DRIFTING'
  | 'GRAPH_CONTRADICTED'
  | 'GRAPH_CAUSALITY_UNCERTAIN';

export type CausalNodeId =
  | 'governanceActions'
  | 'recoveryEvents'
  | 'regimeTransitions'
  | 'confidenceChanges'
  | 'hallucinationEvents'
  | 'consensusConflicts'
  | 'contradictionBursts'
  | 'freezeEscalations'
  | 'rollbackEvents'
  | 'macroStateChanges'
  | 'riskStateChanges'
  | 'stabilityBreaks'
  | 'orchestrationDecisions'
  | 'userBehaviorPatterns';

export type CausalEdgeKind =
  | 'causedBy'
  | 'correlatedWith'
  | 'precededBy'
  | 'stabilizedBy'
  | 'degradedBy'
  | 'contradictedBy'
  | 'recoveredBy'
  | 'suppressedBy'
  | 'escalatedBy';

export type CausalNodeSnapshot = {
  id: CausalNodeId;
  labelJa: string;
  active: boolean;
  weightPct: number;
  lastEventJa: string;
};

export type CausalEdgeSnapshot = {
  id: string;
  from: CausalNodeId;
  to: CausalNodeId;
  kind: CausalEdgeKind;
  confidencePct: number;
  hypothesisOnly: true;
  detailJa: string;
};

export type GraphTimelinePoint = {
  at: string;
  graphHealthPct: number;
  graphState: GraphStructureState;
  edgeCount: number;
};

export type StrategicMemoryGraphFeatureId =
  | 'event_snapshot_collector'
  | 'temporal_ordering'
  | 'causal_edge_estimator'
  | 'contradiction_detector'
  | 'confidence_decay_tracker'
  | 'unsupported_causality_suppressor'
  | 'governance_validation_gate'
  | 'graph_timeline'
  | 'correlation_causation_separator'
  | 'hallucination_propagation_guard'
  | 'recursive_loop_pruner'
  | 'timeline_rebuild'
  | 'memory_simplification'
  | 'causal_freeze'
  | 'consensus_rebuild_request'
  | 'mobile_lite_traversal'
  | 'compressed_temporal_edges'
  | 'deferred_causal_reconstruction'
  | 'background_graph_pruning'
  | 'strategic_memory_dashboard'
  | 'paper_trading_safety'
  | 'no_hidden_learning'
  | 'hypothesis_only_causality';

export type StrategicMemoryGraphFeatureStatus = {
  id: StrategicMemoryGraphFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type StrategicMemoryGraphTemporalCausalityBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  selfModifyingForbidden: true;
  hiddenLearningForbidden: true;
  causalHypothesisOnly: true;
  graphState: GraphStructureState;
  graphStateLabelJa: string;
  graphHealthPct: number;
  causalConfidencePct: number;
  timelineContinuityPct: number;
  contradictionDensityPct: number;
  recursiveLoopRiskPct: number;
  hallucinationPropagationPct: number;
  memoryIntegrityPct: number;
  unsupportedCausalityPct: number;
  edgeDensityPct: number;
  causalDriftPct: number;
  temporalFragmentationPct: number;
  explanationOnlyMode: boolean;
  causalFreezeActive: boolean;
  consensusRebuildRequested: boolean;
  edgePruningActive: boolean;
  timelineRebuildActive: boolean;
  orchestrationBudgetMax: number;
  graphSummaryJa: string;
  uncertaintyDisclaimerJa: string;
  graphHealthFormulaJa: string;
  causalConfidenceFormulaJa: string;
  memoryIntegrityFormulaJa: string;
  hallucinationPropagationFormulaJa: string;
  graphFlowJa: string[];
  causalNodes: CausalNodeSnapshot[];
  causalEdges: CausalEdgeSnapshot[];
  graphTimeline: GraphTimelinePoint[];
  mobileRuntimeStateJa: string;
  explainRuleBasisJa: string;
  featureStatuses: StrategicMemoryGraphFeatureStatus[];
};

export type BuildStrategicMemoryGraphInput = {
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null;
  regime: AutonomousMarketRegimeDetectionBundle | null;
  consensus: CognitiveArbitrationConsensusBundle | null;
  metaReliability: MetaReliabilityLongitudinalTrustBundle | null;
  selfArchitecture: SelfEvolvingArchitectureReflectiveRefactorBundle | null;
  epistemic: EpistemicIntegrityTruthCalibrationBundle | null;
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  strategy: StrategyExecutionBundle | null;
  refreshCount: number;
  /** vitest / mock event chain */
  mockEventChainBoost?: number;
  mockUnsupportedCausalityBoost?: number;
  mockRecursiveLoopsBoost?: number;
  mockContradictionBoost?: number;
  mockGraphHealthPct?: number;
  auditStartedAt?: number;
};
