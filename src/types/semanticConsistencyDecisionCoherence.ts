import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { ExplainableCognitiveTraceBundle } from './explainableCognitiveTrace';
import type { StateIntegrityTemporalConsistencyBundle } from './stateIntegrityTemporalConsistency';
import type { AdaptiveResourceComputeBudgetBundle } from './adaptiveResourceComputeBudget';
import type { ReactiveEventOrchestrationBundle } from './reactiveEventOrchestration';
import type { StrategyExecutionBundle } from './strategyExecution';
import type { StrategyAction } from './strategyExecution';

export type SemanticDirection = 'bullish' | 'bearish' | 'neutral';

export type SemanticFeatureId =
  | 'decision_meaning_validator'
  | 'bullish_bearish_semantic_diff'
  | 'recommendation_tone_alignment'
  | 'governance_narrative_sync'
  | 'contradiction_language_detector'
  | 'replay_narrative_consistency'
  | 'downgrade_explanation_sync'
  | 'confidence_language_scaling'
  | 'stale_explanation_isolation'
  | 'veto_narrative_injection'
  | 'drifted_narrative_detector'
  | 'final_decision_coherence_score'
  | 'risk_language_enforcement'
  | 'hallucination_explanation_guard'
  | 'unsupported_claim_detector'
  | 'ai_summary_sanitizer'
  | 'semantic_replay_diff'
  | 'governance_override_narrative'
  | 'causal_narrative_alignment'
  | 'explainability_confidence_merge'
  | 'strategy_narrative_validator'
  | 'emotional_bias_limiter'
  | 'autonomous_tone_restriction'
  | 'recommendation_downgrade_narrator'
  | 'semantic_freeze'
  | 'natural_language_integrity_score'
  | 'trace_to_narrative_mapper'
  | 'multi_layer_narrative_consensus'
  | 'semantic_dashboard'
  | 'emergency_narrative_fallback';

export type SemanticFeatureStatus = {
  id: SemanticFeatureId;
  labelJa: string;
  statusJa: 'ok' | 'watch' | 'critical';
  detailJa: string;
};

export type NarrativeConsensusRow = {
  sourceJa: string;
  direction: SemanticDirection;
  weightPct: number;
};

export type SemanticConsistencyDecisionCoherenceBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  paperTradingOnly: true;
  finalDecisionCoherenceScore: number;
  naturalLanguageIntegrityScore: number;
  healthLabelJa: string;
  semanticDirection: SemanticDirection;
  semanticDirectionLabelJa: string;
  explainabilityConfidenceMerged: number;
  contradictionLanguageJa: string[];
  staleExplanationJa: string[];
  unsupportedClaimsJa: string[];
  vetoNarrativeJa: string | null;
  downgradeNarrativeJa: string | null;
  confidenceWordingJa: string;
  driftedNarrativeJa: string | null;
  semanticReplayDiffJa: string | null;
  governanceNarrativeSyncJa: string;
  causalNarrativeAlignmentJa: string;
  traceToNarrativeJa: string[];
  narrativeConsensus: NarrativeConsensusRow[];
  semanticFreeze: boolean;
  emergencyNarrativeFallbackJa: string | null;
  explanationFreshnessJa: string;
  coherenceScoreFormulaJa: string;
  contradictionDetectionFormulaJa: string;
  semanticFlowJa: string[];
  narrativeDowngradeFlowJa: string[];
  staleIsolationFlowJa: string[];
  hallucinationGuardFlowJa: string[];
  traceToNarrativeFlowJa: string[];
  semanticFreezeConditionJa: string;
  featureStatuses: SemanticFeatureStatus[];
  semanticSummaryJa: string;
  explainRuleBasisJa: string;
};

export type BuildSemanticConsistencyInput = {
  governance: AiGovernanceDecisionBundle | null;
  trace: ExplainableCognitiveTraceBundle | null;
  strategy: StrategyExecutionBundle | null;
  temporal: StateIntegrityTemporalConsistencyBundle | null;
  resource: AdaptiveResourceComputeBudgetBundle | null;
  reactive: ReactiveEventOrchestrationBundle | null;
  finalDecision: StrategyAction;
};
