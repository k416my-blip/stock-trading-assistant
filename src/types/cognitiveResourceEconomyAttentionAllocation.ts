import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { ExecutionRecoveryAdaptiveConfidenceBundle } from './executionRecoveryAdaptiveConfidence';
import type { AutonomousMarketRegimeDetectionBundle } from './autonomousMarketRegimeDetection';
import type { CognitiveArbitrationConsensusBundle } from './cognitiveArbitrationConsensus';
import type { MetaReliabilityLongitudinalTrustBundle } from './metaReliabilityLongitudinalTrust';
import type { EpistemicIntegrityTruthCalibrationBundle } from './epistemicIntegrityTruthCalibration';
import type { StrategicMemoryGraphTemporalCausalityBundle } from './strategicMemoryGraphTemporalCausality';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from './metaCognitiveRiskReflectionSelfCritique';
import type { AdaptiveResourceComputeBudgetBundle } from './adaptiveResourceComputeBudget';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { StrategyExecutionBundle } from './strategyExecution';

export type ResourceEconomyState =
  | 'RESOURCE_BALANCED'
  | 'RESOURCE_STRESSED'
  | 'RESOURCE_FRAGMENTED'
  | 'RESOURCE_OVERLOADED'
  | 'RESOURCE_WASTEFUL'
  | 'RESOURCE_RECURSIVE_PRESSURE';

export type ResourceAuditTargetId =
  | 'attentionFocus'
  | 'computePressure'
  | 'recursiveCost'
  | 'reflectionFatigue'
  | 'layerUtility'
  | 'speculativeWaste'
  | 'latencyInflation'
  | 'batteryPressure'
  | 'backgroundLoad'
  | 'contradictionProcessingCost'
  | 'hallucinationComputeAmplification'
  | 'consensusOverhead'
  | 'orchestrationSaturation';

export type ResourceAuditSnapshot = {
  id: ResourceAuditTargetId;
  labelJa: string;
  loadPct: number;
  detailJa: string;
};

export type LayerUtilityRank = {
  layerId: string;
  labelJa: string;
  utilityPct: number;
  costPct: number;
};

export type EconomyTimelinePoint = {
  at: string;
  resourceHealthPct: number;
  resourceState: ResourceEconomyState;
  attentionEfficiencyPct: number;
};

export type CognitiveResourceEconomyFeatureId =
  | 'compute_metric_collector'
  | 'layer_utility_estimator'
  | 'attention_prioritizer'
  | 'recursion_suppressor'
  | 'speculative_compute_clamp'
  | 'mobile_budget_allocator'
  | 'orchestration_validator'
  | 'economy_timeline'
  | 'reflection_fatigue_guard'
  | 'hallucination_compute_guard'
  | 'background_load_batch'
  | 'deep_reflection_defer'
  | 'attention_narrowing'
  | 'priority_rebuild'
  | 'recursive_throttle'
  | 'speculative_freeze'
  | 'mobile_hard_clamp'
  | 'resource_economy_dashboard'
  | 'paper_trading_safety'
  | 'no_hidden_compute';

export type CognitiveResourceEconomyFeatureStatus = {
  id: CognitiveResourceEconomyFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type CognitiveResourceEconomyAttentionAllocationBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  hiddenComputeForbidden: true;
  autonomousEscalationForbidden: true;
  resourceState: ResourceEconomyState;
  resourceStateLabelJa: string;
  resourceHealthPct: number;
  attentionEfficiencyPct: number;
  computePressurePct: number;
  recursivePressurePct: number;
  orchestrationSaturationPct: number;
  speculativeWastePct: number;
  reflectionFatiguePct: number;
  batteryPressurePct: number;
  latencyInflationPct: number;
  computeWastePct: number;
  mobilePressurePct: number;
  explanationOnlyMode: boolean;
  attentionNarrowingActive: boolean;
  priorityRebuildActive: boolean;
  deepReflectionSuppressed: boolean;
  recursiveThrottleActive: boolean;
  speculativeComputeClampActive: boolean;
  mobileHardClampActive: boolean;
  orchestrationBudgetMax: number;
  economySummaryJa: string;
  resourceHealthFormulaJa: string;
  attentionEfficiencyFormulaJa: string;
  recursivePressureFormulaJa: string;
  computeWasteFormulaJa: string;
  mobilePressureFormulaJa: string;
  economyFlowJa: string[];
  auditTargets: ResourceAuditSnapshot[];
  layerUtilityRanking: LayerUtilityRank[];
  economyTimeline: EconomyTimelinePoint[];
  mobileRuntimeStateJa: string;
  explainRuleBasisJa: string;
  featureStatuses: CognitiveResourceEconomyFeatureStatus[];
};

export type BuildCognitiveResourceEconomyInput = {
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null;
  regime: AutonomousMarketRegimeDetectionBundle | null;
  consensus: CognitiveArbitrationConsensusBundle | null;
  metaReliability: MetaReliabilityLongitudinalTrustBundle | null;
  epistemic: EpistemicIntegrityTruthCalibrationBundle | null;
  strategicMemoryGraph: StrategicMemoryGraphTemporalCausalityBundle | null;
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null;
  resource: AdaptiveResourceComputeBudgetBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  strategy: StrategyExecutionBundle | null;
  batterySaver: boolean;
  memoryPressure: boolean;
  appForeground: boolean;
  refreshCount: number;
  /** vitest / mock recursive load */
  mockRecursiveLoadBoost?: number;
  mockComputeWasteBoost?: number;
  mockResourceHealthPct?: number;
  mockMobilePressureBoost?: number;
  auditStartedAt?: number;
};
