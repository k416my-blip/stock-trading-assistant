import { suggestEgoSuppression } from './runtimeOrchestrationEgoDetector';

export function resetEgoSuppressionSuggesterForTest(): void {
  /* stateless */
}

export { suggestEgoSuppression as recordEgoSuppressionSuggestions };
