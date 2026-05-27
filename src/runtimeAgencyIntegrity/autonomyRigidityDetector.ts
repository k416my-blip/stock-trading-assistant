import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import { scoreAutonomyRigidity } from './runtimeAgencyEvolutionCoordinator';

export function resetAutonomyRigidityDetectorForTest(): void {
  /* stateless */
}

export function detectAutonomyRigidity(input: RuntimeAgencyIntegrityObserveInput): number {
  return scoreAutonomyRigidity(input);
}
