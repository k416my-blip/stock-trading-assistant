export const RUNTIME_UNIFIED_UTILITY_VERSION = '1.0.0';

export const RUNTIME_UNIFIED_UTILITY_POLL_MS = 26_000;
export const RUNTIME_UNIFIED_UTILITY_TIMELINE_MAX = 400;
export const RUNTIME_UNIFIED_UTILITY_LONG_SESSION_MIN = 120;

export const RUNTIME_UNIFIED_UTILITY_UI_JA = {
  sectionTitle: 'Unified Utility',
  safety:
    'unified utility theory — observe-only。recommendation・policy・governance 意味は変更しません',
  runtimeUnifiedUtilityScore: 'runtimeUnifiedUtilityScore',
  runtimeExistentialConstraintRisk: 'runtimeExistentialConstraintRisk',
  objectiveFragmentationRisk: 'objectiveFragmentationRisk',
  runtimeUtilityDistortionScore: 'runtimeUtilityDistortionScore',
  runtimeGovernanceInflationRisk: 'runtimeGovernanceInflationRisk',
  runtimeStabilityAddictionRisk: 'runtimeStabilityAddictionRisk',
  observerCivilizationRisk: 'observerCivilizationRisk',
  crossLayerUtilityConsistency: 'crossLayerUtilityConsistency',
  runtimeExistentialDriftRisk: 'runtimeExistentialDriftRisk',
  runtimeUnifiedUtilityConfidence: 'runtimeUnifiedUtilityConfidence',
  unifiedUtilityEvolution: 'unified utility evolution',
  timeline: 'unified utility timeline',
} as const;

export const UNIFIED_UTILITY_FIELD_DIMENSIONS = [
  'utility',
  'survivability',
  'continuity',
  'stability',
  'simplicity',
  'coherence',
  'latency',
  'observer_cost',
  'orchestration_spread',
] as const;

export const EXISTENTIAL_CONSTRAINT_SIGNALS = [
  'survival_bias',
  'audit_addiction',
  'orchestration_persistence',
  'intervention_permanence',
] as const;

export const OBJECTIVE_FRAGMENTATION_PAIRS = [
  'compression_vs_audit',
  'homeostasis_vs_adaptability',
  'suppression_vs_continuity',
  'stability_vs_responsiveness',
  'orchestration_vs_simplicity',
] as const;
