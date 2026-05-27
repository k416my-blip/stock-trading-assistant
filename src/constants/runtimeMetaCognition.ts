export const RUNTIME_META_COGNITION_VERSION = '1.0.0';

export const RUNTIME_META_COGNITION_POLL_MS = 33_000;
export const RUNTIME_META_COGNITION_TIMELINE_MAX = 400;
export const RUNTIME_META_COGNITION_LONG_SESSION_MIN = 120;

export const RUNTIME_META_COGNITION_UI_JA = {
  sectionTitle: 'Meta Cognition',
  safety:
    'recursive meta-cognition — observe-only。recommendation・policy・governance 意味は変更しません',
  runtimeMetaCognitionScore: 'runtimeMetaCognitionScore',
  recursiveSelfObservationRisk: 'recursiveSelfObservationRisk',
  observerSelfReferenceLockRisk: 'observerSelfReferenceLockRisk',
  metaCognitiveRigidityRisk: 'metaCognitiveRigidityRisk',
  runtimeIntrospectionDependencyRisk: 'runtimeIntrospectionDependencyRisk',
  recursiveAuditFixationRisk: 'recursiveAuditFixationRisk',
  runtimeSelfModelDriftRisk: 'runtimeSelfModelDriftRisk',
  crossLayerSelfConsistency: 'crossLayerSelfConsistency',
  runtimeIntrospectionDriftRisk: 'runtimeIntrospectionDriftRisk',
  runtimeMetaCognitionConfidence: 'runtimeMetaCognitionConfidence',
  metaCognitionEvolution: 'meta cognition evolution',
  timeline: 'meta cognition timeline',
} as const;

export const META_COGNITION_FLOW_DIMENSIONS = [
  'observer',
  'audit',
  'governance',
  'coherence',
  'continuity',
  'equilibrium',
  'agency',
  'epistemic',
  'purpose',
  'utility',
] as const;

export const RECURSIVE_SELF_OBSERVATION_CHAIN = [
  'observer',
  'audit',
  'self_model',
  'coherence',
  'governance',
  'observer',
] as const;

export const INTROSPECTION_DRIFT_SIGNALS = [
  'observer_accumulation',
  'audit_recursion',
  'self_reference_growth',
  'coherence_fixation',
  'meta_stability_dependency',
] as const;

export const CROSS_LAYER_SELF_LAYERS = [
  'observer',
  'agency',
  'epistemic',
  'governance',
  'utility',
  'purpose',
  'continuity',
  'coherence',
  'equilibrium',
  'constraint',
] as const;
