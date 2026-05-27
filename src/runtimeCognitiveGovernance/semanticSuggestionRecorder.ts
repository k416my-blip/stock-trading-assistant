import type {
  RuntimeCognitiveGovernanceProfile,
  SemanticSignalSuggestion,
  SemanticSuggestionKind,
} from '../types/runtimeCognitiveGovernance';

const suggestions: SemanticSignalSuggestion[] = [];

export function resetSemanticSuggestionRecorderForTest(): void {
  suggestions.length = 0;
}

function recordSuggestion(
  kind: SemanticSuggestionKind,
  target: string,
  suggestionJa: string,
): SemanticSignalSuggestion {
  const row: SemanticSignalSuggestion = {
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

export function recordSemanticSignalSuggestions(
  profile: RuntimeCognitiveGovernanceProfile,
): SemanticSignalSuggestion[] {
  const fresh: SemanticSignalSuggestion[] = [];
  if (profile.signalPriorityDrift >= 0.35) {
    fresh.push(recordSuggestion('critical_signal', 'signal priority', '重要 signal の上位候補を記録（prioritization 実行なし）'));
  }
  if (profile.semanticNoiseRatio >= 0.4) {
    fresh.push(recordSuggestion('low_value_signal', 'semantic noise', '低価値 signal 候補を記録（removal/pruning 禁止）'));
  }
  if (profile.recursiveMeaningAmplification >= 0.42) {
    fresh.push(recordSuggestion('redundant_narrative', 'narrative', '重複 narrative 候補を記録（forced simplification 禁止）'));
  }
  if (profile.dashboardCognitiveLoad >= 0.45) {
    fresh.push(recordSuggestion('dashboard_simplification', 'dashboard', 'dashboard 簡素化案を記録（UI mutation なし）'));
  }
  if (profile.replayNarrativeComplexity >= 0.42) {
    fresh.push(recordSuggestion('replay_compression', 'replay', 'replay 圧縮案を記録（runtime throttling なし）'));
  }
  return fresh;
}

export function getSemanticSuggestionsRecent(limit = 12): SemanticSignalSuggestion[] {
  return suggestions.slice(-limit);
}

export function getSemanticSuggestionsByKind(
  kind: SemanticSuggestionKind,
  limit = 6,
): SemanticSignalSuggestion[] {
  return suggestions.filter((s) => s.kind === kind).slice(-limit);
}
