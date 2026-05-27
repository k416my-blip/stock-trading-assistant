export const RUNTIME_NARRATIVE_INTEGRITY_VERSION = '1.0.0';

export const RUNTIME_NARRATIVE_INTEGRITY_POLL_MS = 34_000;
export const RUNTIME_NARRATIVE_INTEGRITY_TIMELINE_MAX = 400;
export const RUNTIME_NARRATIVE_INTEGRITY_LONG_SESSION_MIN = 120;

export const RUNTIME_NARRATIVE_INTEGRITY_UI_JA = {
  sectionTitle: 'Narrative Integrity',
  safety:
    'recursive narrative integrity — observe-only。recommendation・policy・governance 意味は変更しません',
  runtimeNarrativeIntegrityScore: 'runtimeNarrativeIntegrityScore',
  recursiveNarrativeInflationRisk: 'recursiveNarrativeInflationRisk',
  runtimeSemanticDriftRisk: 'runtimeSemanticDriftRisk',
  explanationLoopFixationRisk: 'explanationLoopFixationRisk',
  runtimeNarrativeLockRisk: 'runtimeNarrativeLockRisk',
  coherenceMythologyRisk: 'coherenceMythologyRisk',
  storylineSelfReinforcementRisk: 'storylineSelfReinforcementRisk',
  crossLayerSemanticConsistency: 'crossLayerSemanticConsistency',
  runtimeNarrativeDriftRisk: 'runtimeNarrativeDriftRisk',
  runtimeNarrativeConfidence: 'runtimeNarrativeConfidence',
  narrativeIntegrityEvolution: 'narrative integrity evolution',
  timeline: 'narrative integrity timeline',
} as const;

export const NARRATIVE_FLOW_DIMENSIONS = [
  'observer',
  'agency',
  'epistemic',
  'coherence',
  'governance',
  'utility',
  'purpose',
  'continuity',
  'meta_cognition',
] as const;

export const RECURSIVE_NARRATIVE_CHAIN = [
  'explanation',
  'interpretation',
  'reinforcement',
  'fixation',
  'reinterpretation',
] as const;

export const NARRATIVE_DRIFT_SIGNALS = [
  'semantic_accumulation',
  'recursive_explanation',
  'storyline_fixation',
  'coherence_mythology',
  'interpretation_persistence',
] as const;

export const CROSS_LAYER_SEMANTIC_LAYERS = [
  'observer',
  'agency',
  'epistemic',
  'governance',
  'utility',
  'purpose',
  'coherence',
  'continuity',
  'meta_cognition',
  'narrative',
] as const;
