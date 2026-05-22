import type { EpistemicFeatureId, EpistemicLayerId } from '../types/epistemicReliabilityEvidenceWeight';

export const EPISTEMIC_REGULATORY_JA =
  'Epistemic Reliability & Evidence Weight — 各 layer / replay / governance の信頼度を動的管理します。Paper Trading のみ・realTradingEnabled=false・実注文なし・epistemic reliability 専用。';

export const EPISTEMIC_AI_PROMPT_JA = `
【Epistemic Reliability & Evidence Weight】
- reliabilityHealthScore / layer reliability / replay trust を優先。新規売買戦略は出さない。
- emergency fallback 時は buy→watch / reduce→hold のみ。unsupported 時 confidence 上限35。
`.trim();

export const EPISTEMIC_UI_LABELS_JA = {
  panelTitle: 'Reliability Dashboard',
  health: 'Reliability Health',
  consensus: 'Reliability Consensus',
  layers: 'Layer Reliability',
  governance: 'Governance Authority',
  replay: 'Replay Trust',
  semantic: 'Semantic Trust',
  temporal: 'Temporal Trust',
  drift: 'Confidence Drift',
  stale: 'Stale Evidence',
  unsupported: 'Unsupported Claims',
  freeze: 'Reliability Freeze',
  timeline: 'Reliability Timeline',
} as const;

export const REAL_TRADING_ENABLED = false as const;
export const UNSUPPORTED_CONFIDENCE_CAP = 35;
export const GOVERNANCE_AUTHORITY_BASE = 40;
export const REPLAY_CORRUPTION_TRUST_CAP = 25;
export const FRESHNESS_HALF_LIFE_MS = 20 * 60 * 1000;
export const RELIABILITY_TIMELINE_MAX = 48;
export const EVIDENCE_MAX_AGE_MS = 15 * 60 * 1000;

export const RELIABILITY_FORMULA_JA =
  'health = Σ(layerReliability × evidenceWeight) / Σ(weight) − penalties；penalties: contradiction, unsupported, replay corrupt, drift';

export const EVIDENCE_WEIGHT_FORMULA_JA =
  'weight_i = baseReliability × freshnessDecay(age) × consensusBoost(match≥2 layers)';

export const FRESHNESS_DECAY_FORMULA_JA =
  'freshnessPct = 100 × 0.5^(ageMs / FRESHNESS_HALF_LIFE_MS)';

export const CONTRADICTION_PENALTY_FORMULA_JA =
  'drop = min(25, contradictionCount×8 + driftScore×0.3)';

export const CONSENSUS_MERGE_FORMULA_JA =
  'consensus = clamp(50 + 0.35×governanceAuthority + 0.25×replayTrust + 0.2×semanticTrust + 0.2×temporalTrust)';

export const HALLUCINATION_CLAMP_FORMULA_JA =
  'if unsupported≥1 → per-layer confidence cap 35；if unsupported≥3 → reliabilityFreeze';

export const REPLAY_TRUST_FORMULA_JA =
  'replayTrust = traceScore × (integrityOk?1:0.4) × (corruption?0.25:1)';

export const EPISTEMIC_FLOW_STEPS_JA = [
  'Upstream bundles → Layer reliability scores',
  'Evidence weights + freshness decay + trust matrix',
  'Penalties: contradiction / unsupported / replay corruption',
  'Multi-layer consensus merge → Reliability health',
  'Freeze or emergency fallback (buy→watch / reduce→hold)',
];

export const TRUST_RECOVERY_FLOW_JA = [
  'reliabilityHealth ≥ 60 かつ replayTrust 回復 → layer trust +5（上限100）',
  'temporal rollback 解除後 → governance authority 漸増',
  'stale evidence 隔離解除は freshness>50% のみ',
];

export const RELIABILITY_FREEZE_FLOW_JA = [
  'health<40 ∨ temporal.emergency ∨ replayTrust<20 ∨ unsupported≥3',
  'freeze → emergencyFallback: buy→watch, reduce→hold',
  '新規売買ロジックは生成しない',
];

export const TRUST_MATRIX_EDGES: Array<{ from: EpistemicLayerId; to: EpistemicLayerId; base: number }> = [
  { from: 'stability', to: 'governance', base: 85 },
  { from: 'temporal', to: 'governance', base: 80 },
  { from: 'semantic', to: 'governance', base: 75 },
  { from: 'governance', to: 'strategy', base: 90 },
  { from: 'cognitive_trace', to: 'semantic', base: 70 },
  { from: 'reactive', to: 'temporal', base: 65 },
  { from: 'resource', to: 'cognitive_trace', base: 60 },
];

export const EPISTEMIC_FEATURE_LABELS: Record<EpistemicFeatureId, string> = {
  layer_reliability_score: 'Layer Reliability Score',
  dynamic_evidence_weight: 'Dynamic Evidence Weight',
  freshness_reliability_decay: 'Freshness Reliability Decay',
  replay_corruption_penalty: 'Replay Corruption Penalty',
  governance_authority_weight: 'Governance Authority Weight',
  reactive_noise_suppression: 'Reactive Noise Suppression',
  semantic_confidence_merge: 'Semantic Confidence Merge',
  temporal_reliability_alignment: 'Temporal Reliability Alignment',
  cross_layer_trust_matrix: 'Cross-layer Trust Matrix',
  contradiction_reliability_drop: 'Contradiction Reliability Drop',
  unsupported_claim_penalty: 'Unsupported Claim Penalty',
  source_consensus_weight: 'Source Consensus Weight',
  stale_evidence_isolation: 'Stale Evidence Isolation',
  reliability_drift_detector: 'Reliability Drift Detector',
  replay_trust_validator: 'Replay Trust Validator',
  governance_override_authority: 'Governance Override Authority',
  confidence_saturation_guard: 'Confidence Saturation Guard',
  hallucination_reliability_clamp: 'Hallucination Reliability Clamp',
  ai_confidence_compression: 'AI Confidence Compression',
  layer_trust_recovery: 'Layer Trust Recovery',
  reliability_replay_timeline: 'Reliability Replay Timeline',
  evidence_aging_engine: 'Evidence Aging Engine',
  confidence_divergence_detector: 'Confidence Divergence Detector',
  semantic_trust_alignment: 'Semantic Trust Alignment',
  multi_layer_reliability_consensus: 'Multi-layer Reliability Consensus',
  explainability_reliability_merge: 'Explainability Reliability Merge',
  reliability_freeze: 'Reliability Freeze',
  reliability_health_score: 'Reliability Health Score',
  reliability_dashboard: 'Reliability Dashboard',
  emergency_reliability_fallback: 'Emergency Reliability Fallback',
};
