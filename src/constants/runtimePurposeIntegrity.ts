export const RUNTIME_PURPOSE_INTEGRITY_VERSION = '1.0.0';

export const RUNTIME_PURPOSE_INTEGRITY_POLL_MS = 24_000;
export const RUNTIME_PURPOSE_INTEGRITY_TIMELINE_MAX = 400;
export const RUNTIME_PURPOSE_INTEGRITY_LONG_SESSION_MIN = 120;

export const RUNTIME_PURPOSE_INTEGRITY_UI_JA = {
  sectionTitle: 'Purpose Integrity',
  safety:
    'purpose / value preservation — observe-only。recommendation・policy・governance 意味は変更しません',
  runtimePurposeIntegrityScore: 'runtimePurposeIntegrityScore',
  runtimePurposeDriftRisk: 'runtimePurposeDriftRisk',
  runtimeStabilityAddictionScore: 'runtimeStabilityAddictionScore',
  runtimeHollowingRisk: 'runtimeHollowingRisk',
  runtimeUtilityIntegrity: 'runtimeUtilityIntegrity',
  interventionEfficiencyScore: 'interventionEfficiencyScore',
  runtimeUsefulnessDivergenceRisk: 'runtimeUsefulnessDivergenceRisk',
  observerPurposeBalance: 'observerPurposeBalance',
  runtimeGovernanceOverreachRisk: 'runtimeGovernanceOverreachRisk',
  longSessionPurposeIntegrity: 'longSessionPurposeIntegrity',
  purposeEvolutionTimeline: 'purpose evolution timeline',
  timeline: 'purpose timeline',
} as const;

export const PURPOSE_DRIFT_SIGNALS = [
  'survivability_overoptimization',
  'orchestration_persistence',
  'audit_persistence',
  'intervention_fixation',
  'equilibrium_maintenance_bias',
  'suppression_permanence',
] as const;

export const STABILITY_ADDICTION_SIGNALS = [
  'calm_state_lock',
  'intervention_avoidance',
  'pacing_inertia',
  'recovery_hesitation',
  'observer_preservation_bias',
] as const;

export const UTILITY_DIMENSIONS = [
  'utility',
  'survivability',
  'simplicity',
  'continuity',
  'latency',
  'observer_cost',
  'orchestration_spread',
] as const;
