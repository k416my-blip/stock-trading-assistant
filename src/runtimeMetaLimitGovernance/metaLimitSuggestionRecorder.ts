import type {
  MetaLimitSuggestion,
  MetaLimitSuggestionKind,
  RuntimeMetaLimitProfile,
} from '../types/runtimeMetaLimitGovernance';

const suggestions: MetaLimitSuggestion[] = [];

export function resetMetaLimitSuggestionRecorderForTest(): void {
  suggestions.length = 0;
}

function recordSuggestion(kind: MetaLimitSuggestionKind, target: string, suggestionJa: string): MetaLimitSuggestion {
  const row: MetaLimitSuggestion = {
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

export function recordMetaLimitSuggestions(profile: RuntimeMetaLimitProfile): MetaLimitSuggestion[] {
  const fresh: MetaLimitSuggestion[] = [];
  if (profile.recursionBoundaryStability < 0.55) {
    fresh.push(recordSuggestion('recursion_boundary', 'recursive boundary', 'recursion boundary の明示化候補を記録（forced stop 禁止）'));
  }
  if (profile.monitoringChainExpansionRisk >= 0.42) {
    fresh.push(recordSuggestion('monitoring_expansion', 'monitoring chain', 'monitoring layer 増殖警告を記録（auto disable 禁止）'));
  }
  if (profile.semanticInfiniteLoopRisk >= 0.42) {
    fresh.push(recordSuggestion('semantic_infinity', 'semantic loop', 'semantic infinity alert を記録（forced simplification 禁止）'));
  }
  if (profile.observerTerminationConfidence < 0.55) {
    fresh.push(recordSuggestion('observer_termination', 'observer chain', 'observer termination hint を記録（runtime cutoff 禁止）'));
  }
  if (profile.topologySelfReferenceScore >= 0.42) {
    fresh.push(recordSuggestion('topology_boundary_drift', 'topology reference', 'topology boundary drift warning を記録（topology mutation 禁止）'));
  }
  return fresh;
}

export function getMetaLimitSuggestionsRecent(limit = 12): MetaLimitSuggestion[] {
  return suggestions.slice(-limit);
}

export function getMetaLimitSuggestionsByKind(kind: MetaLimitSuggestionKind, limit = 6): MetaLimitSuggestion[] {
  return suggestions.filter((s) => s.kind === kind).slice(-limit);
}
