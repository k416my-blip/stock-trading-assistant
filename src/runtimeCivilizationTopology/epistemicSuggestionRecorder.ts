import type {
  EpistemicTopologySuggestion,
  EpistemicTopologySuggestionKind,
  RuntimeCivilizationTopologyProfile,
} from '../types/runtimeCivilizationTopology';

const suggestions: EpistemicTopologySuggestion[] = [];

export function resetEpistemicSuggestionRecorderForTest(): void {
  suggestions.length = 0;
}

function recordSuggestion(
  kind: EpistemicTopologySuggestionKind,
  target: string,
  suggestionJa: string,
): EpistemicTopologySuggestion {
  const row: EpistemicTopologySuggestion = {
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

export function recordEpistemicTopologySuggestions(
  profile: RuntimeCivilizationTopologyProfile,
): EpistemicTopologySuggestion[] {
  const fresh: EpistemicTopologySuggestion[] = [];
  if (profile.epistemicStabilityScore < 0.55) {
    fresh.push(recordSuggestion('unstable_belief', 'world model', '不安定 belief 候補を記録（forced correction 禁止）'));
  }
  if (profile.recursiveMeaningTopology >= 0.45) {
    fresh.push(recordSuggestion('recursive_narrative', 'narrative loop', 'recursive narrative 警告を記録（semantic override 禁止）'));
  }
  if (profile.topologyCollapseRisk >= 0.42) {
    fresh.push(recordSuggestion('topology_drift', 'cognition topology', 'topology drift 候補を記録（topology rewrite 禁止）'));
  }
  if (profile.governanceBeliefDrift >= 0.4) {
    fresh.push(recordSuggestion('governance_meaning_divergence', 'governance meaning', 'governance meaning divergence を記録（belief mutation 禁止）'));
  }
  if (profile.observerPerspectiveFragmentation >= 0.4) {
    fresh.push(recordSuggestion('observer_perspective', 'observer worldview', 'observer perspective alert を記録（runtime intervention 禁止）'));
  }
  return fresh;
}

export function getEpistemicSuggestionsRecent(limit = 12): EpistemicTopologySuggestion[] {
  return suggestions.slice(-limit);
}

export function getEpistemicSuggestionsByKind(
  kind: EpistemicTopologySuggestionKind,
  limit = 6,
): EpistemicTopologySuggestion[] {
  return suggestions.filter((s) => s.kind === kind).slice(-limit);
}
