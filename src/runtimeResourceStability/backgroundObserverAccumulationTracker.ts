import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';

export function resetBackgroundObserverAccumulationTrackerForTest(): void {
  /* stateless */
}

export function scoreRuntimeBackgroundObserverRisk(input: RuntimeResourceStabilityObserveInput): number {
  if (input.appForeground && !input.screenOff) return 0.1;
  return Math.round(
    Math.min(1, input.observerOverheadRatio * 0.6 + input.hydrationOverlapCount * 0.1) * 1000,
  ) / 1000;
}
