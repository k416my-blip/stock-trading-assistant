export const RUNTIME_ONTOLOGY_VERSION = '1.0.0';
export const RUNTIME_ONTOLOGY_POLL_MS = 42_000;
export const RUNTIME_ONTOLOGY_TIMELINE_MAX = 400;

export const ONTOLOGY_ANCHOR_CHAIN = [
  'telemetry_reality',
  'observer_reference',
  'governance_meaning',
  'narrative_model',
  'runtime_anchor',
] as const;

export const ONTOLOGY_GROUNDING_LAYERS = [
  'symbol',
  'reference',
  'observer',
  'narrative',
  'reality',
] as const;

export const RUNTIME_ONTOLOGY_UI_JA = {
  sectionTitle: 'Ontology Stabilization & Reality Anchoring',
  safety:
    'observe-only ontology stabilization — ontology rewrite/forced grounding/semantic override/runtime intervention/belief mutation/pruning/auto correction/reality enforcement 禁止',
  runtimeRealityAnchorScore: 'runtimeRealityAnchorScore',
  semanticOntologyDrift: 'semanticOntologyDrift',
  observerGeneratedRealityRisk: 'observerGeneratedRealityRisk',
  recursiveMeaningCollapseRisk: 'recursiveMeaningCollapseRisk',
  ontologyFragmentationIndex: 'ontologyFragmentationIndex',
  narrativeRealityDistance: 'narrativeRealityDistance',
  symbolicReferenceInstability: 'symbolicReferenceInstability',
  semanticAnchorIntegrity: 'semanticAnchorIntegrity',
  ontologyCompressionStress: 'ontologyCompressionStress',
  recursiveOntologyDepth: 'recursiveOntologyDepth',
  semanticGroundingStrength: 'semanticGroundingStrength',
  symbolicAnchorDensity: 'symbolicAnchorDensity',
  referenceChainIntegrity: 'referenceChainIntegrity',
  replayMeaningPersistence: 'replayMeaningPersistence',
  semanticPersistenceHalfLife: 'semanticPersistenceHalfLife',
} as const;
