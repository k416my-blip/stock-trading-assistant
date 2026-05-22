import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { ExecutionRecoveryAdaptiveConfidenceBundle } from './executionRecoveryAdaptiveConfidence';
import type { AutonomousMarketRegimeDetectionBundle } from './autonomousMarketRegimeDetection';
import type { CognitiveArbitrationConsensusBundle } from './cognitiveArbitrationConsensus';
import type { MetaReliabilityLongitudinalTrustBundle } from './metaReliabilityLongitudinalTrust';
import type { SelfEvolvingArchitectureReflectiveRefactorBundle } from './selfEvolvingArchitectureReflectiveRefactor';
import type { EpistemicIntegrityTruthCalibrationBundle } from './epistemicIntegrityTruthCalibration';
import type { StrategicMemoryGraphTemporalCausalityBundle } from './strategicMemoryGraphTemporalCausality';
import type { CognitiveResourceEconomyAttentionAllocationBundle } from './cognitiveResourceEconomyAttentionAllocation';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { StrategyExecutionBundle } from './strategyExecution';

export type ExecutiveState =
  | 'EXECUTIVE_STABLE'
  | 'EXECUTIVE_STRAINED'
  | 'EXECUTIVE_FRAGMENTED'
  | 'EXECUTIVE_UNCERTAIN'
  | 'EXECUTIVE_RECURSIVE_RISK'
  | 'EXECUTIVE_EMERGENCY';

export type LayerStateInputId =
  | 'stabilityHealth'
  | 'recoveryHealth'
  | 'regimeConfidence'
  | 'consensusIntegrity'
  | 'metaReliability'
  | 'epistemicIntegrity'
  | 'strategicCoherence'
  | 'resourceHealth'
  | 'recursivePressure'
  | 'orchestrationSaturation'
  | 'latencyPressure'
  | 'trustHealth'
  | 'memoryContinuity'
  | 'causalContinuity'
  | 'contradictionPressure'
  | 'hallucinationRisk'
  | 'mobilePressure';

export type LayerStateSnapshot = {
  id: LayerStateInputId;
  labelJa: string;
  valuePct: number;
  detailJa: string;
};

export type ExecutiveTimelinePoint = {
  at: string;
  executiveHealthPct: number;
  executiveState: ExecutiveState;
  safeReasoningDepthPct: number;
};

export type UnifiedCognitiveFeatureId =
  | 'layer_state_collector'
  | 'integrity_normalizer'
  | 'executive_coherence_calculator'
  | 'fragmentation_detector'
  | 'recursive_instability_detector'
  | 'safe_reasoning_depth_gate'
  | 'orchestration_mode_selector'
  | 'executive_timeline'
  | 'governance_priority_guard'
  | 'no_hidden_cognition'
  | 'no_self_direction'
  | 'prediction_throttle'
  | 'recursive_shutdown'
  | 'explanation_only_fallback'
  | 'deep_reasoning_freeze'
  | 'mobile_lite_aggregation'
  | 'executive_cache_reuse'
  | 'unified_cognitive_dashboard'
  | 'paper_trading_safety';

export type UnifiedCognitiveFeatureStatus = {
  id: UnifiedCognitiveFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type UnifiedCognitiveStateExecutiveAwarenessBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  hiddenCognitionForbidden: true;
  autonomousSelfDirectionForbidden: true;
  strategyActionChangeForbidden: true;
  executiveState: ExecutiveState;
  executiveStateLabelJa: string;
  executiveHealthPct: number;
  globalCoherencePct: number;
  safeReasoningDepthPct: number;
  recursiveDangerPct: number;
  orchestrationSaturationPct: number;
  hallucinationRiskPct: number;
  trustHealthPct: number;
  contradictionPressurePct: number;
  fragmentationScorePct: number;
  reasoningModeJa: string;
  orchestrationModeJa: string;
  explanationOnlyMode: boolean;
  predictionThrottleActive: boolean;
  recursiveSuppressionActive: boolean;
  deepReasoningFreezeActive: boolean;
  priorityCoherenceRebuildActive: boolean;
  reduceReasoningDepthActive: boolean;
  orchestrationBudgetMax: number;
  executiveSummaryJa: string;
  executiveHealthFormulaJa: string;
  globalCoherenceFormulaJa: string;
  safeReasoningDepthFormulaJa: string;
  recursiveDangerFormulaJa: string;
  executiveFlowJa: string[];
  layerStates: LayerStateSnapshot[];
  executiveTimeline: ExecutiveTimelinePoint[];
  mobileRuntimeStateJa: string;
  explainRuleBasisJa: string;
  featureStatuses: UnifiedCognitiveFeatureStatus[];
};

export type BuildUnifiedCognitiveStateInput = {
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null;
  regime: AutonomousMarketRegimeDetectionBundle | null;
  consensus: CognitiveArbitrationConsensusBundle | null;
  metaReliability: MetaReliabilityLongitudinalTrustBundle | null;
  selfArchitecture: SelfEvolvingArchitectureReflectiveRefactorBundle | null;
  epistemic: EpistemicIntegrityTruthCalibrationBundle | null;
  strategicMemoryGraph: StrategicMemoryGraphTemporalCausalityBundle | null;
  cognitiveResourceEconomy: CognitiveResourceEconomyAttentionAllocationBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  strategy: StrategyExecutionBundle | null;
  batterySaver: boolean;
  memoryPressure: boolean;
  appForeground: boolean;
  refreshCount: number;
  mockContradictionPressureBoost?: number;
  mockHallucinationRiskBoost?: number;
  mockRecursiveDangerBoost?: number;
  mockExecutiveHealthPct?: number;
  mockGlobalCoherencePct?: number;
  auditStartedAt?: number;
};
