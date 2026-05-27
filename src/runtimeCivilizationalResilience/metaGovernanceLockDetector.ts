import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetMetaGovernanceLockDetectorForTest(): void {
  /* stateless */
}

export function scoreMetaGovernanceLock(input: RuntimeCivilizationalResilienceObserveInput): number {
  let lock = 0;
  if (input.metaRecursionRisk > 0.45 && input.governanceConfidence > 0.75) lock += 0.28;
  if (input.equilibriumPersistence > 0.78 && input.metaCoordinationStability > 0.72) lock += 0.22;
  if (input.runtimeGovernanceInflationRisk > 0.35 && input.metaRecursionRisk > 0.4) lock += 0.2;
  return Math.round(Math.min(1, lock) * 1000) / 1000;
}
