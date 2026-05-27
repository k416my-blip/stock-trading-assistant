import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

const entropyTimeline: { at: string; entropy: number }[] = [];
let lastInterventionBand = 0;
let lastObserverBand = 0;

export function resetRuntimeEntropyStabilizerForTest(): void {
  entropyTimeline.length = 0;
  lastInterventionBand = 0;
  lastObserverBand = 0;
}

export function scoreRuntimeEntropy(
  input: AmplificationSuppressionObserveInput,
  interventionDensity: number,
): number {
  const interventionDelta = Math.abs(interventionDensity - lastInterventionBand);
  const observerDelta = Math.abs(input.observerOverheadRatio - lastObserverBand);
  lastInterventionBand = interventionDensity;
  lastObserverBand = input.observerOverheadRatio;
  const recoveryOsc = input.recoverySuccessRate < 0.7 ? 0.15 : 0;
  const entropy = interventionDelta * 0.4 + observerDelta * 0.35 + recoveryOsc + input.telemetryAmplificationScore * 0.1;
  const rounded = Math.round(Math.min(1, entropy) * 1000) / 1000;
  entropyTimeline.push({ at: new Date().toISOString(), entropy: rounded });
  if (entropyTimeline.length > 64) entropyTimeline.shift();
  return rounded;
}

export function shouldApplyStabilizationLock(entropy: number): boolean {
  return entropy > 0.55;
}

export function getEntropyTimeline(): { at: string; entropy: number }[] {
  return [...entropyTimeline];
}
