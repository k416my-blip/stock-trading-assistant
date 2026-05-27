import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetEquilibriumIdeologyDetectorForTest(): void {
  /* stateless */
}

export function scoreEquilibriumIdeology(input: RuntimeCivilizationalResilienceObserveInput): number {
  let ideology = input.equilibriumPersistence * 0.35;
  ideology += input.runtimeCalmnessIndex * 0.25;
  ideology += input.runtimeEquilibriumStability * 0.2;
  if (input.interventionDensity < 0.2) ideology += 0.12;
  return Math.round(Math.min(1, ideology) * 1000) / 1000;
}
