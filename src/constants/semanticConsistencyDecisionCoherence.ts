import type { SemanticFeatureId } from '../types/semanticConsistencyDecisionCoherence';

export const SEMANTIC_REGULATORY_JA =
  'Semantic Consistency & Decision Coherence — reasoning / governance / replay / explainability / finalDecision の意味的一貫性を保証します。Paper Trading のみ・実注文なし・semantic consistency 専用。';

export const SEMANTIC_AI_PROMPT_JA = `
【Semantic Consistency & Decision Coherence】
- finalDecisionCoherenceScore / contradiction language / unsupported claims を優先。
- semantic freeze 時は安全説明のみ。新しい売買断定や未証拠の根拠を作らない。
`.trim();

export const SEMANTIC_UI_LABELS_JA = {
  panelTitle: 'Semantic Dashboard',
  coherence: 'Coherence Score',
  nlIntegrity: 'NL Integrity',
  direction: 'Semantic Direction',
  contradiction: 'Contradiction Language',
  stale: 'Stale Explanation',
  unsupported: 'Unsupported Claims',
  veto: 'Veto Narrative',
  downgrade: 'Downgrade Narrative',
  confidence: 'Confidence Wording',
  drift: 'Drifted Narrative',
  freeze: 'Semantic Freeze',
  freshness: 'Explanation Freshness',
  consensus: 'Narrative Consensus',
} as const;

export const EXPLANATION_MAX_AGE_MS = 15 * 60 * 1000;
export const NARRATIVE_HISTORY_MAX = 24;
export const UNSUPPORTED_CLAIM_PATTERNS = [
  /確実に(上|下)がる/,
  /必ず(買|売)/,
  /100%/,
  /絶対/,
  /guaranteed/i,
  /definitely will (rise|fall)/i,
];
export const BULLISH_TERMS = ['強気', '上昇', '買い', 'bullish', 'buy', '積極', '好材料'];
export const BEARISH_TERMS = ['弱気', '下落', '回避', 'bearish', 'avoid', 'リスク', '警戒', '売り'];
export const EMOTIONAL_TERMS = ['大チャンス', '爆益', '絶好', 'panic sell', 'FOMO', '確実'];
export const HALLUCINATION_TERMS = ['未確認', '憶測', '噂のみ', '根拠なし'];

export const COHERENCE_SCORE_FORMULA_JA =
  '100 − (意味不一致20) − (矛盾語10) − (未証拠断定15) − (説明ドリフト12) − (stale説明10) − (感情語8) − (trace/gov乖離10)';

export const CONTRADICTION_DETECTION_FORMULA_JA =
  'textDirection(bullish|bearish) vs finalDecision(buy|watch|hold|avoid|reduce)；逆方向語共存 → contradiction';

export const SEMANTIC_FREEZE_CONDITION_JA =
  'coherence<40 ∨ temporal.emergencyFreeze ∨ unsupported≥3 ∨ (contradiction≥2 ∧ finalDecision=buy)';

export const SEMANTIC_FLOW_STEPS_JA = [
  'Trace→Narrative マップ + Multi-layer consensus',
  'Decision meaning validator + Bullish/Bearish diff',
  'Contradiction / unsupported / hallucination guards',
  'Governance narrative sync + Veto/Downgrade narrator',
  'Semantic freeze または Emergency fallback',
];

export const NARRATIVE_DOWNGRADE_FLOW_JA = [
  'buy→watch: downgrade narrative を whyProposed に追記（新規売買理由は作らない）',
  'governance unified summary と trace summary を同期',
  'temporal rollback 済みの場合は断定語を除去',
];

export const STALE_ISOLATION_FLOW_JA = [
  'governance/trace age > EXPLANATION_MAX → stale ラベル付与',
  'stale 説明は AI コンテキストから除外（要約のみ）',
  '古い replay narrative は semanticReplayDiff で差分表示',
];

export const HALLUCINATION_GUARD_FLOW_JA = [
  '未ロード layer への言及を unsupported とする',
  'trace missingEvidence を unsupported にマージ',
  '断定パターン（確実・必ず・100%）を sanitizer で弱化',
];

export const TRACE_TO_NARRATIVE_FLOW_JA = [
  'causalChain → traceToNarrativeJa（最大8行）',
  'explainableSummary + governance summary → consensus rows',
  'confidence merge = (explainable×0.6 + governance×0.4)',
];

export const SEMANTIC_FEATURE_LABELS: Record<SemanticFeatureId, string> = {
  decision_meaning_validator: 'Decision Meaning Validator',
  bullish_bearish_semantic_diff: 'Bullish/Bearish Semantic Diff',
  recommendation_tone_alignment: 'Recommendation Tone Alignment',
  governance_narrative_sync: 'Governance Narrative Sync',
  contradiction_language_detector: 'Contradiction Language Detector',
  replay_narrative_consistency: 'Replay Narrative Consistency',
  downgrade_explanation_sync: 'Downgrade Explanation Sync',
  confidence_language_scaling: 'Confidence Language Scaling',
  stale_explanation_isolation: 'Stale Explanation Isolation',
  veto_narrative_injection: 'Veto Narrative Injection',
  drifted_narrative_detector: 'Drifted Narrative Detector',
  final_decision_coherence_score: 'FinalDecision Coherence Score',
  risk_language_enforcement: 'Risk Language Enforcement',
  hallucination_explanation_guard: 'Hallucination Explanation Guard',
  unsupported_claim_detector: 'Unsupported Claim Detector',
  ai_summary_sanitizer: 'AI Summary Sanitizer',
  semantic_replay_diff: 'Semantic Replay Diff',
  governance_override_narrative: 'Governance Override Narrative',
  causal_narrative_alignment: 'Causal Narrative Alignment',
  explainability_confidence_merge: 'Explainability Confidence Merge',
  strategy_narrative_validator: 'Strategy Narrative Validator',
  emotional_bias_limiter: 'Emotional Bias Limiter',
  autonomous_tone_restriction: 'Autonomous Tone Restriction',
  recommendation_downgrade_narrator: 'Recommendation Downgrade Narrator',
  semantic_freeze: 'Semantic Freeze',
  natural_language_integrity_score: 'Natural Language Integrity Score',
  trace_to_narrative_mapper: 'Trace-to-Narrative Mapper',
  multi_layer_narrative_consensus: 'Multi-layer Narrative Consensus',
  semantic_dashboard: 'Semantic Dashboard',
  emergency_narrative_fallback: 'Emergency Narrative Fallback',
};
