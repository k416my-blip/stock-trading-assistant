export const RUNTIME_CIVILIZATIONAL_RESILIENCE_VERSION = '1.0.0';

export const RUNTIME_CIVILIZATIONAL_RESILIENCE_POLL_MS = 28_000;
export const RUNTIME_CIVILIZATIONAL_RESILIENCE_TIMELINE_MAX = 400;
export const RUNTIME_CIVILIZATIONAL_RESILIENCE_LONG_SESSION_MIN = 120;

export const RUNTIME_CIVILIZATIONAL_RESILIENCE_UI_JA = {
  sectionTitle: 'Civilizational Ecology',
  safety:
    'civilizational resilience — observe-only。recommendation・policy・governance 意味は変更しません',
  runtimeCivilizationScore: 'runtimeCivilizationScore',
  recursiveGovernanceEcologyRisk: 'recursiveGovernanceEcologyRisk',
  runtimeUtilityMonocultureRisk: 'runtimeUtilityMonocultureRisk',
  observerEcosystemInflationRisk: 'observerEcosystemInflationRisk',
  runtimeStabilityIdeologyRisk: 'runtimeStabilityIdeologyRisk',
  runtimeOrchestrationCivilizationRisk: 'runtimeOrchestrationCivilizationRisk',
  governanceBiodiversityScore: 'governanceBiodiversityScore',
  crossLayerEcologyIntegrity: 'crossLayerEcologyIntegrity',
  runtimeCivilizationDriftRisk: 'runtimeCivilizationDriftRisk',
  runtimeEcologicalConfidence: 'runtimeEcologicalConfidence',
  civilizationEvolution: 'civilization evolution',
  timeline: 'civilizational ecology timeline',
} as const;

export const CIVILIZATION_FLOW_DIMENSIONS = [
  'suppression',
  'governance',
  'audit',
  'orchestration',
  'compression',
  'equilibrium',
  'utility',
  'purpose',
  'continuity',
] as const;

export const RECURSIVE_GOVERNANCE_CHAIN = [
  'governance',
  'audit',
  'orchestration',
  'meta',
  'equilibrium',
] as const;

export const CIVILIZATION_DRIFT_SIGNALS = [
  'observer_accumulation',
  'audit_persistence',
  'governance_expansion',
  'equilibrium_fixation',
  'meta_recursion_creep',
] as const;
