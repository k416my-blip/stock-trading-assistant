import type { StrategyAction } from './strategyExecution';
import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { ReactiveEventOrchestrationBundle } from './reactiveEventOrchestration';
import type { DataReliabilityBundle } from './dataReliability';
import type { MacroIntelligenceBundle } from './macroIntelligence';
import type { PortfolioRiskExposureBundle } from './portfolioRiskExposure';
import type { CapitalAllocationBundle } from './capitalAllocation';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { ExecutionDashboardBundle } from './paperBroker';

export type TraceLayerId =
  | 'system_stability'
  | 'portfolio_risk'
  | 'data_reliability'
  | 'macro'
  | 'execution'
  | 'capital_allocation'
  | 'ai_recommendation'
  | 'governance'
  | 'reactive_orchestration';

export type InfluenceEdge = {
  from: TraceLayerId;
  to: TraceLayerId;
  weightPct: number;
  noteJa: string;
};

export type ReasonWeightNode = {
  id: string;
  labelJa: string;
  deltaPct: number;
  direction: 'support' | 'oppose' | 'neutral';
  detailJa: string;
};

export type ConsensusBreakdownRow = {
  layerId: TraceLayerId;
  labelJa: string;
  stanceJa: string;
  weightPct: number;
  contributionPct: number;
};

export type DecisionTimelineStep = {
  order: number;
  at: string;
  layerId: TraceLayerId;
  eventJa: string;
  outcomeJa: string;
};

export type ConfidenceEvolutionPoint = {
  at: string;
  layerId: TraceLayerId;
  confidencePct: number;
};

export type ContradictionTimelineEntry = {
  at: string;
  detailJa: string;
  resolvedJa: string | null;
};

export type MarketContextSnapshot = {
  priceSyncStatusJa: string;
  symbols: Array<{
    symbol: string;
    intradayChangePct: number | null;
    dataQualityScore: number | null;
    stale: boolean;
  }>;
  volatilityNoteJa: string;
};

export type StateSnapshotLink = {
  fingerprintJa: string;
  layerTimestamps: Array<{ layerId: TraceLayerId; generatedAt: string | null }>;
};

export type RecommendationDiff = {
  symbol: string;
  previousAction: StrategyAction | null;
  currentAction: StrategyAction;
  changed: boolean;
};

export type CognitiveTraceReplayEntry = {
  id: string;
  at: string;
  finalDecision: StrategyAction;
  explainableScore: number;
  summaryJa: string;
};

export type TraceFeatureId =
  | 'cognitive_trace_engine'
  | 'decision_timeline'
  | 'influence_graph'
  | 'reason_weight_tree'
  | 'consensus_breakdown'
  | 'veto_explanation'
  | 'conflict_explanation'
  | 'downgrade_reason_chain'
  | 'health_impact_trace'
  | 'confidence_evolution'
  | 'state_snapshot_link'
  | 'market_context_capture'
  | 'ai_recommendation_diff'
  | 'strategy_drift_tracker'
  | 'human_override_trace'
  | 'emergency_override_trace'
  | 'recursive_reason_guard'
  | 'contradiction_timeline'
  | 'explainable_score'
  | 'missing_evidence_detector'
  | 'weak_signal_isolation'
  | 'data_freshness_trace'
  | 'source_reliability_weight'
  | 'causal_chain_builder'
  | 'explainable_summary_generator'
  | 'ai_self_reflection'
  | 'explainability_health_score'
  | 'replay_engine'
  | 'decision_comparator'
  | 'explainability_dashboard';

export type TraceFeatureStatus = {
  id: TraceFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type ExplainableCognitiveTraceBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  finalDecision: StrategyAction;
  finalDecisionLabelJa: string;
  reasoningChainJa: string[];
  causalChainJa: string[];
  influenceGraph: InfluenceEdge[];
  reasonWeightTree: ReasonWeightNode[];
  consensusBreakdown: ConsensusBreakdownRow[];
  vetoExplanationJa: string | null;
  conflictExplanationJa: string | null;
  downgradeReasonChain: string[];
  healthImpactTraceJa: string[];
  confidenceEvolution: ConfidenceEvolutionPoint[];
  stateSnapshotLink: StateSnapshotLink;
  marketContext: MarketContextSnapshot;
  recommendationDiffs: RecommendationDiff[];
  strategyDriftJa: string | null;
  humanOverrideTraceJa: string | null;
  emergencyOverrideTraceJa: string | null;
  recursiveReasonGuardTriggered: boolean;
  contradictionTimeline: ContradictionTimelineEntry[];
  explainableScore: number;
  explainableScoreFormulaJa: string;
  confidenceEvolutionFormulaJa: string;
  contradictionTraceFormulaJa: string;
  missingEvidenceJa: string[];
  weakSignalsJa: string[];
  dataFreshnessTraceJa: string[];
  sourceReliabilityWeights: Array<{ sourceJa: string; weightPct: number }>;
  explainableSummaryJa: string;
  aiSelfReflectionJa: string;
  explainabilityHealthScore: number;
  explainabilityHealthLabelJa: string;
  replayTimeline: CognitiveTraceReplayEntry[];
  decisionComparatorJa: string | null;
  decisionTimeline: DecisionTimelineStep[];
  featureStatuses: TraceFeatureStatus[];
  explainRuleBasisJa: string;
};

export type BuildExplainableCognitiveTraceInput = {
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  reactive: ReactiveEventOrchestrationBundle | null;
  dataReliability: DataReliabilityBundle | null;
  macro: MacroIntelligenceBundle | null;
  portfolioRisk: PortfolioRiskExposureBundle | null;
  capital: CapitalAllocationBundle | null;
  execution: ExecutionDashboardBundle | null;
  strategy: StrategyExecutionBundle | null;
  marketContext: MarketContextSnapshot;
  stateFingerprintJa: string;
  previousRecommendations: Array<{ symbol: string; action: StrategyAction }>;
  previousExplainableScore: number | null;
};
