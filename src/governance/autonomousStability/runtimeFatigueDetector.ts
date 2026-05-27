import { AUTONOMOUS_GOVERNANCE_FATIGUE_SESSION_MIN } from '../../constants/autonomousStabilityGovernance';

export function detectRuntimeFatigue(
  sessionMinutes: number,
  metabolism: number,
  eventLoopLagMs: number,
): number {
  const session = Math.min(1, sessionMinutes / (AUTONOMOUS_GOVERNANCE_FATIGUE_SESSION_MIN * 2));
  const lag = Math.min(1, eventLoopLagMs / 600);
  return Math.round(Math.min(1, session * 0.45 + metabolism * 0.35 + lag * 0.2) * 1000) / 1000;
}

export function resetRuntimeFatigueDetectorForTest(): void {
  /* stateless */
}
