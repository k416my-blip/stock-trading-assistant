import type { StrategicGraphSnapshot, StrategicCoherenceObserveInput } from '../types/strategicCoherence';

export function resetStrategicPacingHarmonizerForTest(): void {
  /* stateless */
}

export function buildStrategicPacingHarmonizationMap(input: StrategicCoherenceObserveInput): StrategicGraphSnapshot {
  const layers = ['pacing', 'cooldown', 'suppression_timing', 'recovery_timing'];
  const unified = Math.min(
    1,
    (1 - input.interventionDensity) * 0.4 +
      input.runtimeEquilibriumStability * 0.3 +
      (1 - input.stabilityDriftRisk) * 0.3,
  );
  return {
    nodes: layers.map((l) => ({ id: l, label: l, score: unified })),
    edges: layers.slice(0, -1).map((l, i) => ({
      from: l,
      to: layers[i + 1] ?? l,
      weight: unified,
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function scorePacingHarmonization(input: StrategicCoherenceObserveInput): number {
  return Math.round(
    Math.max(
      0,
      Math.min(
        1,
        input.runtimeEquilibriumStability * 0.4 +
          (1 - input.stabilityDriftRisk) * 0.35 +
          (1 - input.interventionDensity) * 0.25,
      ),
    ) * 1000,
  ) / 1000;
}
