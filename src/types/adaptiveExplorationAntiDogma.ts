import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { CognitiveArbitrationConsensusBundle } from './cognitiveArbitrationConsensus';
import type { EpistemicIntegrityTruthCalibrationBundle } from './epistemicIntegrityTruthCalibration';
import type { StrategicMemoryGraphTemporalCausalityBundle } from './strategicMemoryGraphTemporalCausality';
import type { CognitiveResourceEconomyAttentionAllocationBundle } from './cognitiveResourceEconomyAttentionAllocation';
import type { UnifiedCognitiveStateExecutiveAwarenessBundle } from './unifiedCognitiveStateExecutiveAwareness';
import type { HumanIntentContinuityAlignmentPreservationBundle } from './humanIntentContinuityAlignmentPreservation';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { StrategyExecutionBundle } from './strategyExecution';

export type ExplorationState =
  | 'EXPLORATION_BALANCED'
  | 'EXPLORATION_RIGID'
  | 'EXPLORATION_STAGNANT'
  | 'EXPLORATION_OVERCLAMPED'
  | 'EXPLORATION_UNCERTAIN'
  | 'EXPLORATION_UNSUPPORTED';

export type ExplorationAuditTargetId =
  | 'strategyRigidity'
  | 'consensusStagnation'
  | 'explanationRepetition'
  | 'epistemicRigidity'
  | 'orchestrationFixation'
  | 'reflectionLooping'
  | 'noveltyResistance'
  | 'explorationSuppression'
  | 'adaptiveFlexibility'
  | 'safeVariationCapacity'
  | 'multiPathTolerance'
  | 'uncertaintyAcceptance';

export type ExplorationAuditSnapshot = {
  id: ExplorationAuditTargetId;
  labelJa: string;
  scorePct: number;
  detailJa: string;
};

export type ExplorationTimelinePoint = {
  at: string;
  explorationHealthPct: number;
  explorationState: ExplorationState;
  safeExplorationMarginPct: number;
};

export type AdaptiveExplorationFeatureId =
  | 'rigidity_analyzer'
  | 'repetition_cache'
  | 'dogma_pressure_meter'
  | 'novelty_scorer'
  | 'perspective_widener'
  | 'safe_alternative_generator'
  | 'clamp_relaxation_hint'
  | 'uncertainty_acknowledgment'
  | 'fallback_freeze'
  | 'exploration_timeline'
  | 'no_autonomous_experiment'
  | 'no_hidden_exploration'
  | 'no_strategy_mutation'
  | 'no_human_intent_override'
  | 'mobile_lite_rigidity'
  | 'cached_repetition_metrics'
  | 'adaptive_exploration_dashboard'
  | 'paper_trading_safety';

export type AdaptiveExplorationFeatureStatus = {
  id: AdaptiveExplorationFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type AdaptiveExplorationAntiDogmaBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  autonomousExperimentationForbidden: true;
  hiddenExplorationForbidden: true;
  strategyMutationForbidden: true;
  humanIntentOverrideForbidden: true;
  strategyActionChangeForbidden: true;
  explorationState: ExplorationState;
  explorationStateLabelJa: string;
  explorationHealthPct: number;
  dogmaPressurePct: number;
  strategyRigidityPct: number;
  consensusStagnationPct: number;
  epistemicRigidityPct: number;
  noveltyBalancePct: number;
  adaptiveFlexibilityPct: number;
  safeExplorationMarginPct: number;
  unsupportedExplorationRiskPct: number;
  explanationOnlyMode: boolean;
  perspectiveWideningActive: boolean;
  safeAlternativeGenerationActive: boolean;
  clampRelaxationSuggestionActive: boolean;
  uncertaintyAcknowledgmentActive: boolean;
  fallbackFreezeActive: boolean;
  orchestrationBudgetMax: number;
  explorationSummaryJa: string;
  explorationHealthFormulaJa: string;
  dogmaPressureFormulaJa: string;
  safeExplorationMarginFormulaJa: string;
  noveltyBalanceFormulaJa: string;
  explorationFlowJa: string[];
  auditTargets: ExplorationAuditSnapshot[];
  explorationTimeline: ExplorationTimelinePoint[];
  mobileRuntimeStateJa: string;
  explainRuleBasisJa: string;
  featureStatuses: AdaptiveExplorationFeatureStatus[];
};

export type BuildAdaptiveExplorationInput = {
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  consensus: CognitiveArbitrationConsensusBundle | null;
  epistemic: EpistemicIntegrityTruthCalibrationBundle | null;
  strategicMemoryGraph: StrategicMemoryGraphTemporalCausalityBundle | null;
  cognitiveResourceEconomy: CognitiveResourceEconomyAttentionAllocationBundle | null;
  unifiedCognitiveState: UnifiedCognitiveStateExecutiveAwarenessBundle | null;
  humanIntentContinuity: HumanIntentContinuityAlignmentPreservationBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  strategy: StrategyExecutionBundle | null;
  refreshCount: number;
  mockDogmaPressureBoost?: number;
  mockStrategyRigidityBoost?: number;
  mockConsensusStagnationBoost?: number;
  mockUnsupportedExplorationBoost?: number;
  mockExplorationHealthPct?: number;
  mockUncertaintyAcceptancePct?: number;
  mockDogmaPressurePct?: number;
  auditStartedAt?: number;
};
