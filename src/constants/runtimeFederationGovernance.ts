export const RUNTIME_FEDERATION_VERSION = '1.0.0';
export const RUNTIME_FEDERATION_POLL_MS = 40_000;
export const RUNTIME_FEDERATION_TIMELINE_MAX = 400;

export const FEDERATION_CAUSAL_CHAIN = [
  'topology',
  'cognition',
  'telemetry',
  'governance',
  'dashboard',
] as const;

export const FEDERATION_STACK_GROUPS = [
  'observer',
  'resource',
  'telemetry',
  'cognitive',
  'civilization',
  'meta_limit',
] as const;

export const RUNTIME_FEDERATION_UI_JA = {
  sectionTitle: 'Federation Governance & Cross-Layer Compression',
  safety:
    'observe-only federation governance — auto metric deletion/forced compression/pruning/cleanup/mutation/runtime simplification 禁止',
  stackFederationComplexity: 'stackFederationComplexity',
  crossLayerCouplingRisk: 'crossLayerCouplingRisk',
  metricExplosionRisk: 'metricExplosionRisk',
  dashboardSaturationPressure: 'dashboardSaturationPressure',
  federationCompressionRatio: 'federationCompressionRatio',
  observerFederationDrift: 'observerFederationDrift',
  governanceCoordinationStability: 'governanceCoordinationStability',
  recursiveLayerOverlap: 'recursiveLayerOverlap',
  semanticMetricRedundancy: 'semanticMetricRedundancy',
  federationIntegrityScore: 'federationIntegrityScore',
} as const;
