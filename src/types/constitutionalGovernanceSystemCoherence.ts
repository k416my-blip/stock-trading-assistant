import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { CognitiveArbitrationConsensusBundle } from './cognitiveArbitrationConsensus';
import type { EpistemicIntegrityTruthCalibrationBundle } from './epistemicIntegrityTruthCalibration';
import type { StrategicMemoryGraphTemporalCausalityBundle } from './strategicMemoryGraphTemporalCausality';
import type { CognitiveResourceEconomyAttentionAllocationBundle } from './cognitiveResourceEconomyAttentionAllocation';
import type { UnifiedCognitiveStateExecutiveAwarenessBundle } from './unifiedCognitiveStateExecutiveAwareness';
import type { HumanIntentContinuityAlignmentPreservationBundle } from './humanIntentContinuityAlignmentPreservation';
import type { AdaptiveExplorationAntiDogmaBundle } from './adaptiveExplorationAntiDogma';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { StrategyExecutionBundle } from './strategyExecution';

export type ConstitutionalState =
  | 'CONSTITUTIONAL_STABLE'
  | 'CONSTITUTIONAL_CONFLICT'
  | 'CONSTITUTIONAL_FRAGMENTED'
  | 'CONSTITUTIONAL_COLLISION'
  | 'CONSTITUTIONAL_EMERGENCY'
  | 'CONSTITUTIONAL_UNSUPPORTED';

export type ConstitutionalAuditTargetId =
  | 'governanceHierarchyIntegrity'
  | 'systemCoherence'
  | 'orchestrationConsistency'
  | 'stateConflictPressure'
  | 'clampCollisionRisk'
  | 'priorityIntegrity'
  | 'constitutionalAlignment'
  | 'overrideSuppression'
  | 'contradictionPressure'
  | 'recursiveGovernanceRisk'
  | 'fallbackConsistency'
  | 'emergencyPrecedenceIntegrity';

export type ConstitutionalAuditSnapshot = {
  id: ConstitutionalAuditTargetId;
  labelJa: string;
  scorePct: number;
  detailJa: string;
};

export type ConstitutionalTimelinePoint = {
  at: string;
  constitutionalHealthPct: number;
  constitutionalState: ConstitutionalState;
  systemStabilityIndexPct: number;
};

export type ConstitutionalFeatureId =
  | 'precedence_tree_cache'
  | 'conflict_arbitrator'
  | 'override_registry'
  | 'clamp_priority_table'
  | 'hierarchy_enforcer'
  | 'coherence_scorer'
  | 'precedence_arbitration'
  | 'override_freeze'
  | 'hierarchy_rebuild_hint'
  | 'constitutional_emergency'
  | 'fallback_freeze'
  | 'downgrade_cascade_audit'
  | 'recursive_governance_detector'
  | 'no_self_amendment'
  | 'no_layer_bypass'
  | 'constitutional_timeline'
  | 'mobile_lite_arbitration'
  | 'constitutional_dashboard'
  | 'paper_trading_safety';

export type ConstitutionalFeatureStatus = {
  id: ConstitutionalFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type ConstitutionalGovernanceSystemCoherenceBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  constitutionalGovernanceSupreme: true;
  hiddenAuthorityForbidden: true;
  recursiveGovernanceForbidden: true;
  autonomousConstitutionalRewriteForbidden: true;
  selfAmendmentForbidden: true;
  layerBypassForbidden: true;
  humanIntentOverrideForbidden: true;
  strategyOverrideForbidden: true;
  strategyActionChangeForbidden: true;
  constitutionalState: ConstitutionalState;
  constitutionalStateLabelJa: string;
  constitutionalHealthPct: number;
  systemCoherencePct: number;
  conflictPressurePct: number;
  clampCollisionRiskPct: number;
  governanceHierarchyIntegrityPct: number;
  precedenceIntegrityPct: number;
  contradictionPressurePct: number;
  orchestrationConsistencyPct: number;
  systemStabilityIndexPct: number;
  unsupportedGovernanceRiskPct: number;
  emergencyPrecedenceIntegrityPct: number;
  explanationOnlyMode: boolean;
  precedenceArbitrationActive: boolean;
  overrideFreezeActive: boolean;
  hierarchyRebuildSuggestionActive: boolean;
  constitutionalEmergencyActive: boolean;
  fallbackFreezeActive: boolean;
  orchestrationBudgetMax: number;
  constitutionalSummaryJa: string;
  constitutionalHealthFormulaJa: string;
  conflictPressureFormulaJa: string;
  precedenceIntegrityFormulaJa: string;
  systemStabilityIndexFormulaJa: string;
  constitutionalPrecedenceJa: string[];
  constitutionalFlowJa: string[];
  auditTargets: ConstitutionalAuditSnapshot[];
  constitutionalTimeline: ConstitutionalTimelinePoint[];
  mobileRuntimeStateJa: string;
  explainRuleBasisJa: string;
  featureStatuses: ConstitutionalFeatureStatus[];
};

export type BuildConstitutionalGovernanceInput = {
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  consensus: CognitiveArbitrationConsensusBundle | null;
  epistemic: EpistemicIntegrityTruthCalibrationBundle | null;
  strategicMemoryGraph: StrategicMemoryGraphTemporalCausalityBundle | null;
  cognitiveResourceEconomy: CognitiveResourceEconomyAttentionAllocationBundle | null;
  unifiedCognitiveState: UnifiedCognitiveStateExecutiveAwarenessBundle | null;
  humanIntentContinuity: HumanIntentContinuityAlignmentPreservationBundle | null;
  adaptiveExploration: AdaptiveExplorationAntiDogmaBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  strategy: StrategyExecutionBundle | null;
  refreshCount: number;
  mockConflictPressureBoost?: number;
  mockClampCollisionBoost?: number;
  mockUnsupportedGovernanceBoost?: number;
  mockConstitutionalHealthPct?: number;
  mockEmergencyPrecedenceIntegrityPct?: number;
  mockConflictPressurePct?: number;
  auditStartedAt?: number;
};
