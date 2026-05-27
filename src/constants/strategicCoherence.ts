export const STRATEGIC_COHERENCE_VERSION = '1.0.0';

export const STRATEGIC_COHERENCE_POLL_MS = 26_000;
export const STRATEGIC_COHERENCE_TIMELINE_MAX = 400;
export const STRATEGIC_COHERENCE_LONG_SESSION_MIN = 120;

export const STRATEGIC_COHERENCE_UI_JA = {
  sectionTitle: 'Strategic Coherence',
  safety:
    'global coherence / objective alignment — recommendation・policy・governance 意味は変更しません',
  runtimeStrategicCoherence: 'runtimeStrategicCoherence',
  objectiveAlignmentScore: 'objectiveAlignmentScore',
  layerConflictRisk: 'layerConflictRisk',
  strategicConsistency: 'strategicConsistency',
  runtimeUtilityIntegrity: 'runtimeUtilityIntegrity',
  interventionPriorityStability: 'interventionPriorityStability',
  strategicDriftRisk: 'strategicDriftRisk',
  runtimeIntentIntegrity: 'runtimeIntentIntegrity',
  crossLayerObjectiveConsistency: 'crossLayerObjectiveConsistency',
  runtimeStrategicPersistence: 'runtimeStrategicPersistence',
  coherenceEvolution: 'strategic coherence evolution',
  objectiveAlignmentGraph: 'objective alignment graph',
  layerConflictMap: 'layer conflict map',
  utilityEquilibriumGraph: 'runtime utility equilibrium graph',
  interventionPriorityTimeline: 'intervention priority timeline',
  strategicDriftEvolution: 'strategic drift evolution',
  crossLayerConsistencyGraph: 'cross-layer consistency graph',
  strategicPacingHarmonizationMap: 'strategic pacing harmonization map',
  continuityUtilityEvolution: 'continuity utility evolution',
  strategicEquilibriumTimeline: 'strategic equilibrium timeline',
  timeline: 'strategic timeline',
} as const;

export const GLOBAL_OBJECTIVE_LAYERS = [
  'recovery',
  'governance',
  'orchestration',
  'suppression',
  'compression',
  'continuity',
  'audit',
  'homeostasis',
] as const;

export const LAYER_CONFLICT_PAIRS = [
  'compression_vs_audit',
  'suppression_vs_continuity',
  'orchestration_vs_calm_state',
  'recovery_vs_equilibrium',
] as const;

export const RUNTIME_INTENTS = ['continuity', 'stability', 'survivability'] as const;

export const UTILITY_DIMENSIONS = [
  'thermal',
  'continuity',
  'survivability',
  'observer_cost',
  'latency',
  'stability',
  'compression',
  'intervention_density',
] as const;
