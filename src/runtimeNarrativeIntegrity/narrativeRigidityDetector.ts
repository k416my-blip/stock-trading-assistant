import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetNarrativeRigidityDetectorForTest(): void {
  /* stateless */
}

export function detectNarrativeRigidity(input: RuntimeNarrativeIntegrityObserveInput): number {
  return Math.round(
    (input.equilibriumPersistence * 0.35 +
      input.runtimeWorldviewLockRisk * 0.35 +
      input.runtimeStrategicCoherence * 0.3) *
      1000,
  ) / 1000;
}
