import type {
  ObserverRealitySuggestion,
  ObserverRealitySuggestionKind,
  RuntimeObserverRealityProfile,
} from '../types/runtimeObserverRealitySelection';

const suggestions: ObserverRealitySuggestion[] = [];

export function resetObserverRealitySuggestionRecorderForTest(): void {
  suggestions.length = 0;
}

function recordSuggestion(
  kind: ObserverRealitySuggestionKind,
  target: string,
  suggestionJa: string,
): ObserverRealitySuggestion {
  const row: ObserverRealitySuggestion = {
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

export function recordObserverRealitySuggestions(
  profile: RuntimeObserverRealityProfile,
): ObserverRealitySuggestion[] {
  const fresh: ObserverRealitySuggestion[] = [];
  if (profile.observerRealitySelectionPressure >= 0.5) {
    fresh.push(recordSuggestion('reality_selection', 'observer reality', 'observer reality selection pressure を記録（reality correction 禁止）'));
  }
  if (profile.semanticCausalityDrift >= 0.5) {
    fresh.push(recordSuggestion('causality_drift', 'semantic causality', 'semantic causality drift を記録（semantic causality rewrite 禁止）'));
  }
  if (profile.recursiveInterpretationBranching >= 0.5) {
    fresh.push(recordSuggestion('interpretation_branching', 'recursive interpretation', 'recursive interpretation branching を記録（interpretation suppression 禁止）'));
  }
  if (profile.narrativeRealityCouplingStress >= 0.5) {
    fresh.push(recordSuggestion('reality_coupling', 'narrative-reality coupling', 'narrative-reality coupling stress を記録（narrative stabilization 禁止）'));
  }
  if (profile.observerRealityFixationRisk >= 0.5) {
    fresh.push(recordSuggestion('observer_fixation', 'observer fixation', 'observer reality fixation risk を記録（observer steering 禁止）'));
  }
  return fresh;
}

export function getObserverRealitySuggestionsRecent(limit = 12): ObserverRealitySuggestion[] {
  return suggestions.slice(-limit);
}
