import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { CognitiveArbitrationConsensusBundle } from './cognitiveArbitrationConsensus';
import type { MetaReliabilityLongitudinalTrustBundle } from './metaReliabilityLongitudinalTrust';
import type { EpistemicIntegrityTruthCalibrationBundle } from './epistemicIntegrityTruthCalibration';
import type { StrategicMemoryGraphTemporalCausalityBundle } from './strategicMemoryGraphTemporalCausality';
import type { CognitiveResourceEconomyAttentionAllocationBundle } from './cognitiveResourceEconomyAttentionAllocation';
import type { UnifiedCognitiveStateExecutiveAwarenessBundle } from './unifiedCognitiveStateExecutiveAwareness';
import type { HumanIntentContinuityAlignmentPreservationBundle } from './humanIntentContinuityAlignmentPreservation';
import type { AdaptiveExplorationAntiDogmaBundle } from './adaptiveExplorationAntiDogma';
import type { ConstitutionalGovernanceSystemCoherenceBundle } from './constitutionalGovernanceSystemCoherence';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { StrategyExecutionBundle } from './strategyExecution';

export type ExplainableState =
  | 'EXPLAINABLE_OK'
  | 'EXPLAINABLE_PARTIAL'
  | 'EXPLAINABLE_OPAQUE'
  | 'EXPLAINABLE_CONTRADICTED'
  | 'EXPLAINABLE_UNSUPPORTED'
  | 'EXPLAINABLE_RISK';

export type ExplainableAuditTargetId =
  | 'governanceExplainability'
  | 'reasoningTransparency'
  | 'decisionTraceability'
  | 'downgradeExplainability'
  | 'freezeExplainability'
  | 'overrideAccountability'
  | 'constitutionalAuditability'
  | 'uncertaintyDisclosureIntegrity'
  | 'safeSummaryIntegrity'
  | 'hallucinatedExplanationRisk'
  | 'unsupportedExplanationRisk'
  | 'explanationConsistency';

export type ExplainableAuditSnapshot = {
  id: ExplainableAuditTargetId;
  labelJa: string;
  scorePct: number;
  detailJa: string;
};

export type SafeGovernanceRationale = {
  layerId: string;
  layerLabelJa: string;
  rationaleJa: string;
  kind: 'downgrade' | 'freeze' | 'override' | 'orchestration' | 'uncertainty';
};

export type ExplainableTimelinePoint = {
  at: string;
  explainabilityHealthPct: number;
  explainableState: ExplainableState;
  transparencyScorePct: number;
};

export type ExplainableFeatureId =
  | 'safe_summary_cache'
  | 'rationale_generator'
  | 'downgrade_reason_attacher'
  | 'freeze_reason_attacher'
  | 'orchestration_summary'
  | 'override_accountability'
  | 'uncertainty_disclosure'
  | 'constitutional_precedence_explain'
  | 'no_raw_cot'
  | 'no_hidden_reasoning'
  | 'no_latent_exposure'
  | 'explanation_suppression'
  | 'fallback_explanation'
  | 'consistency_rebuild'
  | 'minimal_governance_summary'
  | 'explainable_timeline'
  | 'mobile_lite_rationale'
  | 'explainable_dashboard'
  | 'paper_trading_safety';

export type ExplainableFeatureStatus = {
  id: ExplainableFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type ExplainableGovernanceTransparentReasoningBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  internalHiddenReasoningForbidden: true;
  rawChainOfThoughtForbidden: true;
  latentReasoningExposureForbidden: true;
  hiddenPromptExposureForbidden: true;
  hiddenGovernanceExposureForbidden: true;
  selfExplanationHallucinationForbidden: true;
  unsupportedExplanationForbidden: true;
  persuasionExplanationForbidden: true;
  fabricatedRationaleForbidden: true;
  strategyActionChangeForbidden: true;
  explainableState: ExplainableState;
  explainableStateLabelJa: string;
  explainabilityHealthPct: number;
  transparencyScorePct: number;
  safeExplanationIntegrityPct: number;
  explanationRiskPct: number;
  explanationConsistencyPct: number;
  governanceExplainabilityPct: number;
  reasoningTransparencyPct: number;
  decisionTraceabilityPct: number;
  downgradeExplainabilityPct: number;
  freezeExplainabilityPct: number;
  overrideAccountabilityPct: number;
  constitutionalAuditabilityPct: number;
  uncertaintyDisclosurePct: number;
  hallucinatedExplanationRiskPct: number;
  unsupportedExplanationRiskPct: number;
  explanationOnlyMode: boolean;
  safeSimplificationActive: boolean;
  fallbackExplanationMode: boolean;
  explanationSuppressionActive: boolean;
  consistencyRebuildActive: boolean;
  orchestrationBudgetMax: number;
  explainableSummaryJa: string;
  orchestrationRationaleJa: string;
  downgradeReasonsJa: string[];
  freezeReasonsJa: string[];
  overrideAccountabilityJa: string[];
  uncertaintyDisclosureJa: string[];
  safeRationales: SafeGovernanceRationale[];
  explainabilityHealthFormulaJa: string;
  transparencyScoreFormulaJa: string;
  safeExplanationIntegrityFormulaJa: string;
  explanationRiskFormulaJa: string;
  explainableFlowJa: string[];
  auditTargets: ExplainableAuditSnapshot[];
  explainableTimeline: ExplainableTimelinePoint[];
  mobileRuntimeStateJa: string;
  explainRuleBasisJa: string;
  featureStatuses: ExplainableFeatureStatus[];
};

export type BuildExplainableGovernanceInput = {
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  consensus: CognitiveArbitrationConsensusBundle | null;
  metaReliability: MetaReliabilityLongitudinalTrustBundle | null;
  epistemic: EpistemicIntegrityTruthCalibrationBundle | null;
  strategicMemoryGraph: StrategicMemoryGraphTemporalCausalityBundle | null;
  cognitiveResourceEconomy: CognitiveResourceEconomyAttentionAllocationBundle | null;
  unifiedCognitiveState: UnifiedCognitiveStateExecutiveAwarenessBundle | null;
  humanIntentContinuity: HumanIntentContinuityAlignmentPreservationBundle | null;
  adaptiveExploration: AdaptiveExplorationAntiDogmaBundle | null;
  constitutionalGovernance: ConstitutionalGovernanceSystemCoherenceBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  strategy: StrategyExecutionBundle | null;
  refreshCount: number;
  mockTransparencyScorePct?: number;
  mockExplanationRiskPct?: number;
  mockUnsupportedExplanationBoost?: number;
  mockExplanationConsistencyPct?: number;
  mockExplainabilityHealthPct?: number;
  mockHallucinatedExplanationBoost?: number;
  auditStartedAt?: number;
};
