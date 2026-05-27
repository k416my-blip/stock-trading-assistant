import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetStrategicEcologyIntegrityMonitorForTest(): void {
  /* stateless */
}

export function scoreStrategicEcologyIntegrityIndex(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  const ecology =
    (input.runtimeStrategicCoherence + input.crossLayerUtilityConsistency + (1 - input.layerConflictRisk)) /
    3;
  return Math.round(Math.max(0, Math.min(1, ecology)) * 1000) / 1000;
}
