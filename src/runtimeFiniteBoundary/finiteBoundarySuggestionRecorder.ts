import type {
  FiniteBoundarySuggestion,
  FiniteBoundarySuggestionKind,
  RuntimeFiniteBoundaryProfile,
} from '../types/runtimeFiniteBoundary';

const suggestions: FiniteBoundarySuggestion[] = [];

export function resetFiniteBoundarySuggestionRecorderForTest(): void {
  suggestions.length = 0;
}

function recordSuggestion(
  kind: FiniteBoundarySuggestionKind,
  target: string,
  suggestionJa: string,
): FiniteBoundarySuggestion {
  const row: FiniteBoundarySuggestion = {
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

export function recordFiniteBoundarySuggestions(profile: RuntimeFiniteBoundaryProfile): FiniteBoundarySuggestion[] {
  const fresh: FiniteBoundarySuggestion[] = [];
  if (profile.observerBudgetConsumption >= 0.62) {
    fresh.push(recordSuggestion('observation_stopping_suggestion', 'observer budget', 'observation stopping suggestion を記録（forced stopping 禁止）'));
  }
  if (profile.recursionBudgetUsage >= 0.58) {
    fresh.push(recordSuggestion('recursive_expansion_warning', 'recursion budget', 'recursive expansion warning を記録（runtime cutoff 禁止）'));
  }
  if (profile.telemetryNoiseBudget >= 0.58) {
    fresh.push(recordSuggestion('metric_freeze_candidate', 'telemetry noise budget', 'metric freeze candidate を記録（semantic deletion 禁止）'));
  }
  if (profile.dashboardAttentionBudget >= 0.58) {
    fresh.push(recordSuggestion('dashboard_simplification_pressure', 'dashboard attention', 'dashboard simplification pressure を記録（forced simplification 禁止）'));
  }
  if (profile.observerClosureIntegrity < 0.46) {
    fresh.push(recordSuggestion('observer_chain_cutoff_hint', 'observer closure', 'observer chain cutoff hint を記録（observer cleanup 禁止）'));
  }
  return fresh;
}

export function getFiniteBoundarySuggestionsRecent(limit = 12): FiniteBoundarySuggestion[] {
  return suggestions.slice(-limit);
}
