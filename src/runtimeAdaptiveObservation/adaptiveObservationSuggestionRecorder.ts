import type {
  AdaptiveObservationSuggestion,
  AdaptiveObservationSuggestionKind,
  RuntimeAdaptiveObservationProfile,
} from '../types/runtimeAdaptiveObservation';

const suggestions: AdaptiveObservationSuggestion[] = [];

export function resetAdaptiveObservationSuggestionRecorderForTest(): void {
  suggestions.length = 0;
}

function recordSuggestion(
  kind: AdaptiveObservationSuggestionKind,
  target: string,
  suggestionJa: string,
): AdaptiveObservationSuggestion {
  const row: AdaptiveObservationSuggestion = {
    at: new Date().toISOString(),
    kind,
    target,
    suggestionJa,
    observeOnly: true,
  };
  suggestions.push(row);
  if (suggestions.length > 64) suggestions.shift();
  return row;
}

export function recordAdaptiveObservationSuggestions(
  profile: RuntimeAdaptiveObservationProfile,
): AdaptiveObservationSuggestion[] {
  const fresh: AdaptiveObservationSuggestion[] = [];
  if (profile.observationRoutingComplexity >= 0.5) {
    fresh.push(recordSuggestion('observation_routing', 'routing topology', 'observation routing suggestion を記録（automatic routing rewrite 禁止）'));
  }
  if (profile.semanticHotPathIntensity >= 0.5) {
    fresh.push(recordSuggestion('semantic_attention', 'semantic hot-path', 'semantic attention hint を記録（semantic suppression 禁止）'));
  }
  if (profile.dashboardSignalOverflow >= 0.5) {
    fresh.push(recordSuggestion('dashboard_overload', 'dashboard signals', 'dashboard overload warning を記録（forced dashboard simplification 禁止）'));
  }
  if (profile.telemetryFloodRisk >= 0.5) {
    fresh.push(recordSuggestion('recursive_telemetry', 'telemetry flood', 'recursive telemetry warning を記録（telemetry filtering mutation 禁止）'));
  }
  if (profile.observerFocusDrift >= 0.5) {
    fresh.push(recordSuggestion('observer_focus', 'observer focus', 'observer focus stabilization hint を記録（observer throttling 禁止）'));
  }
  if (profile.crossLayerObservationCongestion >= 0.5) {
    fresh.push(recordSuggestion('semantic_congestion', 'semantic congestion', 'semantic congestion alert を記録（runtime load balancing 禁止）'));
  }
  if (profile.metricRetentionStress >= 0.5) {
    fresh.push(recordSuggestion('metric_density', 'metric density', 'metric density recommendation を記録（metric deletion 禁止）'));
  }
  if (profile.recursiveSignalSuppressionRisk >= 0.5) {
    fresh.push(recordSuggestion('observation_topology', 'recursive topology', 'runtime observation topology suggestion を記録（recursive signal pruning 禁止）'));
  }
  return fresh;
}

export function getAdaptiveObservationSuggestionsRecent(limit = 12): AdaptiveObservationSuggestion[] {
  return suggestions.slice(-limit);
}
