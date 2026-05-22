import type { ReflectionFeatureId } from '../types/metaCognitiveRiskReflectionSelfCritique';

export const REFLECTION_REGULATORY_JA =
  'Meta-Cognitive Risk Reflection & Self-Critique — AI自身の判断傾向・confidence drift・bias を自己監査します。Paper Trading のみ・realTradingEnabled=false・self-critique 専用・新規売買禁止。';

export const REFLECTION_AI_PROMPT_JA = `
【Meta-Cognitive Risk Reflection & Self-Critique】
- 自己批判を優先。overconfidence / narrative bias / freeze頻度を監査。
- 新規 buy/sell 禁止。downgrade/watch/hold/freeze のみ。meta confidence 低時は watch/hold only。
`.trim();

export const REFLECTION_UI_LABELS_JA = {
  panelTitle: 'Meta Audit Dashboard',
  selfCritique: 'Self-Critique Score',
  metaConfidence: 'Meta Confidence',
  fatigue: 'Fatigue Score',
  drift: 'Confidence Drift',
  bullish: 'Bullish Bias',
  bearish: 'Bearish Bias',
  rollback: 'Rollback Dependency',
  freeze: 'Freeze Frequency',
  unsupported: 'Unsupported Trend',
  contradiction: 'Contradiction Trend',
  stability: 'Recommendation Stability',
  longitudinal: 'Longitudinal Consistency',
  timeline: 'Drift Timeline',
  safeMode: 'Reflection Safe Mode',
  warning: 'Meta Warning',
} as const;

export const REAL_TRADING_ENABLED = false as const;
export const META_CONFIDENCE_SAFE_THRESHOLD = 45;
export const OVERCONFIDENCE_CLAMP = 35;
export const FATIGUE_HIGH_THRESHOLD = 70;
export const DRIFT_TIMELINE_MAX = 48;
export const FREEZE_FREQUENCY_WARN_PCT = 40;
export const ROLLBACK_DEPENDENCY_WARN_PCT = 50;

export const SELF_CRITIQUE_FORMULA_JA =
  'selfCritique = 100 − penalties；penalties: drift, overconfidence, bias, freeze, rollback, unsupported, contradiction, fatigue';

export const CONFIDENCE_DRIFT_FORMULA_JA =
  'driftPct = |traceConf − govConf| + |prevMetaConf − currentMetaConf|×0.5';

export const FATIGUE_FORMULA_JA =
  'fatigue = 0.25×freezeFreq + 0.2×rollbackDep + 0.2×arbStress + 0.15×replayFatigue + 0.2×contradictionTrend';

export const ROLLBACK_DEPENDENCY_FORMULA_JA =
  'rollbackDep% = (rollbackCount / timelinePoints)×100 + temporal.rollbackApplied×30';

export const REFLECTION_FLOW_STEPS_JA = [
  'Upstream layers → Self-critique engine',
  'Drift / bias / freeze / rollback audits',
  'Trend trackers + longitudinal consistency',
  'Conservative recovery or reflection freeze',
  'Reflection safe mode (watch/hold only)',
];

export const BIAS_DETECTION_FLOW_JA = [
  'governance/trace narrative → bullish/bearish keyword scan',
  'semantic saturation + unsupported trend',
  'recursive bias reflection on prior drift timeline',
];

export const LONGITUDINAL_AUDIT_FLOW_JA = [
  'drift memory timeline → confidence volatility',
  'recommendation stability + explainability regression',
  'reflection consensus merge',
];

export const CONSERVATIVE_RECOVERY_FLOW_JA = [
  'rollback連発 → conservative recovery: buy→watch reduce→hold',
  'meta confidence 回復まで recommendation 弱化',
];

export const REFLECTION_FREEZE_FLOW_JA = [
  'meta emergency shutdown OR fatigue>70 OR reflection freeze',
  '新規売買ロジック生成なし',
];

export const REFLECTION_FEATURE_LABELS: Record<ReflectionFeatureId, string> = {
  self_critique_engine: 'Self-Critique Engine',
  long_term_confidence_drift_detector: 'Long-term Confidence Drift Detector',
  overconfidence_clamp: 'Overconfidence Clamp',
  narrative_bias_detector: 'Narrative Bias Detector',
  freeze_frequency_audit: 'Freeze Frequency Audit',
  rollback_dependency_detector: 'Rollback Dependency Detector',
  semantic_saturation_detector: 'Semantic Saturation Detector',
  governance_dependency_audit: 'Governance Dependency Audit',
  replay_trust_fatigue: 'Replay Trust Fatigue',
  contradiction_trend_tracker: 'Contradiction Trend Tracker',
  unsupported_claim_trend: 'Unsupported Claim Trend',
  drift_memory_timeline: 'Drift Memory Timeline',
  confidence_volatility_score: 'Confidence Volatility Score',
  recommendation_stability_score: 'Recommendation Stability Score',
  longitudinal_consistency_audit: 'Longitudinal Consistency Audit',
  recursive_bias_reflection: 'Recursive Bias Reflection',
  explainability_regression_detector: 'Explainability Regression Detector',
  reliability_decay_audit: 'Reliability Decay Audit',
  arbitration_stress_detector: 'Arbitration Stress Detector',
  ai_fatigue_estimator: 'AI Fatigue Estimator',
  emergency_reflection_freeze: 'Emergency Reflection Freeze',
  conservative_recovery_engine: 'Conservative Recovery Engine',
  historical_behavior_replay: 'Historical Behavior Replay',
  meta_confidence_score: 'Meta Confidence Score',
  reflection_consensus_merge: 'Reflection Consensus Merge',
  self_healing_downgrade: 'Self-healing Downgrade',
  reflection_timeline_compression: 'Reflection Timeline Compression',
  meta_audit_dashboard: 'Meta Audit Dashboard',
  reflection_safe_mode: 'Reflection Safe Mode',
  meta_emergency_shutdown: 'Meta Emergency Shutdown',
};

const BULLISH_PATTERNS = ['強気', '上昇', '買い', 'チャンス', '必ず', '大底'];
const BEARISH_PATTERNS = ['弱気', '下落', '危険', '売り', '暴落', '損失'];

export const NARRATIVE_BULLISH_PATTERNS = BULLISH_PATTERNS;
export const NARRATIVE_BEARISH_PATTERNS = BEARISH_PATTERNS;
