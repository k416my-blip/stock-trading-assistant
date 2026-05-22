import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { GlobalMarketAnalysisBundle } from './globalMarketAnalysis';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { ExecutionRecoveryAdaptiveConfidenceBundle } from './executionRecoveryAdaptiveConfidence';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from './metaCognitiveRiskReflectionSelfCritique';
import type { EpistemicReliabilityEvidenceWeightBundle } from './epistemicReliabilityEvidenceWeight';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { StrategyAction } from './strategyExecution';

/** 現在の市場局面分類（予測断定なし） */
export type MarketRegimeCategory =
  | 'CALM_BULL'
  | 'CALM_BEAR'
  | 'VOLATILE_BULL'
  | 'VOLATILE_BEAR'
  | 'SIDEWAYS'
  | 'LIQUIDITY_STRESS'
  | 'PANIC'
  | 'UNSUPPORTED_ENVIRONMENT'
  | 'RECOVERY_TRANSITION';

export type RegimeAdaptationMode =
  | 'standard'
  | 'confidence_clamp'
  | 'selective_layers'
  | 'downgrade_watch_hold'
  | 'low_confidence'
  | 'macro_freeze'
  | 'panic_governance_only'
  | 'explanation_only'
  | 'gradual_thaw'
  | 'governance_priority';

export type RegimeTimelinePoint = {
  at: string;
  regime: MarketRegimeCategory;
  regimeConfidence: number;
  uncertainty: number;
};

export type RegimeFeatureId =
  | 'regime_detection_engine'
  | 'volatility_normalizer'
  | 'regime_clustering'
  | 'confidence_weighting'
  | 'uncertainty_estimator'
  | 'adaptation_recommender'
  | 'orchestration_handoff'
  | 'panic_risk_scanner'
  | 'liquidity_stress_detector'
  | 'sideways_suppressor'
  | 'volatile_clamp'
  | 'calm_standard_mode'
  | 'unsupported_guard'
  | 'recovery_transition_bridge'
  | 'governance_priority_mode'
  | 'stability_freeze_gate'
  | 'confidence_drift_cooldown'
  | 'macro_shock_detector'
  | 'correlation_break_detector'
  | 'sentiment_drift_tracker'
  | 'trend_strength_analyzer'
  | 'volume_anomaly_detector'
  | 'mobile_regime_optimizer'
  | 'orchestration_budget_adapter'
  | 'layer_priority_shifter'
  | 'explanation_only_mode'
  | 'regime_timeline'
  | 'market_regime_dashboard'
  | 'paper_trading_safety'
  | 'classification_not_prediction';

export type RegimeFeatureStatus = {
  id: RegimeFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type AutonomousMarketRegimeDetectionBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  realTradingEnabled: false;
  currentRegime: MarketRegimeCategory;
  regimeLabelJa: string;
  regimeConfidencePct: number;
  uncertaintyPct: number;
  panicRiskPct: number;
  adaptationHealthPct: number;
  adaptationMode: RegimeAdaptationMode;
  confidenceClampPct: number;
  orchestrationBudgetMax: number;
  governancePriorityMode: boolean;
  freezeAdaptiveLayers: boolean;
  explanationOnlyMode: boolean;
  volatilityRiskPct: number;
  volatilityTrendPct: number;
  macroShockPct: number;
  liquidityRiskPct: number;
  governanceStressPct: number;
  confidenceDriftPct: number;
  activeLayersSummaryJa: string;
  suspendedLayersSummaryJa: string;
  governanceOverrideJa: string;
  recoveryInteractionJa: string;
  mobileRuntimeStateJa: string;
  regimeSummaryJa: string;
  classificationDisclaimerJa: string;
  regimeConfidenceFormulaJa: string;
  uncertaintyFormulaJa: string;
  adaptationHealthFormulaJa: string;
  panicRiskFormulaJa: string;
  regimeFlowJa: string[];
  adaptationFlowJa: string[];
  orchestrationHandoffJa: string[];
  regimeTimeline: RegimeTimelinePoint[];
  explainRuleBasisJa: string;
  featureStatuses: RegimeFeatureStatus[];
};

export type BuildMarketRegimeInput = {
  macro: GlobalMarketAnalysisBundle | null;
  governance: AiGovernanceDecisionBundle | null;
  stability: SystemStabilityIntegrityBundle | null;
  systemic: SystemicStabilityRecursiveGovernanceBundle | null;
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null;
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  reflection: MetaCognitiveRiskReflectionSelfCritiqueBundle | null;
  epistemic: EpistemicReliabilityEvidenceWeightBundle | null;
  strategy: StrategyExecutionBundle | null;
  finalDecision: StrategyAction;
  /** vitest / 実機 mock 用 — 予測ではなく入力ノイズシミュレーション */
  mockVolatilityPct?: number;
};
