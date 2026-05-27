import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetSemanticInflationMonitorForTest(): void {
  /* stateless */
}

export function monitorSemanticInflation(input: RuntimeNarrativeIntegrityObserveInput): number {
  return Math.round(
    (input.runtimeEpistemologyInflationRisk * 0.4 +
      input.runtimeGovernanceInflationRisk * 0.3 +
      input.recursiveBeliefReinforcementRisk * 0.3) *
      1000,
  ) / 1000;
}
