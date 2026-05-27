import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

export function resetMetaEquilibriumLockDetectorForTest(): void {
  /* stateless */
}

export function scoreMetaEquilibriumLock(input: RuntimeUnifiedUtilityObserveInput): number {
  let lock = 0;
  if (input.equilibriumPersistence > 0.78 && input.metaRecursionRisk > 0.4) lock += 0.28;
  if (input.runtimeEquilibriumStability > 0.78 && input.eventLoopLagMs > 280) lock += 0.22;
  if (input.metaCoordinationStability > 0.75 && input.simplificationIntegrity < 0.55) lock += 0.2;
  return Math.round(Math.min(1, lock) * 1000) / 1000;
}
