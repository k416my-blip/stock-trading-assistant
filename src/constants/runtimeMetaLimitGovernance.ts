export const RUNTIME_META_LIMIT_VERSION = '1.0.0';
export const RUNTIME_META_LIMIT_POLL_MS = 38_000;
export const RUNTIME_META_LIMIT_TIMELINE_MAX = 400;

export const META_LIMIT_RECURSION_CHAIN = [
  'observer',
  'observer_of_observer',
  'governance_of_governance',
  'topology_of_topology',
  'semantic_system_of_semantic_system',
] as const;

export const RUNTIME_META_LIMIT_UI_JA = {
  sectionTitle: 'Meta-Limit Governance & Boundary Stability',
  safety:
    'observe-only meta-limit governance — forced recursion stop/runtime cutoff/pruning/auto disable/forced simplification/mutation 禁止',
  metaRecursionDepth: 'metaRecursionDepth',
  observerOfObserverDepth: 'observerOfObserverDepth',
  monitoringChainExpansionRisk: 'monitoringChainExpansionRisk',
  semanticInfiniteLoopRisk: 'semanticInfiniteLoopRisk',
  governanceMetaCascadeRisk: 'governanceMetaCascadeRisk',
  topologySelfReferenceScore: 'topologySelfReferenceScore',
  recursionBoundaryStability: 'recursionBoundaryStability',
  epistemicBoundaryIntegrity: 'epistemicBoundaryIntegrity',
  observerTerminationConfidence: 'observerTerminationConfidence',
  finiteObservationScore: 'finiteObservationScore',
} as const;
