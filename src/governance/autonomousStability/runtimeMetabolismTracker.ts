import { AUTONOMOUS_GOVERNANCE_FATIGUE_SESSION_MIN } from '../../constants/autonomousStabilityGovernance';
import type { AutonomousGovernanceObserveInput } from '../../types/autonomousStabilityGovernance';

export function computeRuntimeMetabolism(input: AutonomousGovernanceObserveInput): number {
  const sessionFactor = Math.min(1, input.sessionMinutes / AUTONOMOUS_GOVERNANCE_FATIGUE_SESSION_MIN);
  const heapFactor = Math.min(1, input.jsHeapMb / 220);
  const bridgeFactor = Math.min(1, input.bridgeTrafficRate / 14);
  return Math.round(((sessionFactor + heapFactor + bridgeFactor) / 3) * 1000) / 1000;
}

export function resetRuntimeMetabolismTrackerForTest(): void {
  /* stateless */
}
