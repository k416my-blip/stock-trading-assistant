import type { AutonomousGovernanceObserveInput } from '../../types/autonomousStabilityGovernance';

export type SurvivabilityClass = 'high' | 'medium' | 'low';

export function classifyDeviceSurvivability(
  input: AutonomousGovernanceObserveInput,
  stabilityScore: number,
): SurvivabilityClass {
  if (input.miuiAggressiveReclaim && stabilityScore < 60) return 'low';
  if (stabilityScore >= 75 && input.continuityScore >= 70) return 'high';
  return 'medium';
}

export function resetDeviceSurvivabilityClassifierForTest(): void {
  /* stateless */
}
