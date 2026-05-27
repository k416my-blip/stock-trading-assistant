import type { RuntimeSelfRecursionEnduranceObserveInput } from '../types/runtimeSelfRecursionEndurance';

export function resetNarrativeRecursionAmplificationObserverForTest(): void {
  /* stateless */
}

export function scoreNarrativeRecursionAmplification(input: RuntimeSelfRecursionEnduranceObserveInput): number {
  return Math.round(
    Math.min(1, input.narrativeRecursionScore * 0.6 + input.metaRecursionRisk * 0.4) * 1000,
  ) / 1000;
}
