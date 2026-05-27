import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import { scoreConstraintStability } from './constraintErosionMonitor';

export function resetConstraintStabilityTrackerForTest(): void {
  /* stateless */
}

export function trackConstraintStability(input: RuntimeAgencyIntegrityObserveInput): number {
  return scoreConstraintStability(input);
}
