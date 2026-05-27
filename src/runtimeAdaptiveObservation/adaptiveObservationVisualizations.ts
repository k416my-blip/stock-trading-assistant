import { ADAPTIVE_OBSERVATION_LAYERS } from '../constants/runtimeAdaptiveObservation';
import type {
  AdaptiveObservationGraph,
  RuntimeAdaptiveObservationProfile,
} from '../types/runtimeAdaptiveObservation';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetAdaptiveObservationVisualizationsForTest(): void {
  /* stateless */
}

function buildGraph(labels: readonly string[], pressure: number, congestion: number): AdaptiveObservationGraph {
  const nodes = labels.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    pressure: round(pressure * (0.72 + index * 0.04)),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      congestion: round(congestion),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildObservationPressureHeatmap(
  profile: RuntimeAdaptiveObservationProfile,
): { layer: string; pressure: number }[] {
  const values = [
    profile.observerAttentionLoad,
    profile.dashboardAttentionStress,
    profile.telemetryFloodRisk,
    profile.semanticHotPathIntensity,
    profile.ontologyMonitoringCongestion,
    profile.recursiveTelemetryDensity,
    profile.observationRoutingComplexity,
    profile.observerCognitiveQueueDepth,
  ];
  return ADAPTIVE_OBSERVATION_LAYERS.map((layer, index) => ({
    layer,
    pressure: round(values[index] ?? profile.runtimeObservationPressure),
  }));
}

export function buildSemanticHotPathGraph(profile: RuntimeAdaptiveObservationProfile): AdaptiveObservationGraph {
  return buildGraph(
    ['semantic', 'hot-path', 'priority', 'pressure', 'queue', 'dashboard'],
    profile.semanticHotPathIntensity,
    profile.semanticPriorityRoutingPressure,
  );
}

export function buildObserverAttentionRadar(profile: RuntimeAdaptiveObservationProfile): { axis: string; value: number }[] {
  return [
    { axis: 'attention', value: profile.observerAttentionLoad },
    { axis: 'queue', value: profile.observerCognitiveQueueDepth },
    { axis: 'fatigue', value: profile.semanticMonitoringFatigue },
    { axis: 'focus drift', value: profile.observerFocusDrift },
    { axis: 'exhaustion', value: profile.runtimeAttentionExhaustion },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildRecursiveSignalTopology(profile: RuntimeAdaptiveObservationProfile): AdaptiveObservationGraph {
  return buildGraph(
    ['replay', 'recursive', 'noise', 'collision', 'suppression-risk', 'topology'],
    profile.recursiveTelemetryDensity,
    profile.recursiveNoiseAmplification,
  );
}

export function buildDashboardOverloadMonitor(profile: RuntimeAdaptiveObservationProfile): { label: string; value: number }[] {
  return [
    { label: 'attention stress', value: profile.dashboardAttentionStress },
    { label: 'signal overflow', value: profile.dashboardSignalOverflow },
    { label: 'compression pressure', value: profile.dashboardCompressionPressure },
    { label: 'runtime exhaustion', value: profile.runtimeAttentionExhaustion },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildSemanticRoutingMap(profile: RuntimeAdaptiveObservationProfile): AdaptiveObservationGraph {
  return buildGraph(
    ['observation', 'semantic', 'routing', 'competition', 'fragmentation', 'drift'],
    profile.observationRoutingComplexity,
    profile.crossLayerObservationCongestion,
  );
}

export function buildObservationQueueVisualization(
  profile: RuntimeAdaptiveObservationProfile,
): { queue: string; depth: number }[] {
  return [
    { queue: 'observer', depth: profile.observerCognitiveQueueDepth },
    { queue: 'telemetry', depth: profile.recursiveTelemetryDensity },
    { queue: 'dashboard', depth: profile.dashboardSignalOverflow },
    { queue: 'semantic', depth: profile.semanticQueueFragmentation },
    { queue: 'ontology', depth: profile.ontologyMonitoringCongestion },
  ].map((row) => ({ ...row, depth: round(row.depth) }));
}

export function buildTelemetryCongestionTimeline(
  profile: RuntimeAdaptiveObservationProfile,
  prior: { at: string; congestion: number }[],
): { at: string; congestion: number }[] {
  return [
    ...prior,
    { at: new Date().toISOString(), congestion: profile.telemetryFloodRisk },
  ].slice(-48);
}
