import type {
  RuntimeSelfRecursionEnduranceObserveInput,
  SuppressionSuggestionRecord,
} from '../types/runtimeSelfRecursionEndurance';

const suggestions: SuppressionSuggestionRecord[] = [];

export function resetObserveOnlyCircuitBreakerScorerForTest(): void {
  suggestions.length = 0;
}

export function recordCircuitBreakerObservation(
  input: RuntimeSelfRecursionEnduranceObserveInput,
  recursionCircuitRisk: number,
): SuppressionSuggestionRecord[] {
  const fresh: SuppressionSuggestionRecord[] = [];
  if (recursionCircuitRisk < 0.45) return fresh;

  const targets: { target: string; suggestion: string }[] = [];
  if (input.observerOverheadRatio > 0.45 && input.observerDensityScore > 0.4) {
    targets.push({
      target: 'observer',
      suggestion: '観測サンプル間隔を広げる（記録のみ・実行禁止）',
    });
  }
  if (input.telemetryAmplificationScore > 0.45) {
    targets.push({
      target: 'telemetry',
      suggestion: 'telemetry 集約ウィンドウを延長（記録のみ・実行禁止）',
    });
  }
  if (input.runtimeAuditCoverage > 0.7 && input.interventionDensity > 0.5) {
    targets.push({
      target: 'audit',
      suggestion: 'audit 連鎖の重複記録を間引く（記録のみ・実行禁止）',
    });
  }
  if (input.metaRecursionRisk > 0.5) {
    targets.push({
      target: 'governance',
      suggestion: 'governance フィードバック深度を浅く記録（記録のみ・実行禁止）',
    });
  }

  for (const t of targets) {
    const row: SuppressionSuggestionRecord = {
      at: new Date().toISOString(),
      target: t.target,
      suppressionSuggestion: t.suggestion,
      observeOnly: true,
    };
    suggestions.push(row);
    fresh.push(row);
  }
  if (suggestions.length > 32) suggestions.splice(0, suggestions.length - 32);
  return fresh;
}

export function getSuppressionSuggestionsRecent(limit = 6): SuppressionSuggestionRecord[] {
  return suggestions.slice(-limit);
}
