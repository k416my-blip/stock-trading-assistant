import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';
import { scoreGlobalUtilityEquilibrium } from './runtimeUtilityEquilibriumEngine';

export function resetRuntimeUtilityIntegrityMonitorForTest(): void {
  /* stateless */
}

export function scoreRuntimeUtilityIntegrity(input: StrategicCoherenceObserveInput): number {
  const equilibrium = scoreGlobalUtilityEquilibrium(input);
  let integrity = equilibrium * 0.55;
  integrity += (input.continuityScore / 100) * 0.2;
  integrity += input.survivabilityEffectiveness * 0.15;
  integrity += (1 - input.observerOverheadRatio) * 0.1;
  return Math.round(Math.max(0, Math.min(1, integrity)) * 1000) / 1000;
}
