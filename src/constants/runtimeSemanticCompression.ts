export const RUNTIME_SEMANTIC_COMPRESSION_VERSION = '1.0.0';
export const RUNTIME_SEMANTIC_COMPRESSION_POLL_MS = 46_000;
export const RUNTIME_SEMANTIC_COMPRESSION_TIMELINE_MAX = 360;

export const SEMANTIC_COMPRESSION_LAYERS = [
  'telemetry',
  'cognitive',
  'topology',
  'federation',
  'ontology',
  'finite-boundary',
] as const;

export const SEMANTIC_METRIC_FAMILIES = [
  'risk',
  'drift',
  'entropy',
  'density',
  'containment',
  'stability',
] as const;

export const RUNTIME_SEMANTIC_COMPRESSION_UI_JA = {
  sectionTitle: 'Semantic Compression & Metric Canonicalization',
  safety:
    'observe-only semantic compression analysis — metric deletion/forced merge/runtime compression mutation/semantic rewrite/observer cleanup/canonical override/auto simplification 禁止',
  semanticAliasClusterCount: 'semanticAliasClusterCount',
  metricCanonicalizationPressure: 'metricCanonicalizationPressure',
  crossLayerSemanticOverlap: 'crossLayerSemanticOverlap',
  duplicateMeaningDensity: 'duplicateMeaningDensity',
  canonicalMetricConfidence: 'canonicalMetricConfidence',
  semanticCompressionPotential: 'semanticCompressionPotential',
  observerAliasRisk: 'observerAliasRisk',
  semanticNamingDrift: 'semanticNamingDrift',
  ontologyCompressionRatio: 'ontologyCompressionRatio',
  metricVocabularyEntropy: 'metricVocabularyEntropy',
  semanticClusterIntegrity: 'semanticClusterIntegrity',
  crossLayerMeaningCollapse: 'crossLayerMeaningCollapse',
  metricIdentityInstability: 'metricIdentityInstability',
  canonicalOntologyStress: 'canonicalOntologyStress',
  dashboardSemanticCrowding: 'dashboardSemanticCrowding',
  operatorSemanticFatigue: 'operatorSemanticFatigue',
  semanticPanelRedundancy: 'semanticPanelRedundancy',
  metricInterpretationCollision: 'metricInterpretationCollision',
  visualizationAliasRisk: 'visualizationAliasRisk',
  observerDependencyLoopRisk: 'observerDependencyLoopRisk',
  metricReferenceCycleDepth: 'metricReferenceCycleDepth',
  semanticMutualReferenceRisk: 'semanticMutualReferenceRisk',
  recursiveMeaningDependency: 'recursiveMeaningDependency',
  canonicalizationDeadlockRisk: 'canonicalizationDeadlockRisk',
} as const;
