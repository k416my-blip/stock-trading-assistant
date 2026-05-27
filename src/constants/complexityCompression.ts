export const COMPLEXITY_COMPRESSION_VERSION = '1.0.0';

export const COMPLEXITY_COMPRESSION_POLL_MS = 28_000;
export const COMPLEXITY_COMPRESSION_TIMELINE_MAX = 400;
export const COMPLEXITY_COMPRESSION_LONG_SESSION_MIN = 120;

export const COMPLEXITY_COMPRESSION_UI_JA = {
  sectionTitle: 'Complexity Compression',
  safety:
    'simplification / deduplication / compression — recommendation・policy・governance 意味は変更しません',
  runtimeComplexityScore: 'runtimeComplexityScore',
  observerRedundancyRisk: 'observerRedundancyRisk',
  telemetryAmplificationCost: 'telemetryAmplificationCost',
  recursiveStabilizationRisk: 'recursiveStabilizationRisk',
  runtimeBloatScore: 'runtimeBloatScore',
  interventionValueDensity: 'interventionValueDensity',
  runtimeCompressionEfficiency: 'runtimeCompressionEfficiency',
  runtimeNoiseRatio: 'runtimeNoiseRatio',
  simplificationIntegrity: 'simplificationIntegrity',
  runtimeLeanStability: 'runtimeLeanStability',
  complexityEvolution: 'runtime complexity evolution',
  observerRedundancyGraph: 'observer redundancy graph',
  recursiveStabilizationMap: 'recursive stabilization map',
  orchestrationInflationGraph: 'orchestration inflation graph',
  telemetryHeatmap: 'telemetry amplification heatmap',
  interventionValueDistribution: 'intervention value distribution',
  compressionEfficiencyTimeline: 'compression efficiency timeline',
  leanModeTransitionGraph: 'lean-mode transition graph',
  equilibriumEvolution: 'simplification equilibrium evolution',
  timeline: 'compression timeline',
} as const;

export const REDUNDANCY_CATEGORIES = [
  'observer',
  'telemetry',
  'recovery',
  'pacing',
  'graph_tracing',
  'websocket_observer',
] as const;

export const RECURSIVE_STABILIZATION_CHAIN = [
  'meta',
  'recovery',
  'governance',
  'suppression',
  'meta',
] as const;

export const PRUNING_TARGETS = [
  'telemetry',
  'observer',
  'tracing',
  'proactive_concierge',
  'heavy_analytics',
] as const;
