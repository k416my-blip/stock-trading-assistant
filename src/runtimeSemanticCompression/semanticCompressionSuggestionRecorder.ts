import type {
  RuntimeSemanticCompressionProfile,
  SemanticCompressionSuggestion,
  SemanticCompressionSuggestionKind,
} from '../types/runtimeSemanticCompression';

const suggestions: SemanticCompressionSuggestion[] = [];

export function resetSemanticCompressionSuggestionRecorderForTest(): void {
  suggestions.length = 0;
}

function recordSuggestion(
  kind: SemanticCompressionSuggestionKind,
  target: string,
  suggestionJa: string,
): SemanticCompressionSuggestion {
  const row: SemanticCompressionSuggestion = {
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

export function recordSemanticCompressionSuggestions(
  profile: RuntimeSemanticCompressionProfile,
): SemanticCompressionSuggestion[] {
  const fresh: SemanticCompressionSuggestion[] = [];
  if (profile.metricCanonicalizationPressure >= 0.5) {
    fresh.push(recordSuggestion('canonical_metric_candidate', 'metric families', 'canonical metric candidates を記録（canonical override 禁止）'));
  }
  if (profile.semanticCompressionPotential >= 0.5) {
    fresh.push(recordSuggestion('semantic_merge_suggestion', 'semantic clusters', 'semantic merge suggestions を記録（forced merge 禁止）'));
  }
  if (profile.duplicateMeaningDensity >= 0.46) {
    fresh.push(recordSuggestion('duplicate_metric_family', 'duplicate meanings', 'duplicate metric families を記録（metric deletion 禁止）'));
  }
  if (profile.crossLayerSemanticOverlap >= 0.46) {
    fresh.push(recordSuggestion('cross_layer_alias_warning', 'cross-layer aliases', 'cross-layer alias warnings を記録（semantic rewrite 禁止）'));
  }
  if (profile.dashboardSemanticCrowding >= 0.5) {
    fresh.push(recordSuggestion('dashboard_simplification_suggestion', 'dashboard semantic overload', 'dashboard simplification suggestions を記録（auto simplification 禁止）'));
  }
  if (profile.canonicalizationDeadlockRisk >= 0.46) {
    fresh.push(recordSuggestion('observer_decoupling_hint', 'observer dependencies', 'observer decoupling hints を記録（observer cleanup 禁止）'));
  }
  return fresh;
}

export function getSemanticCompressionSuggestionsRecent(limit = 12): SemanticCompressionSuggestion[] {
  return suggestions.slice(-limit);
}
