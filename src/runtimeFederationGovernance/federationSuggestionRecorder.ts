import type {
  FederationSuggestion,
  FederationSuggestionKind,
  RuntimeFederationProfile,
} from '../types/runtimeFederationGovernance';

const suggestions: FederationSuggestion[] = [];

export function resetFederationSuggestionRecorderForTest(): void {
  suggestions.length = 0;
}

function recordSuggestion(kind: FederationSuggestionKind, target: string, suggestionJa: string): FederationSuggestion {
  const row: FederationSuggestion = {
    at: new Date().toISOString(),
    kind,
    target,
    suggestionJa,
    observeOnly: true,
  };
  suggestions.push(row);
  if (suggestions.length > 48) suggestions.shift();
  return row;
}

export function recordFederationSuggestions(profile: RuntimeFederationProfile): FederationSuggestion[] {
  const fresh: FederationSuggestion[] = [];
  if (profile.semanticMetricRedundancy >= 0.4) {
    fresh.push(recordSuggestion('metric_cluster', 'metrics', 'semantic metric clustering 候補を記録（deletion 禁止）'));
  }
  if (profile.recursiveLayerOverlap >= 0.42) {
    fresh.push(recordSuggestion('replay_chain_compression', 'replay chain', 'replay chain compression 案を記録（forced compression 禁止）'));
  }
  if (profile.dashboardSaturationPressure >= 0.45) {
    fresh.push(recordSuggestion('dashboard_simplification', 'dashboard', 'dashboard simplification 案を記録（runtime simplification 禁止）'));
  }
  if (profile.stackFederationComplexity >= 0.45) {
    fresh.push(recordSuggestion('federation_grouping', 'stack federation', 'federation grouping hint を記録（mutation 禁止）'));
  }
  if (profile.observerFederationDrift >= 0.42) {
    fresh.push(recordSuggestion('observer_dependency', 'observer dependency', 'observer dependency 注意点を記録（cleanup/pruning 禁止）'));
  }
  return fresh;
}

export function getFederationSuggestionsRecent(limit = 12): FederationSuggestion[] {
  return suggestions.slice(-limit);
}
