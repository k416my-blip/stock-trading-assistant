export const RUNTIME_CIVILIZATION_TOPOLOGY_VERSION = '1.0.0';
export const RUNTIME_CIVILIZATION_TOPOLOGY_POLL_MS = 36_000;
export const RUNTIME_CIVILIZATION_TOPOLOGY_TIMELINE_MAX = 400;

export const CIVILIZATION_COGNITION_CHAIN = [
  'observer',
  'governance',
  'telemetry',
  'replay',
  'observer',
] as const;

export const CIVILIZATION_TOPOLOGY_LAYERS = [
  'observer',
  'governance',
  'telemetry',
  'replay',
  'narrative',
  'reality',
] as const;

export const RUNTIME_CIVILIZATION_TOPOLOGY_UI_JA = {
  sectionTitle: 'Civilizational Cognition Topology',
  safety:
    'observe-only epistemic topology — forced correction/belief mutation/runtime intervention/semantic override/topology rewrite 禁止',
  cognitionTopologyComplexity: 'cognitionTopologyComplexity',
  observerChainDepth: 'observerChainDepth',
  epistemicStabilityScore: 'epistemicStabilityScore',
  narrativeRealityCoupling: 'narrativeRealityCoupling',
  governanceBeliefDrift: 'governanceBeliefDrift',
  semanticWorldModelVariance: 'semanticWorldModelVariance',
  recursiveMeaningTopology: 'recursiveMeaningTopology',
  observerPerspectiveFragmentation: 'observerPerspectiveFragmentation',
  civilizationContextInstability: 'civilizationContextInstability',
  topologyCollapseRisk: 'topologyCollapseRisk',
} as const;
