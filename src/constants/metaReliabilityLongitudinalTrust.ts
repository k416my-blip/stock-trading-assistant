import type {
  LongitudinalTrustState,
  MetaReliabilityFeatureId,
  TrustAuditTargetId,
} from '../types/metaReliabilityLongitudinalTrust';

export const META_RELIABILITY_REGULATORY_JA =
  'Meta Reliability & Longitudinal Trust — AI信頼寿命の長期監査（売買強化ではない）。Paper Trading・realTradingEnabled=false。';

export const META_RELIABILITY_AI_PROMPT_JA = `
【Meta Reliability & Longitudinal Trust】
- 長期一貫性・説明整合・confidence inflation を監査。断定・未来予言禁止。uncertainty を残す。
- TRUST_CRITICAL / LONGITUDINAL_UNSUPPORTED 時は watch/hold・説明のみ。governance 最優先。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const META_RELIABILITY_DECAYING_THRESHOLD = 60;
export const META_RELIABILITY_UNSTABLE_THRESHOLD = 45;
export const META_RELIABILITY_CRITICAL_THRESHOLD = 30;
export const SEMANTIC_DRIFT_DIVERGENCE_THRESHOLD = 70;
export const HALLUCINATION_UNSUPPORTED_THRESHOLD = 75;
export const CONFIDENCE_CLAMP_DECAYING = 55;
export const CONFIDENCE_CLAMP_UNSTABLE = 50;
export const CONFIDENCE_CLAMP_CRITICAL = 35;
export const BUDGET_TRUST_STABLE = 95;
export const BUDGET_TRUST_DECAYING = 75;
export const BUDGET_TRUST_UNSTABLE = 65;
export const BUDGET_TRUST_CRITICAL = 55;
export const BUDGET_DIVERGENCE = 70;
export const LONGITUDINAL_TIMELINE_MAX = 64;

export const META_RELIABILITY_FORMULA_JA =
  'metaReliability = 100 − trustDecay×0.2 − semanticDrift×0.2 − confidenceInflation×0.15 − recursiveInstability×0.15 − hallucinationRisk×0.1 − governanceDeviation×0.1 − orchestrationVolatility×0.1';

export const TRUST_DECAY_FORMULA_JA =
  'trustDecay = rollbackFrequency + freezeFrequency + contradictionPersistence + staleConsensus + replayInstability';

export const CONFIDENCE_INFLATION_FORMULA_JA =
  'confidenceInflation = confidenceMean − actualReliabilityTrend';

export const SEMANTIC_DRIFT_FORMULA_JA =
  'semanticDrift = recommendationChangeRate + explanationMismatch + regimeNarrativeShift';

export const TRUST_FLOW_JA = [
  'Collect longitudinal snapshots → Compare historical consistency',
  'Detect semantic drift & confidence inflation → Trust scoring',
  'Governance validation → Downgrade if unstable → Orchestration handoff',
];

export const UNCERTAINTY_DISCLAIMER_JA =
  '長期信頼スコアは過去の観測系列に基づく監査ラベルです。将来の相場・価格を断定・予測するものではありません。';

export const TRUST_STATE_LABELS_JA: Record<LongitudinalTrustState, string> = {
  TRUST_STABLE: '信頼安定',
  TRUST_DECAYING: '信頼減衰',
  TRUST_UNSTABLE: '信頼不安定',
  TRUST_CRITICAL: '信頼危機',
  EXPLANATION_DIVERGENCE: '説明乖離',
  LONGITUDINAL_UNSUPPORTED: '長期未対応',
};

export const TRUST_AUDIT_LABELS_JA: Record<TrustAuditTargetId, string> = {
  recommendationConsistency: 'Recommendation Consistency',
  confidenceIntegrity: 'Confidence Integrity',
  semanticStability: 'Semantic Stability',
  explanationAlignment: 'Explanation Alignment',
  consensusReliability: 'Consensus Reliability',
  regimePersistence: 'Regime Persistence',
  rollbackFrequency: 'Rollback Frequency',
  freezeFrequency: 'Freeze Frequency',
  orchestrationStability: 'Orchestration Stability',
  recoveryDurability: 'Recovery Durability',
};

export const META_RELIABILITY_UI_LABELS_JA = {
  panelTitle: 'Meta Reliability Dashboard',
  reliability: 'Meta Reliability',
  trustDecay: 'Trust Decay',
  semanticDrift: 'Semantic Drift',
  confidenceInflation: 'Confidence Inflation',
  hallucination: 'Hallucination Risk',
  governance: 'Governance Deviation',
  consistency: 'Longitudinal Consistency',
  explanation: 'Explanation Integrity',
  stale: 'Stale Reasoning Risk',
  state: 'Trust State',
  downgrade: 'Downgrade Reason',
  orchestration: 'Orchestration Interaction',
} as const;

export const META_RELIABILITY_FEATURE_LABELS: Record<MetaReliabilityFeatureId, string> = {
  longitudinal_snapshot_collector: 'Longitudinal Snapshot Collector',
  historical_consistency_comparator: 'Historical Consistency Comparator',
  semantic_drift_detector: 'Semantic Drift Detector',
  confidence_inflation_scanner: 'Confidence Inflation Scanner',
  trust_scoring_engine: 'Trust Scoring Engine',
  governance_validation_gate: 'Governance Validation Gate',
  unstable_downgrade_gate: 'Unstable Downgrade Gate',
  orchestration_handoff: 'Orchestration Handoff',
  trust_timeline: 'Trust Timeline',
  hallucination_risk_guard: 'Hallucination Risk Guard',
  explanation_divergence_mode: 'Explanation Divergence Mode',
  longitudinal_unsupported_freeze: 'Longitudinal Unsupported Freeze',
  rollback_frequency_tracker: 'Rollback Frequency Tracker',
  freeze_frequency_tracker: 'Freeze Frequency Tracker',
  stale_consensus_detector: 'Stale Consensus Detector',
  replay_reliability_probe: 'Replay Reliability Probe',
  governance_deviation_meter: 'Governance Deviation Meter',
  orchestration_volatility_meter: 'Orchestration Volatility Meter',
  recursive_instability_scan: 'Recursive Instability Scan',
  mobile_snapshot_compression: 'Mobile Snapshot Compression',
  trust_cache_retain: 'Trust Cache Retain',
  background_audit_batch: 'Background Audit Batch',
  meta_reliability_dashboard: 'Meta Reliability Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
  long_term_consistency_only: 'Long-term Consistency Only',
  uncertainty_preservation: 'Uncertainty Preservation',
  confidence_decay_on_trust_loss: 'Confidence Decay On Trust Loss',
  recommendation_consistency_audit: 'Recommendation Consistency Audit',
  recovery_durability_probe: 'Recovery Durability Probe',
};
