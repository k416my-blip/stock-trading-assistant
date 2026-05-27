import type { AutonomousGovernanceObserveInput } from '../../types/autonomousStabilityGovernance';

export function scoreLongSessionAdaptation(
  input: AutonomousGovernanceObserveInput,
  runtimeMetabolism: number,
): number {
  let score = 100;
  if (input.sessionMinutes > 120) score -= 10;
  if (input.sessionMinutes > 240) score -= 15;
  if (runtimeMetabolism > 0.7) score -= 12;
  if (input.continuityScore < 70) score -= 18;
  return Math.max(0, Math.min(100, score));
}

export function resetLongSessionAdaptationEngineForTest(): void {
  /* stateless */
}
