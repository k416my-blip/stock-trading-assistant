export const META_RUNTIME_ORCHESTRATION_VERSION = '1.0.0';

export const META_ORCHESTRATION_POLL_MS = 28_000;
export const META_ORCHESTRATION_TIMELINE_MAX = 400;
export const META_ORCHESTRATION_LONG_SESSION_MIN = 120;
export const META_ORCHESTRATION_HYSTERESIS_MS = 50_000;
export const META_ORCHESTRATION_COOLDOWN_MS = 35_000;
export const META_THERMAL_SEVERE = ['severe', 'critical', 'emergency', 'shutdown'];

export const META_ORCHESTRATION_UI_JA = {
  sectionTitle: 'Meta Orchestration',
  safety:
    'meta coordination — survivability layer 間の競合調停のみ。policy / recommendation / AI推論は変更しません',
  survivabilityConflictScore: 'survivabilityConflictScore',
  orchestrationPressure: 'orchestrationPressure',
  governanceThrashRisk: 'governanceThrashRisk',
  recoveryOscillationRisk: 'recoveryOscillationRisk',
  telemetryAmplificationScore: 'telemetryAmplificationScore',
  observerStarvationRisk: 'observerStarvationRisk',
  stabilizationDeadlockRisk: 'stabilizationDeadlockRisk',
  survivabilityContention: 'survivabilityContention',
  equilibriumScore: 'equilibriumScore',
  runtimeFatigueScore: 'runtimeFatigueScore',
  interactionGraph: 'cross-layer graph',
  contentionMap: 'contention map',
  pacingTimeline: 'pacing timeline',
  interventionHeatmap: 'intervention heatmap',
  timeline: 'orchestration timeline',
} as const;

export const SURVIVABILITY_LAYER_PRIORITY: Record<string, number> = {
  continuity: 1,
  recovery: 2,
  governance: 3,
  js_stabilization: 4,
  rn_bridge: 5,
  telemetry: 6,
  causal: 7,
  trading: 8,
};
