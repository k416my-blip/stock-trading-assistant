import type { RuntimeSelfRecursionEnduranceObserveInput } from '../types/runtimeSelfRecursionEndurance';

export function resetEnduranceConfidenceEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeEnduranceConfidence(
  input: RuntimeSelfRecursionEnduranceObserveInput,
  enduranceScore: number,
  circuitRisk: number,
): number {
  const confidence =
    enduranceScore * 0.45 +
    input.governanceConfidence * 0.25 +
    (1 - circuitRisk) * 0.3 -
    (input.metaRecursionRisk > 0.55 ? 0.08 : 0);
  return Math.round(Math.max(0.08, Math.min(1, confidence)) * 1000) / 1000;
}
