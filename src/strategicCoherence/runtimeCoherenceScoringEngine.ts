import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';

export function resetRuntimeCoherenceScoringEngineForTest(): void {
  /* stateless */
}

export function scoreCoherenceComponents(input: StrategicCoherenceObserveInput): Record<string, number> {
  return {
    alignment: input.runtimeHomeostasisScore,
    utility: input.continuityScore / 100,
    stability: input.runtimeEquilibriumStability,
    compression: input.simplificationIntegrity,
    audit: input.runtimeAuditCoverage,
  };
}

export function aggregateCoherenceScore(input: StrategicCoherenceObserveInput): number {
  const components = scoreCoherenceComponents(input);
  const values = Object.values(components);
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) / 1000;
}
