export const RUNTIME_SELF_LIMITATION_VERSION = '1.0.0';

export const RUNTIME_SELF_LIMITATION_POLL_MS = 25_000;
export const RUNTIME_SELF_LIMITATION_TIMELINE_MAX = 400;
export const RUNTIME_SELF_LIMITATION_LONG_SESSION_MIN = 120;

export const RUNTIME_SELF_LIMITATION_UI_JA = {
  sectionTitle: 'Self Limitation',
  safety:
    'self-limitation / meta-cognitive boundary — observe-only、自律停止・削除なし。recommendation・policy・governance 意味は変更しません',
  runtimeSelfLimitationScore: 'runtimeSelfLimitationScore',
  metaRecursionRisk: 'metaRecursionRisk',
  runtimeEgoScore: 'runtimeEgoScore',
  stabilizationBudgetPressure: 'stabilizationBudgetPressure',
  runtimeAdaptiveInflationRisk: 'runtimeAdaptiveInflationRisk',
  runtimeSelfProtectionBias: 'runtimeSelfProtectionBias',
  observerIdeologyLockRisk: 'observerIdeologyLockRisk',
  recursiveEquilibriumInflation: 'recursiveEquilibriumInflation',
  runtimeBoundaryIntegrity: 'runtimeBoundaryIntegrity',
  runtimeMetaCognitivePressure: 'runtimeMetaCognitivePressure',
  selfLimitationEvolution: 'self limitation evolution',
  metaRecursionGraph: 'meta recursion graph',
  timeline: 'self limitation timeline',
} as const;

export const META_RECURSION_CHAIN = [
  'meta',
  'orchestration',
  'suppression',
  'audit',
  'orchestration',
] as const;

export const EGO_SIGNALS = [
  'observer_retention',
  'audit_overdensity',
  'intervention_persistence',
  'suppression_self_justification',
  'orchestration_inflation',
] as const;

export const SELF_PROTECTION_BIASES = [
  'observer_reduction_refusal',
  'audit_permanence',
  'suppression_persistence',
  'orchestration_self_maintenance',
  'recovery_infinite_continuation',
] as const;
