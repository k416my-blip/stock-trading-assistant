import type {
  ExecutiveState,
  LayerStateInputId,
  UnifiedCognitiveFeatureId,
} from '../types/unifiedCognitiveStateExecutiveAwareness';

export const UNIFIED_COGNITIVE_STATE_REGULATORY_JA =
  'Unified Cognitive State & Executive Awareness — 統合監査（conscious AI・意思決定主体ではない）。Paper Trading・realTradingEnabled=false。';

export const UNIFIED_COGNITIVE_STATE_AI_PROMPT_JA = `
【Unified Cognitive State & Executive Awareness】
- 全レイヤー状態を Executive として統合監査。深さ・安全推論範囲・優先順位の整合のみ（意思決定主体ではない）。
- hidden cognition・autonomous self-direction・recursive autonomy・self-preservation・emotion simulation禁止。governance最優先。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const EXECUTIVE_HEALTH_STRAINED_THRESHOLD = 70;
export const EXECUTIVE_HEALTH_FRAGMENTED_THRESHOLD = 55;
export const GLOBAL_COHERENCE_UNCERTAIN_THRESHOLD = 50;
export const RECURSIVE_DANGER_THRESHOLD = 70;
export const HALLUCINATION_EMERGENCY_THRESHOLD = 70;
export const BUDGET_EXECUTIVE_STABLE = 92;
export const BUDGET_EXECUTIVE_STRAINED = 80;
export const BUDGET_EXECUTIVE_FRAGMENTED = 68;
export const BUDGET_EXECUTIVE_RISK = 54;
export const EXECUTIVE_TIMELINE_MAX = 48;

export const EXECUTIVE_HEALTH_FORMULA_JA =
  'executiveHealth = (stabilityHealth + recoveryHealth + consensusIntegrity + epistemicIntegrity + strategicCoherence + resourceHealth + trustHealth) / 7';

export const EXECUTIVE_FRAGMENTATION_FORMULA_JA =
  'executiveFragmentation = contradictionPressure + orchestrationSaturation + recursivePressure + hallucinationRisk';

export const SAFE_REASONING_DEPTH_FORMULA_JA =
  'safeReasoningDepth = executiveHealth − executiveFragmentation';

export const GLOBAL_COHERENCE_FORMULA_JA =
  'globalCoherence = (causalContinuity + memoryContinuity + strategicCoherence + consensusIntegrity) / 4';

export const RECURSIVE_DANGER_FORMULA_JA =
  'recursiveDanger = recursivePressure × orchestrationSaturation × contradictionPressure (normalized)';

export const EXECUTIVE_FLOW_JA = [
  'Collect layer states → Normalize integrity → Calculate executive coherence',
  'Detect fragmentation & recursive instability → Determine safe reasoning depth & orchestration mode',
  'Persist executive snapshot',
];

export const EXECUTIVE_STATE_LABELS_JA: Record<ExecutiveState, string> = {
  EXECUTIVE_STABLE: 'Executive 安定',
  EXECUTIVE_STRAINED: 'Executive 逼迫',
  EXECUTIVE_FRAGMENTED: 'Executive 断片化',
  EXECUTIVE_UNCERTAIN: 'Executive 不確実',
  EXECUTIVE_RECURSIVE_RISK: 'Executive 再帰リスク',
  EXECUTIVE_EMERGENCY: 'Executive 緊急',
};

export const LAYER_STATE_LABELS_JA: Record<LayerStateInputId, string> = {
  stabilityHealth: 'Stability Health',
  recoveryHealth: 'Recovery Health',
  regimeConfidence: 'Regime Confidence',
  consensusIntegrity: 'Consensus Integrity',
  metaReliability: 'Meta Reliability',
  epistemicIntegrity: 'Epistemic Integrity',
  strategicCoherence: 'Strategic Coherence',
  resourceHealth: 'Resource Health',
  recursivePressure: 'Recursive Pressure',
  orchestrationSaturation: 'Orchestration Saturation',
  latencyPressure: 'Latency Pressure',
  trustHealth: 'Trust Health',
  memoryContinuity: 'Memory Continuity',
  causalContinuity: 'Causal Continuity',
  contradictionPressure: 'Contradiction Pressure',
  hallucinationRisk: 'Hallucination Risk',
  mobilePressure: 'Mobile Pressure',
};

export const UNIFIED_COGNITIVE_UI_LABELS_JA = {
  panelTitle: 'Unified Cognitive State Dashboard',
  health: 'Executive Health',
  coherence: 'Global Coherence',
  depth: 'Safe Reasoning Depth',
  recursive: 'Recursive Danger',
  saturation: 'Orchestration Saturation',
  hallucination: 'Hallucination Risk',
  trust: 'Trust Health',
  contradiction: 'Contradiction Pressure',
  fragmentation: 'Fragmentation Score',
  state: 'Executive State',
  reasoning: 'Reasoning Mode',
  orchestration: 'Orchestration Mode',
} as const;

export const UNIFIED_COGNITIVE_FEATURE_LABELS: Record<UnifiedCognitiveFeatureId, string> = {
  layer_state_collector: 'Layer State Collector',
  integrity_normalizer: 'Integrity Normalizer',
  executive_coherence_calculator: 'Executive Coherence Calculator',
  fragmentation_detector: 'Fragmentation Detector',
  recursive_instability_detector: 'Recursive Instability Detector',
  safe_reasoning_depth_gate: 'Safe Reasoning Depth Gate',
  orchestration_mode_selector: 'Orchestration Mode Selector',
  executive_timeline: 'Executive Timeline',
  governance_priority_guard: 'Governance Priority Guard',
  no_hidden_cognition: 'No Hidden Cognition',
  no_self_direction: 'No Self Direction',
  prediction_throttle: 'Prediction Throttle',
  recursive_shutdown: 'Recursive Shutdown',
  explanation_only_fallback: 'Explanation Only Fallback',
  deep_reasoning_freeze: 'Deep Reasoning Freeze',
  mobile_lite_aggregation: 'Mobile Lite Aggregation',
  executive_cache_reuse: 'Executive Cache Reuse',
  unified_cognitive_dashboard: 'Unified Cognitive Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
};
