import type {
  EpistemicAuditTargetId,
  EpistemicIntegrityState,
  EpistemicIntegrityFeatureId,
} from '../types/epistemicIntegrityTruthCalibration';

export const EPISTEMIC_INTEGRITY_REGULATORY_JA =
  'Epistemic Integrity & Truth Calibration — 推論品質監査（真実判定AIではない）。Paper Trading・realTradingEnabled=false。';

export const EPISTEMIC_INTEGRITY_AI_PROMPT_JA = `
【Epistemic Integrity & Truth Calibration】
- 推論正当性・根拠密度を監査。integrity優先。断定予測・unsupported prediction禁止。「分からない」は正常。
- hallucination suppression優先。governance最優先。explanation-only fallback可。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const EPISTEMIC_HEALTH_UNCERTAIN_THRESHOLD = 70;
export const EPISTEMIC_HEALTH_DRIFTING_THRESHOLD = 55;
export const HALLUCINATION_RISK_THRESHOLD = 60;
export const UNSUPPORTED_CLAIMS_THRESHOLD = 70;
export const SPECULATIVE_EXPANSION_THRESHOLD = 75;
export const CONTRADICTION_CRITICAL_THRESHOLD = 65;
export const CONFIDENCE_CLAMP_UNCERTAIN = 58;
export const CONFIDENCE_CLAMP_DRIFTING = 50;
export const CONFIDENCE_CLAMP_SPECULATIVE = 45;
export const CONFIDENCE_CLAMP_HALLUCINATION = 40;
export const CONFIDENCE_CLAMP_UNSUPPORTED = 35;
export const BUDGET_EPISTEMIC_STABLE = 90;
export const BUDGET_EPISTEMIC_UNCERTAIN = 78;
export const BUDGET_EPISTEMIC_DRIFTING = 68;
export const BUDGET_EPISTEMIC_RISK = 58;
export const EPISTEMIC_TIMELINE_MAX = 48;

export const EPISTEMIC_HEALTH_FORMULA_JA =
  'epistemicHealth = 100 − confidenceInflation×0.2 − hallucinationDensity×0.2 − contradiction×0.15 − staleAssumptions×0.1 − temporalDrift×0.1 − unsupportedClaims×0.15 − speculativeExpansion×0.1';

export const CONFIDENCE_CALIBRATION_FORMULA_JA =
  'confidenceCalibration = rawConfidence × evidenceDensity × temporalConsistency × crossLayerAgreement';

export const HALLUCINATION_RISK_FORMULA_JA =
  'hallucinationRisk = unsupportedClaims + recursiveBeliefLoops + narrativeMutation + speculativeExpansion';

export const TRUTH_STABILITY_FORMULA_JA =
  'truthStability = crossLayerAgreement + evidencePersistence + timelineConsistency − contradictionPenalty';

export const EPISTEMIC_FLOW_JA = [
  'Collect reasoning metrics → Detect unsupported & contradiction',
  'Calibrate confidence → Reduce speculative amplification → Governance validation',
  'Explanation fallback → Persist epistemic snapshot',
];

export const UNCERTAINTY_DISCLAIMER_JA =
  '知識品質スコアは推論監査ラベルです。未来の確定予測・価格断定ではありません。不明（unknown）は正常な状態です。';

export const EPISTEMIC_STATE_LABELS_JA: Record<EpistemicIntegrityState, string> = {
  EPISTEMIC_STABLE: '認識安定',
  EPISTEMIC_UNCERTAIN: '認識不確実',
  EPISTEMIC_DRIFTING: '認識漂移',
  EPISTEMIC_SPECULATIVE: '推測拡大',
  EPISTEMIC_CONTRADICTED: '層間矛盾',
  EPISTEMIC_UNSUPPORTED: '根拠不足',
  EPISTEMIC_HALLUCINATION_RISK: '幻覚リスク',
};

export const EPISTEMIC_AUDIT_LABELS_JA: Record<EpistemicAuditTargetId, string> = {
  confidenceInflation: 'Confidence Inflation',
  unsupportedClaims: 'Unsupported Claims',
  hallucinationDensity: 'Hallucination Density',
  staleAssumptions: 'Stale Assumptions',
  temporalDrift: 'Temporal Drift',
  crossLayerContradiction: 'Cross-layer Contradiction',
  narrativeMutation: 'Narrative Mutation',
  evidenceScarcity: 'Evidence Scarcity',
  speculativeExpansion: 'Speculative Expansion',
  recursiveBeliefLoops: 'Recursive Belief Loops',
  memoryTruthDivergence: 'Memory Truth Divergence',
  explanationStability: 'Explanation Stability',
};

export const EPISTEMIC_UI_LABELS_JA = {
  panelTitle: 'Epistemic Integrity Dashboard',
  health: 'Epistemic Health',
  calibration: 'Confidence Calibration',
  hallucination: 'Hallucination Risk',
  unsupported: 'Unsupported Claims',
  temporal: 'Temporal Drift',
  contradiction: 'Contradiction Density',
  evidence: 'Evidence Stability',
  speculative: 'Speculative Expansion',
  downgrade: 'Explanation Downgrade',
  unknown: 'Unknown-state Ratio',
  state: 'Epistemic State',
} as const;

export const EPISTEMIC_FEATURE_LABELS: Record<EpistemicIntegrityFeatureId, string> = {
  reasoning_metrics_collector: 'Reasoning Metrics Collector',
  unsupported_expansion_detector: 'Unsupported Expansion Detector',
  contradiction_detector: 'Contradiction Detector',
  stale_assumption_detector: 'Stale Assumption Detector',
  confidence_calibrator: 'Confidence Calibrator',
  speculative_amplifier_reducer: 'Speculative Amplifier Reducer',
  governance_validation_gate: 'Governance Validation Gate',
  explanation_fallback_gate: 'Explanation Fallback Gate',
  hallucination_suppression: 'Hallucination Suppression',
  unknown_state_normalizer: 'Unknown State Normalizer',
  epistemic_timeline: 'Epistemic Timeline',
  temporal_drift_meter: 'Temporal Drift Meter',
  narrative_mutation_scan: 'Narrative Mutation Scan',
  evidence_density_estimator: 'Evidence Density Estimator',
  recursive_belief_loop_scan: 'Recursive Belief Loop Scan',
  memory_truth_divergence_probe: 'Memory Truth Divergence Probe',
  cross_layer_agreement_meter: 'Cross-layer Agreement Meter',
  truth_stability_scorer: 'Truth Stability Scorer',
  prediction_throttle: 'Prediction Throttle',
  consensus_revalidation_request: 'Consensus Revalidation Request',
  mobile_lite_epistemic_scan: 'Mobile Lite Epistemic Scan',
  deferred_deep_validation: 'Deferred Deep Validation',
  background_hallucination_batch: 'Background Hallucination Batch',
  epistemic_integrity_dashboard: 'Epistemic Integrity Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
  integrity_over_confidence: 'Integrity Over Confidence',
  no_certainty_escalation: 'No Certainty Escalation',
};
