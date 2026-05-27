import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';
import { scoreGlobalUtilityBalance } from './crossLayerUtilityHarmonizer';

export function resetRuntimeStrategicArbitrationEngineForTest(): void {
  /* stateless */
}

export function arbitrateGlobalUtility(input: StrategicCoherenceObserveInput): string {
  const globalUtility = scoreGlobalUtilityBalance(input);
  const localPressure = input.interventionDensity + input.runtimeTradingSuppression;
  if (globalUtility > localPressure) return 'global_utility_wins';
  if (input.continuityScore < 65) return 'continuity_override';
  if (input.recoverySuccessRate < 0.6) return 'recovery_override';
  return 'balanced_arbitration';
}

export function scoreArbitrationConfidence(input: StrategicCoherenceObserveInput): number {
  const decision = arbitrateGlobalUtility(input);
  if (decision === 'balanced_arbitration') return 0.75;
  if (decision === 'global_utility_wins') return 0.82;
  return 0.68;
}
