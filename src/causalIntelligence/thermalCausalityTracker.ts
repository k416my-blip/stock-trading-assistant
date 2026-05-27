import type { CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';
import { CAUSAL_THERMAL_SEVERE } from '../constants/runtimeCausalIntelligence';

export function resetThermalCausalityTrackerForTest(): void {
  /* stateless */
}

export function scoreThermalCausality(input: CausalIntelligenceObserveInput): number {
  if (CAUSAL_THERMAL_SEVERE.includes(input.thermalState)) return 0.92;
  if (input.thermalState === 'moderate') return 0.55;
  if (input.thermalState === 'light') return 0.25;
  if (input.renderFps < 14 && input.batterySaver) return 0.35;
  return 0.08;
}

export function thermalCascadeLikely(input: CausalIntelligenceObserveInput): boolean {
  return scoreThermalCausality(input) > 0.5;
}
