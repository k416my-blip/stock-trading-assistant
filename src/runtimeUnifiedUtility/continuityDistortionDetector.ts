import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';

export function resetContinuityDistortionDetectorForTest(): void {
  /* stateless */
}

export function scoreContinuityDistortion(input: RuntimeUnifiedUtilityObserveInput): number {
  const continuity = input.continuityScore / 100;
  const perceived =
    (input.runtimeUtilityIntegrity + input.runtimePurposeIntegrityScore) / 2;
  return Math.round(Math.abs(continuity - perceived) * 1000) / 1000;
}
