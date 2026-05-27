import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';
import { RUNTIME_INTENTS } from '../constants/strategicCoherence';

export function resetRuntimeIntentPreservationEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeIntentIntegrity(input: StrategicCoherenceObserveInput): number {
  const intents: Record<string, number> = {
    continuity: input.continuityScore / 100,
    stability: input.runtimeEquilibriumStability,
    survivability: input.survivabilityEffectiveness,
  };
  const values = RUNTIME_INTENTS.map((i) => intents[i] ?? 0.5);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const drift = Math.max(...values) - Math.min(...values);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - drift * 0.4))) * 1000) / 1000;
}

export function detectIntentDrift(input: StrategicCoherenceObserveInput): string[] {
  const drifts: string[] = [];
  if (input.continuityScore < 72 && input.runtimeTradingSuppression > 0.4) drifts.push('continuity');
  if (input.runtimeEquilibriumStability < 0.55 && input.interventionDensity > 0.5) drifts.push('stability');
  if (input.survivabilityEffectiveness < 0.5 && input.runtimeComplexityScore > 0.5) drifts.push('survivability');
  return drifts;
}
