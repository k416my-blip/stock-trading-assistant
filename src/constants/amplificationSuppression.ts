export const AMPLIFICATION_SUPPRESSION_VERSION = '1.0.0';

export const AMPLIFICATION_SUPPRESSION_POLL_MS = 27_000;
export const AMPLIFICATION_SUPPRESSION_TIMELINE_MAX = 400;
export const AMPLIFICATION_SUPPRESSION_LONG_SESSION_MIN = 120;
export const AMPLIFICATION_OBSERVER_DENSITY_WARN = 0.55;
export const AMPLIFICATION_THERMAL_SEVERE = ['severe', 'critical', 'emergency', 'shutdown'];
export const AMPLIFICATION_INTERVENTION_BUDGET = 18;

export const AMPLIFICATION_SUPPRESSION_UI_JA = {
  sectionTitle: 'Amplification Suppression',
  safety:
    'self-protection layer — 自己増殖・過観測・回復連鎖抑制のみ。policy / recommendation / AI推論は変更しません',
  runtimeAmplificationRisk: 'runtimeAmplificationRisk',
  observerCascadeRisk: 'observerCascadeRisk',
  telemetryRecursionRisk: 'telemetryRecursionRisk',
  recoveryAmplificationRisk: 'recoveryAmplificationRisk',
  runtimeInterventionDensity: 'runtimeInterventionDensity',
  observerDensityScore: 'observerDensityScore',
  stabilizationOverhead: 'stabilizationOverhead',
  runtimeEntropyScore: 'runtimeEntropyScore',
  loadSheddingSeverity: 'loadSheddingSeverity',
  runtimeEquilibriumStability: 'runtimeEquilibriumStability',
  propagationGraph: 'amplification propagation graph',
  observerDensityEvolution: 'observer density evolution',
  entropyTimeline: 'runtime entropy timeline',
  loadSheddingTimeline: 'load shedding timeline',
  timeline: 'suppression timeline',
} as const;

export const LOAD_SHEDDING_STAGES = [
  'analytics',
  'proactive_concierge',
  'heavy_telemetry',
  'graph_tracing',
  'soak_observer',
] as const;
