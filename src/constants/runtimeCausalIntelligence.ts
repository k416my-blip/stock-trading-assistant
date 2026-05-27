export const RUNTIME_CAUSAL_INTELLIGENCE_VERSION = '1.0.0';

export const CAUSAL_INTELLIGENCE_POLL_MS = 26_000;
export const CAUSAL_INTELLIGENCE_TIMELINE_MAX = 400;
export const CAUSAL_INTELLIGENCE_LONG_SESSION_MIN = 120;
export const CAUSAL_INTELLIGENCE_CORRELATION_WINDOW_MS = 8_000;
export const CAUSAL_THERMAL_SEVERE = ['severe', 'critical', 'emergency', 'shutdown'];

export const CAUSAL_INTELLIGENCE_UI_JA = {
  sectionTitle: 'Causal Intelligence',
  safety:
    'deterministic causal attribution — 統計・時系列・依存解析のみ。AI推論 / LLM / policy 変更なし',
  rootCauseScore: 'rootCauseScore',
  causalConfidence: 'causalConfidence',
  cascadeSeverity: 'cascadeSeverity',
  runtimeCorrelationStrength: 'runtimeCorrelationStrength',
  bridgeCausality: 'bridgeCausality',
  thermalCausality: 'thermalCausality',
  websocketInstability: 'websocketInstability',
  anomalyClusterScore: 'anomalyClusterScore',
  survivabilityCausalScore: 'survivabilityCausalScore',
  propagationDepth: 'propagationDepth',
  graph: 'causal graph',
  recentChain: 'recent causal chain',
  recoveryPath: 'recovery attribution path',
  propagationFlow: 'degradation propagation',
  timeline: 'causal timeline',
} as const;
