import type {
  GovernanceFreezeSuggestion,
  GovernanceFreezeSuggestionKind,
  RuntimeGovernanceFreezeProfile,
} from '../types/runtimeGovernanceFreeze';

const suggestions: GovernanceFreezeSuggestion[] = [];

export function resetGovernanceFreezeSuggestionRecorderForTest(): void {
  suggestions.length = 0;
}

function recordSuggestion(
  kind: GovernanceFreezeSuggestionKind,
  target: string,
  suggestionJa: string,
): GovernanceFreezeSuggestion {
  const row: GovernanceFreezeSuggestion = {
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

export function recordGovernanceFreezeSuggestions(
  profile: RuntimeGovernanceFreezeProfile,
): GovernanceFreezeSuggestion[] {
  const fresh: GovernanceFreezeSuggestion[] = [];
  if (profile.runtimeExpansionEntropy >= 0.55) {
    fresh.push(recordSuggestion('runtime_light', 'runtime-light', 'runtime-light migration hint を記録（architecture mutation 禁止）'));
  }
  if (profile.recursiveDependencyAccumulation >= 0.5) {
    fresh.push(recordSuggestion('lazy_loading', 'runtime imports', 'lazy loading recommendation を記録（runtime pruning 禁止）'));
  }
  if (profile.verifyExecutionStress >= 0.5) {
    fresh.push(recordSuggestion('verify_batching', 'verify scripts', 'verify batching suggestion を記録（forced consolidation 禁止）'));
  }
  if (profile.dashboardOperationalWeight >= 0.5) {
    fresh.push(recordSuggestion('dashboard_compression', 'dashboard', 'dashboard compression hint を記録（dashboard auto reduction 禁止）'));
  }
  if (profile.telemetryMaintenanceLoad >= 0.5) {
    fresh.push(recordSuggestion('telemetry_sampling', 'telemetry', 'telemetry sampling suggestion を記録（metric deletion 禁止）'));
  }
  if (profile.soakScenarioExpansionPressure >= 0.5) {
    fresh.push(recordSuggestion('soak_consolidation', 'soak scenarios', 'soak consolidation recommendation を記録（automatic cleanup 禁止）'));
  }
  if (profile.runtimeIndexingOverhead >= 0.5) {
    fresh.push(recordSuggestion('indexing_reduction', 'indexing', 'indexing reduction hint を記録（auto compression 禁止）'));
  }
  if (profile.recursiveLayerProliferationRisk >= 0.5) {
    fresh.push(recordSuggestion('scenario_deduplication', 'scenario registry', 'scenario deduplication candidate を記録（semantic rewrite 禁止）'));
  }
  return fresh;
}

export function getGovernanceFreezeSuggestionsRecent(limit = 12): GovernanceFreezeSuggestion[] {
  return suggestions.slice(-limit);
}
