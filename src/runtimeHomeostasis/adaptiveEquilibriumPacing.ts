import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

const pacingEvolution: { at: string; pacing: number }[] = [];

export function resetAdaptiveEquilibriumPacingForTest(): void {
  pacingEvolution.length = 0;
}

export function computeAdaptivePacing(input: RuntimeHomeostasisObserveInput): number {
  let pacing = 0.5;
  if (input.eventLoopLagMs > 300) pacing += 0.15;
  if (input.interventionDensity > 0.45) pacing -= 0.1;
  if (input.runtimeEntropyScore > 0.45) pacing += 0.08;
  if (input.thermalState !== 'none') pacing += 0.05;
  if (input.continuityScore > 80) pacing -= 0.05;
  return Math.round(Math.max(0.2, Math.min(0.9, pacing)) * 1000) / 1000;
}

export function scoreAdaptiveEquilibriumConfidence(input: RuntimeHomeostasisObserveInput): number {
  const pacing = computeAdaptivePacing(input);
  let conf = 0.55 + (0.5 - Math.abs(pacing - 0.5)) * 0.6;
  conf += input.governanceConfidence * 0.15;
  conf += (1 - stabilizationOscillationEstimate(input)) * 0.1;
  return Math.round(Math.min(1, conf) * 1000) / 1000;
}

function stabilizationOscillationEstimate(input: RuntimeHomeostasisObserveInput): number {
  return Math.min(1, input.runtimeEntropyScore + input.pacingDriftEstimate * 0.5);
}

export function noteAdaptivePacingSample(input: RuntimeHomeostasisObserveInput): void {
  const pacing = computeAdaptivePacing(input);
  pacingEvolution.push({ at: new Date().toISOString(), pacing });
  if (pacingEvolution.length > 64) pacingEvolution.shift();
}

export function getAdaptivePacingEvolution(): { at: string; pacing: number }[] {
  return [...pacingEvolution];
}
