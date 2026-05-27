import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

export function resetRuntimeSelfRegulationOrchestratorForTest(): void {
  /* stateless */
}

export function scoreRuntimeSelfRegulation(input: RuntimeHomeostasisObserveInput): number {
  let score = 0.6;
  if (input.governanceConfidence > 0.7) score += 0.1;
  if (input.runtimeAuditCoverage > 0.65) score += 0.08;
  if (input.interventionDensity < 0.4) score += 0.1;
  if (input.runtimeEntropyScore > 0.55 && input.interventionDensity > 0.5) score -= 0.15;
  if (input.recursiveStabilizationRisk > 0.5) score -= 0.12;
  return Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
}

export function detectOverRegulation(input: RuntimeHomeostasisObserveInput): boolean {
  return (
    input.interventionDensity > 0.6 &&
    input.observerOverheadRatio > 0.5 &&
    input.runtimeAuditCoverage > 0.85 &&
    input.runtimeComplexityScore > 0.5
  );
}
