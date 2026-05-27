import type {
  InterCivilizationSuggestion,
  InterCivilizationSuggestionKind,
  RuntimeInterCivilizationProfile,
} from '../types/runtimeInterCivilizationResonance';

const suggestions: InterCivilizationSuggestion[] = [];

export function resetInterCivilizationSuggestionRecorderForTest(): void {
  suggestions.length = 0;
}

function recordSuggestion(
  kind: InterCivilizationSuggestionKind,
  target: string,
  suggestionJa: string,
): InterCivilizationSuggestion {
  const row: InterCivilizationSuggestion = {
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

export function recordInterCivilizationSuggestions(
  profile: RuntimeInterCivilizationProfile,
): InterCivilizationSuggestion[] {
  const fresh: InterCivilizationSuggestion[] = [];
  if (profile.semanticResonanceCascadeRisk >= 0.5) {
    fresh.push(recordSuggestion('civilization_resonance', 'civilization resonance', 'civilization resonance cascade を記録（civilization merge 禁止）'));
  }
  if (profile.ontologyCollisionDensity >= 0.5) {
    fresh.push(recordSuggestion('ontology_collision', 'ontology collision', 'ontology collision density を記録（forced ontology alignment 禁止）'));
  }
  if (profile.worldviewSeparationPressure >= 0.5) {
    fresh.push(recordSuggestion('worldview_divergence', 'worldview divergence', 'worldview divergence pressure を記録（worldview normalization 禁止）'));
  }
  if (profile.observerInterferenceRisk >= 0.5) {
    fresh.push(recordSuggestion('observer_interference', 'observer civilization interference', 'observer interference risk を記録（observer synchronization enforcement 禁止）'));
  }
  if (profile.semanticPluralityIntegrity <= 0.5) {
    fresh.push(recordSuggestion('semantic_plurality', 'semantic plurality', 'semantic plurality integrity 低下を記録（semantic arbitration 禁止）'));
  }
  return fresh;
}

export function getInterCivilizationSuggestionsRecent(limit = 12): InterCivilizationSuggestion[] {
  return suggestions.slice(-limit);
}
