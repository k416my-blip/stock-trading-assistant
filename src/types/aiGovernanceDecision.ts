import type { StrategyAction } from './strategyExecution';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { PortfolioRiskExposureBundle } from './portfolioRiskExposure';
import type { DataReliabilityBundle } from './dataReliability';
import type { MacroIntelligenceBundle } from './macroIntelligence';
import type { ExecutionDashboardBundle } from './paperBroker';
import type { CapitalAllocationBundle } from './capitalAllocation';
import type { StrategyExecutionBundle } from './strategyExecution';

export type GovernanceLayerId =
  | 'system_stability'
  | 'portfolio_risk'
  | 'data_reliability'
  | 'macro'
  | 'execution'
  | 'capital_allocation'
  | 'ai_recommendation';

export type GovernanceStance = 'bullish' | 'neutral' | 'bearish' | 'block';

export type HierarchyRow = {
  rank: number;
  layerId: GovernanceLayerId;
  labelJa: string;
  active: boolean;
  stance: GovernanceStance;
  confidencePct: number;
  healthWeight: number;
  stale: boolean;
  summaryJa: string;
};

export type VetoRecord = {
  vetoLayer: GovernanceLayerId;
  vetoLayerLabelJa: string;
  blockedLayer: GovernanceLayerId;
  reasonJa: string;
};

export type DowngradeRecord = {
  symbol: string;
  fromAction: StrategyAction;
  toAction: StrategyAction;
  reasonJa: string;
};

export type DecisionTreeNode = {
  id: string;
  labelJa: string;
  outcomeJa: string;
  children?: DecisionTreeNode[];
};

export type GovernanceAuditEntry = {
  id: string;
  at: string;
  finalDecision: StrategyAction;
  consensusScore: number;
  contradiction: boolean;
  vetoLayer: GovernanceLayerId | null;
  summaryJa: string;
};

export type GovernanceFeatureId =
  | 'decision_hierarchy_engine'
  | 'ai_conflict_resolver'
  | 'veto_engine'
  | 'confidence_aggregator'
  | 'consensus_score'
  | 'contradiction_detector'
  | 'emergency_override'
  | 'ai_arbitration_engine'
  | 'explainable_decision_tree'
  | 'human_override_layer'
  | 'recommendation_downgrade'
  | 'layer_health_weight'
  | 'stale_layer_isolation'
  | 'recursive_decision_guard'
  | 'decision_cooldown'
  | 'strategy_consistency_checker'
  | 'exposure_consensus_guard'
  | 'global_risk_consensus'
  | 'unified_ai_summary'
  | 'decision_audit_trail';

export type GovernanceFeatureStatus = {
  id: GovernanceFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type HumanGovernanceOverride = {
  preferHold: boolean;
  noteJa: string | null;
  setAt: string | null;
};

export type AiGovernanceDecisionBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  finalDecision: StrategyAction;
  finalDecisionLabelJa: string;
  vetoLayer: GovernanceLayerId | null;
  vetoLayerLabelJa: string | null;
  vetoReasonJa: string | null;
  consensusScore: number;
  aggregatedConfidencePct: number;
  contradictionDetected: boolean;
  contradictionDetailJa: string | null;
  contradictionFormulaJa: string;
  consensusFormulaJa: string;
  activeHierarchy: HierarchyRow[];
  blockedDecisions: string[];
  emergencyOverrideActive: boolean;
  emergencyOverrideJa: string | null;
  humanOverrideActive: boolean;
  humanOverrideNoteJa: string | null;
  downgradedRecommendations: DowngradeRecord[];
  downgradeConditionsJa: string[];
  globalRiskConsensusJa: string;
  globalRiskScore: number;
  unifiedAiSummaryJa: string;
  explainTree: DecisionTreeNode[];
  featureStatuses: GovernanceFeatureStatus[];
  vetoes: VetoRecord[];
  arbitrationNoteJa: string;
  cooldownActive: boolean;
  cooldownNoteJa: string | null;
  recursiveGuardTriggered: boolean;
  exposureConsensusJa: string;
  strategyConsistencyJa: string;
  auditTrailPreview: GovernanceAuditEntry[];
  explainRuleBasisJa: string;
};

export type BuildAiGovernanceDecisionInput = {
  systemStability: SystemStabilityIntegrityBundle | null;
  portfolioRisk: PortfolioRiskExposureBundle | null;
  dataReliability: DataReliabilityBundle | null;
  macro: MacroIntelligenceBundle | null;
  execution: ExecutionDashboardBundle | null;
  capitalAllocation: CapitalAllocationBundle | null;
  strategy: StrategyExecutionBundle | null;
  humanGovernanceOverride: HumanGovernanceOverride;
  portfolioHumanRiskOverride: PortfolioRiskExposureBundle['humanOverride'] | null;
  staleLayerIds: GovernanceLayerId[];
  lastAudit: GovernanceAuditEntry | null;
  recentAuditFlipCount: number;
};
