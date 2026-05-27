import type {
  RuntimeTelemetryEntropyObserveInput,
  SignalGovernanceSuggestion,
  SignalGovernanceSuggestionKind,
} from '../types/runtimeTelemetryEntropy';

const suggestions: SignalGovernanceSuggestion[] = [];

export function resetSignalGovernanceRecorderForTest(): void {
  suggestions.length = 0;
}

function pushSuggestion(
  kind: SignalGovernanceSuggestionKind,
  target: string,
  suggestionJa: string,
): SignalGovernanceSuggestion {
  const row: SignalGovernanceSuggestion = {
    at: new Date().toISOString(),
    kind,
    target,
    suggestionJa,
    observeOnly: true,
  };
  suggestions.push(row);
  if (suggestions.length > 40) suggestions.shift();
  return row;
}

export function recordSignalGovernanceSuggestions(
  input: RuntimeTelemetryEntropyObserveInput,
  profile: {
    telemetryDuplicationRisk: number;
    replayAmplificationRisk: number;
    exportPayloadRisk: number;
    dashboardSaturationRisk: number;
  },
): SignalGovernanceSuggestion[] {
  const fresh: SignalGovernanceSuggestion[] = [];
  if (profile.telemetryDuplicationRisk >= 0.4) {
    fresh.push(
      pushSuggestion(
        'dedup',
        'telemetry',
        '同一 signal kind の window 集約を記録（dedup suggestion・実行禁止）',
      ),
    );
  }
  if (input.compressionRatio < 0.45 || profile.exportPayloadRisk >= 0.45) {
    fresh.push(
      pushSuggestion(
        'compression',
        'timeline',
        'timeline/export の圧縮率改善を記録（compression suggestion・実行禁止）',
      ),
    );
  }
  if (profile.replayAmplificationRisk >= 0.42) {
    fresh.push(
      pushSuggestion(
        'replay_throttling',
        'replay',
        'replay burst の間引き方針を記録（throttling suggestion・実行禁止）',
      ),
    );
  }
  if (profile.exportPayloadRisk >= 0.5 || profile.dashboardSaturationRisk >= 0.5) {
    fresh.push(
      pushSuggestion(
        'export_aggregation',
        'export',
        'export chunk 集約を記録（aggregation suggestion・cancel 禁止）',
      ),
    );
  }
  return fresh;
}

export function getSignalGovernanceSuggestionsRecent(limit = 8): SignalGovernanceSuggestion[] {
  return suggestions.slice(-limit);
}
