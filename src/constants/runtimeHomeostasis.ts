export const RUNTIME_HOMEOSTASIS_VERSION = '1.0.0';

export const RUNTIME_HOMEOSTASIS_POLL_MS = 27_000;
export const RUNTIME_HOMEOSTASIS_TIMELINE_MAX = 400;
export const RUNTIME_HOMEOSTASIS_LONG_SESSION_MIN = 120;

export const RUNTIME_HOMEOSTASIS_UI_JA = {
  sectionTitle: 'Homeostasis',
  safety:
    'homeostasis / equilibrium / adaptive stability — recommendation・policy・governance 意味は変更しません',
  runtimeHomeostasisScore: 'runtimeHomeostasisScore',
  stabilityDriftRisk: 'stabilityDriftRisk',
  interventionFatigueLevel: 'interventionFatigueLevel',
  equilibriumIntegrity: 'equilibriumIntegrity',
  runtimeCalmnessIndex: 'runtimeCalmnessIndex',
  adaptiveStabilityBalance: 'adaptiveStabilityBalance',
  stabilizationOscillationRisk: 'stabilizationOscillationRisk',
  homeostaticRecoveryBalance: 'homeostaticRecoveryBalance',
  runtimeSelfRegulationScore: 'runtimeSelfRegulationScore',
  equilibriumPersistence: 'equilibriumPersistence',
  equilibriumEvolution: 'runtime equilibrium evolution',
  interventionFatigueTimeline: 'intervention fatigue timeline',
  stabilityDriftGraph: 'stability drift graph',
  oscillationSuppressionMap: 'oscillation suppression map',
  calmStateTransitionGraph: 'calm-state transition graph',
  crossLayerEquilibriumGraph: 'cross-layer equilibrium graph',
  stabilizationPressureHeatmap: 'stabilization pressure heatmap',
  adaptivePacingEvolution: 'adaptive pacing evolution',
  homeostaticRecoveryGraph: 'homeostatic recovery graph',
  longSessionEquilibriumTimeline: 'long-session equilibrium timeline',
  timeline: 'homeostasis timeline',
} as const;

export const HOMEOSTASIS_LAYERS = [
  'recovery',
  'governance',
  'compression',
  'suppression',
  'continuity',
  'orchestration',
] as const;

export const DRIFT_TYPES = [
  'pacing_drift',
  'intervention_drift',
  'suppression_drift',
  'compression_drift',
  'thermal_drift',
] as const;

export const OSCILLATION_PAIRS = [
  'healthy_degraded',
  'lean_normal',
  'compressed_expanded',
] as const;
