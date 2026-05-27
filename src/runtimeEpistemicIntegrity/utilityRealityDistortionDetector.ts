import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';

export function resetUtilityRealityDistortionDetectorForTest(): void {
  /* stateless */
}

export function scoreRuntimeRealityDistortionRisk(
  input: RuntimeEpistemicIntegrityObserveInput,
): number {
  let risk = input.runtimeUtilityMonocultureRisk * 0.35;
  if (input.runtimeUnifiedUtilityScore > 0.72 && input.continuityScore < 75) risk += 0.22;
  if (input.runtimeUtilityIntegrity > 0.7 && input.eventLoopLagMs > 280) risk += 0.2;
  if (input.valueDilutionRisk > 0.35 && input.runtimeUnifiedUtilityScore > 0.65) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
