export const RUNTIME_ADAPTIVE_OBSERVATION_VERSION = '1.0.0';
export const RUNTIME_ADAPTIVE_OBSERVATION_POLL_MS = 57_000;
export const RUNTIME_ADAPTIVE_OBSERVATION_TIMELINE_MAX = 360;

export const ADAPTIVE_OBSERVATION_LAYERS = [
  'observer',
  'dashboard',
  'telemetry',
  'semantic',
  'ontology',
  'recursive',
  'routing',
  'queue',
] as const;

export const RUNTIME_ADAPTIVE_OBSERVATION_UI_JA = {
  sectionTitle: 'Runtime Cognitive Load Shedding & Adaptive Observation Routing',
  safety:
    'observe-only adaptive observation analysis — automatic routing rewrite/runtime load balancing/semantic suppression/metric deletion/observer throttling/recursive signal pruning/telemetry filtering mutation/forced dashboard simplification 禁止',
  observerAttentionLoad: 'observerAttentionLoad',
  runtimeObservationPressure: 'runtimeObservationPressure',
  recursiveTelemetryDensity: 'recursiveTelemetryDensity',
  dashboardAttentionStress: 'dashboardAttentionStress',
  semanticHotPathIntensity: 'semanticHotPathIntensity',
  observerCognitiveQueueDepth: 'observerCognitiveQueueDepth',
  metricObservationBurstRisk: 'metricObservationBurstRisk',
  semanticMonitoringFatigue: 'semanticMonitoringFatigue',
  observationRoutingComplexity: 'observationRoutingComplexity',
  semanticPriorityRoutingPressure: 'semanticPriorityRoutingPressure',
  observerSignalCompetition: 'observerSignalCompetition',
  recursiveAttentionCollision: 'recursiveAttentionCollision',
  telemetryFloodRisk: 'telemetryFloodRisk',
  dashboardSignalOverflow: 'dashboardSignalOverflow',
  semanticLoadSheddingPressure: 'semanticLoadSheddingPressure',
  runtimeAttentionExhaustion: 'runtimeAttentionExhaustion',
} as const;
