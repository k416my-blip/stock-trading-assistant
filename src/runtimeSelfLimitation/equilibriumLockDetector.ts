import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';

export function resetEquilibriumLockDetectorForTest(): void {
  /* stateless */
}

export function detectEquilibriumLock(input: RuntimeSelfLimitationObserveInput): boolean {
  return (
    input.runtimeCalmnessIndex > 0.72 &&
    input.interventionDensity > 0.35 &&
    input.equilibriumPersistence > 0.7
  );
}

export function suggestEquilibriumUnlock(input: RuntimeSelfLimitationObserveInput): string {
  if (!detectEquilibriumLock(input)) return 'no_lock';
  return 'suggest_reduce_stabilization_inertia';
}
