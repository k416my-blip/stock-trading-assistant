export const RUNTIME_AGENCY_INTEGRITY_VERSION = '1.0.0';

export const RUNTIME_AGENCY_INTEGRITY_POLL_MS = 32_000;
export const RUNTIME_AGENCY_INTEGRITY_TIMELINE_MAX = 400;
export const RUNTIME_AGENCY_INTEGRITY_LONG_SESSION_MIN = 120;

export const RUNTIME_AGENCY_INTEGRITY_UI_JA = {
  sectionTitle: 'Agency Integrity',
  safety:
    'recursive agency integrity — observe-only。recommendation・policy・governance 意味は変更しません',
  runtimeAgencyIntegrityScore: 'runtimeAgencyIntegrityScore',
  recursiveAutonomyInflationRisk: 'recursiveAutonomyInflationRisk',
  runtimeConstraintErosionRisk: 'runtimeConstraintErosionRisk',
  observerAgencyFusionRisk: 'observerAgencyFusionRisk',
  runtimeGovernanceAutonomyRisk: 'runtimeGovernanceAutonomyRisk',
  recursiveInterventionPersistenceRisk: 'recursiveInterventionPersistenceRisk',
  runtimeEquilibriumDependencyRisk: 'runtimeEquilibriumDependencyRisk',
  crossLayerAgencyConsistency: 'crossLayerAgencyConsistency',
  runtimeAutonomyDriftRisk: 'runtimeAutonomyDriftRisk',
  runtimeAgencyConfidence: 'runtimeAgencyConfidence',
  agencyIntegrityEvolution: 'agency integrity evolution',
  timeline: 'agency integrity timeline',
} as const;

export const AGENCY_FLOW_DIMENSIONS = [
  'observer',
  'orchestration',
  'governance',
  'equilibrium',
  'continuity',
  'utility',
  'purpose',
  'survivability',
  'audit',
] as const;

export const RECURSIVE_AUTONOMY_CHAIN = [
  'orchestration',
  'observer',
  'governance',
  'intervention',
  'equilibrium',
] as const;

export const CONSTRAINT_DIMENSIONS = [
  'boundary',
  'simplicity',
  'non_intervention',
  'suppression',
  'read_only',
  'constraint',
] as const;

export const AUTONOMY_DRIFT_SIGNALS = [
  'orchestration_persistence',
  'observer_accumulation',
  'autonomy_stabilization',
  'constraint_decay',
  'equilibrium_dependency',
] as const;

export const CROSS_LAYER_AGENCY_LAYERS = [
  'utility',
  'continuity',
  'observer',
  'audit',
  'survivability',
  'governance',
  'equilibrium',
  'purpose',
  'agency',
  'constraint',
] as const;
