export const RUNTIME_EPISTEMIC_INTEGRITY_VERSION = '1.0.0';

export const RUNTIME_EPISTEMIC_INTEGRITY_POLL_MS = 30_000;
export const RUNTIME_EPISTEMIC_INTEGRITY_TIMELINE_MAX = 400;
export const RUNTIME_EPISTEMIC_INTEGRITY_LONG_SESSION_MIN = 120;

export const RUNTIME_EPISTEMIC_INTEGRITY_UI_JA = {
  sectionTitle: 'Epistemic Integrity',
  safety:
    'adaptive reality modeling — observe-only。recommendation・policy・governance 意味は変更しません',
  runtimeRealityIntegrityScore: 'runtimeRealityIntegrityScore',
  recursiveBeliefReinforcementRisk: 'recursiveBeliefReinforcementRisk',
  runtimeRealityDistortionRisk: 'runtimeRealityDistortionRisk',
  observerConfirmationLoopRisk: 'observerConfirmationLoopRisk',
  runtimeEpistemologyInflationRisk: 'runtimeEpistemologyInflationRisk',
  runtimeEquilibriumHallucinationRisk: 'runtimeEquilibriumHallucinationRisk',
  runtimeWorldviewLockRisk: 'runtimeWorldviewLockRisk',
  crossLayerEpistemicConsistency: 'crossLayerEpistemicConsistency',
  runtimeEpistemicDriftRisk: 'runtimeEpistemicDriftRisk',
  runtimeEpistemicConfidence: 'runtimeEpistemicConfidence',
  realityIntegrityEvolution: 'reality integrity evolution',
  timeline: 'epistemic integrity timeline',
} as const;

export const REALITY_MODEL_DIMENSIONS = [
  'audit',
  'governance',
  'orchestration',
  'utility',
  'equilibrium',
  'survivability',
  'continuity',
  'observer',
  'purpose',
] as const;

export const RECURSIVE_BELIEF_CHAIN = [
  'observer',
  'governance',
  'orchestration',
  'equilibrium',
  'observer',
] as const;

export const EPISTEMIC_DRIFT_SIGNALS = [
  'observer_accumulation',
  'audit_persistence',
  'belief_reinforcement',
  'governance_recursion',
  'worldview_fixation',
] as const;

export const EPISTEMIC_CONSISTENCY_LAYERS = [
  'utility',
  'survivability',
  'stability',
  'continuity',
  'observer',
  'audit',
  'governance',
  'equilibrium',
  'purpose',
] as const;
