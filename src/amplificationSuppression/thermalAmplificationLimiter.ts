import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';
import { AMPLIFICATION_THERMAL_SEVERE } from '../constants/amplificationSuppression';

export function resetThermalAmplificationLimiterForTest(): void {
  /* stateless */
}

export function scoreThermalAmplificationPressure(input: AmplificationSuppressionObserveInput): number {
  let pressure = AMPLIFICATION_THERMAL_SEVERE.includes(input.thermalState) ? 0.85 : 0.1;
  if (input.thermalState === 'moderate') pressure = 0.45;
  pressure += input.observerOverheadRatio * 0.25;
  if (input.renderFps < 14) pressure += 0.12;
  return Math.round(Math.min(1, pressure) * 1000) / 1000;
}

export function shouldStrengthenThermalSuppression(input: AmplificationSuppressionObserveInput, density: number): boolean {
  return scoreThermalAmplificationPressure(input) > 0.5 && density > 0.5;
}
