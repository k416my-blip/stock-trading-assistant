import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetCivilizationSpreadCalculatorForTest(): void {
  /* stateless */
}

export function scoreCivilizationSpreadIndex(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  const layers = [
    input.runtimeGovernanceInflationRisk,
    input.observerCivilizationRisk,
    Math.min(1, input.orchestrationEdgeCount / 28),
    input.runtimeAuditCoverage,
    input.metaRecursionRisk,
  ];
  return Math.round((Math.max(...layers) - Math.min(...layers)) * 1000) / 1000;
}
