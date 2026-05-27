export const AUTONOMOUS_STABILITY_GOVERNANCE_VERSION = '1.0.0';

export const AUTONOMOUS_GOVERNANCE_POLL_MS = 22_000;
export const AUTONOMOUS_GOVERNANCE_TIMELINE_MAX = 400;
export const AUTONOMOUS_GOVERNANCE_HYSTERESIS_MS = 45_000;
export const AUTONOMOUS_GOVERNANCE_FATIGUE_SESSION_MIN = 90;
export const AUTONOMOUS_OBSERVER_OVERHEAD_WARN = 0.55;
export const AUTONOMOUS_THERMAL_SEVERE = ['severe', 'critical', 'emergency', 'shutdown'];

export const AUTONOMOUS_GOVERNANCE_UI_JA = {
  sectionTitle: 'Adaptive Governance',
  safety:
    'deterministic governance — 観測・重み付け・適応のみ。runtime policy / telemetry 意味は変更しません',
  governanceConfidence: 'governanceConfidence',
  runtimeFatigue: 'runtimeFatigue',
  recoveryEfficiency: 'recoveryEfficiency',
  observerOverhead: 'observerOverhead',
  survivabilityTrend: 'survivabilityTrend',
  thermalGovernance: 'thermalGovernance',
  adaptationStability: 'adaptationStability',
  metabolism: 'metabolism',
  suppressionEfficiency: 'suppressionEfficiency',
  starvationRiskTrend: 'starvationRiskTrend',
  timeline: 'governance timeline',
} as const;
