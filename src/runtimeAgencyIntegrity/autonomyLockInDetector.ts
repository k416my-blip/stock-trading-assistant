import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';

export function resetAutonomyLockInDetectorForTest(): void {
  /* stateless */
}

export function scoreAutonomyLockIn(input: RuntimeAgencyIntegrityObserveInput): number {
  let lock = 0;
  if (input.runtimeOrchestrationCivilizationRisk > 0.35 && input.runtimeWorldviewLockRisk > 0.35) {
    lock += 0.28;
  }
  if (input.equilibriumPersistence > 0.78 && input.runtimeSelfLimitationScore < 0.55) lock += 0.22;
  if (input.governanceConfidence > 0.78 && input.simplificationIntegrity < 0.52) lock += 0.2;
  return Math.round(Math.min(1, lock) * 1000) / 1000;
}
