import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { ExecutionRecoveryAdaptiveConfidenceBundle } from './executionRecoveryAdaptiveConfidence';
import type { AutonomousMarketRegimeDetectionBundle } from './autonomousMarketRegimeDetection';
import type { CognitiveArbitrationConsensusBundle } from './cognitiveArbitrationConsensus';
import type { MetaReliabilityLongitudinalTrustBundle } from './metaReliabilityLongitudinalTrust';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from './metaCognitiveRiskReflectionSelfCritique';
import type { SemanticConsistencyDecisionCoherenceBundle } from './semanticConsistencyDecisionCoherence';
import type { RecursiveMemoryCompressionStrategicAbstractionBundle } from './recursiveMemoryCompressionStrategicAbstraction';
import type { StrategyExecutionBundle } from './strategyExecution';

export type ArchitectureStructureState =
  | 'ARCH_STABLE'
  | 'ARCH_REDUNDANT'
  | 'ARCH_FRAGMENTED'
  | 'ARCH_OVEREXPANDED'
  | 'ARCH_RECURSIVE_RISK'
  | 'ARCH_MOBILE_PRESSURE'
  | 'ARCH_UNSUPPORTED_STRUCTURE';

export type ArchitectureAuditTargetId =
  | 'layerRedundancy'
  | 'orchestrationComplexity'
  | 'semanticOverlap'
  | 'unusedGovernancePaths'
  | 'staleRecoveryPaths'
  | 'recursiveDepthInflation'
  | 'dashboardBloat'
  | 'memoryFragmentation'
  | 'reflectionLoopDensity'
  | 'orchestrationLatency'
  | 'mobileBudgetPressure'
  | 'adaptiveConflictDensity';

export type OptimizationProposalKind =
  | 'merge_candidate_layers'
  | 'stale_recovery_removal'
  | 'orchestration_simplification'
  | 'mobile_downgrade_suggestion'
  | 'dashboard_lazy_hydration'
  | 'memory_cache_normalization'
  | 'reflection_throttle'
  | 'pipeline_simplify'
  | 'layer_freeze_recommendation'
  | 'minimal_orchestration'
  | 'safe_mode_architecture';

export type OptimizationProposal = {
  id: string;
  kind: OptimizationProposalKind;
  labelJa: string;
  detailJa: string;
  sandboxOnly: true;
  requiresGovernanceApproval: true;
  automaticApplyForbidden: true;
};

export type ArchitectureAuditRow = {
  id: ArchitectureAuditTargetId;
  labelJa: string;
  scorePct: number;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type ArchitectureSnapshotPoint = {
  at: string;
  architectureHealthPct: number;
  structureState: ArchitectureStructureState;
  redundancyPct: number;
  recursiveInflationPct: number;
};

export type SelfArchitectureFeatureId =
  | 'architecture_metrics_collector'
  | 'overlap_detector'
  | 'fragmentation_detector'
  | 'recursive_inflation_scanner'
  | 'mobile_pressure_estimator'
  | 'optimization_proposal_generator'
  | 'governance_validation_gate'
  | 'orchestration_review_handoff'
  | 'proposal_only_guard'
  | 'no_auto_refactor_guard'
  | 'no_runtime_mutation_guard'
  | 'sandbox_reflective_optimizer'
  | 'architecture_timeline'
  | 'stale_pipeline_detector'
  | 'dashboard_bloat_meter'
  | 'memory_fragmentation_probe'
  | 'reflection_density_meter'
  | 'latency_penalty_tracker'
  | 'governance_approval_tracker'
  | 'unsupported_structure_guard'
  | 'mobile_lite_scan'
  | 'lazy_dashboard_hydration_hint'
  | 'background_proposal_batch'
  | 'self_architecture_dashboard'
  | 'paper_trading_safety'
  | 'structure_audit_only';

export type SelfArchitectureFeatureStatus = {
  id: SelfArchitectureFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type SelfEvolvingArchitectureReflectiveRefactorBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  automaticRefactorForbidden: true;
  runtimeMutationForbidden: true;
  proposalOnlyMode: true;
  sandboxReflectiveOnly: true;
  structureState: ArchitectureStructureState;
  structureStateLabelJa: string;
  architectureHealthPct: number;
  redundancyPct: number;
  fragmentationPct: number;
  recursiveInflationPct: number;
  orchestrationComplexityPct: number;
  latencyPenaltyPct: number;
  mobilePressurePct: number;
  reflectionDensityPct: number;
  stalePipelinesPct: number;
  semanticOverlapPct: number;
  governanceApprovalPending: boolean;
  governanceApprovalStateJa: string;
  unsupportedStructureRiskPct: number;
  orchestrationBudgetMax: number;
  orchestrationReviewJa: string;
  optimizationProposals: OptimizationProposal[];
  architectureSummaryJa: string;
  uncertaintyDisclaimerJa: string;
  architectureHealthFormulaJa: string;
  recursiveInflationFormulaJa: string;
  mobilePressureFormulaJa: string;
  redundancyFormulaJa: string;
  architectureFlowJa: string[];
  auditTargets: ArchitectureAuditRow[];
  architectureTimeline: ArchitectureSnapshotPoint[];
  mobileRuntimeStateJa: string;
  explainRuleBasisJa: string;
  featureStatuses: SelfArchitectureFeatureStatus[];
};

export type BuildSelfEvolvingArchitectureInput = {
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null;
  regime: AutonomousMarketRegimeDetectionBundle | null;
  consensus: CognitiveArbitrationConsensusBundle | null;
  metaReliability: MetaReliabilityLongitudinalTrustBundle | null;
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null;
  semantic: SemanticConsistencyDecisionCoherenceBundle | null;
  memory: RecursiveMemoryCompressionStrategicAbstractionBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  strategy: StrategyExecutionBundle | null;
  memoryPressure: boolean;
  batterySaver: boolean;
  /** vitest / mock layer increase */
  mockLayerRedundancyBoost?: number;
  mockRecursiveInflationBoost?: number;
  mockMobilePressureBoost?: number;
  mockArchitectureHealthPct?: number;
  auditStartedAt?: number;
};
