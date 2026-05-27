import type { HomeostasisGraphSnapshot, RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';
import { DRIFT_TYPES } from '../constants/runtimeHomeostasis';

export function resetStabilityDriftDetectorForTest(): void {
  /* stateless */
}

export function scoreStabilityDriftRisk(input: RuntimeHomeostasisObserveInput): number {
  let risk = input.pacingDriftEstimate * 0.22;
  risk += input.interventionDensity * 0.2;
  risk += input.suppressionDriftEstimate * 0.2;
  risk += input.compressionDriftEstimate * 0.18;
  risk += input.thermalState !== 'none' && input.thermalState !== 'light' ? 0.15 : 0.03;
  risk += input.runtimeEntropyScore * 0.07;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function detectDriftTypes(input: RuntimeHomeostasisObserveInput): string[] {
  const drifts: string[] = [];
  if (input.pacingDriftEstimate > 0.35) drifts.push('pacing_drift');
  if (input.interventionDensity > 0.45) drifts.push('intervention_drift');
  if (input.suppressionDriftEstimate > 0.35) drifts.push('suppression_drift');
  if (input.compressionDriftEstimate > 0.35) drifts.push('compression_drift');
  if (input.thermalState === 'moderate' || input.thermalState === 'severe') drifts.push('thermal_drift');
  return drifts.filter((d) => DRIFT_TYPES.includes(d as (typeof DRIFT_TYPES)[number]));
}

export function buildStabilityDriftGraph(input: RuntimeHomeostasisObserveInput): HomeostasisGraphSnapshot {
  const drifts = detectDriftTypes(input);
  return {
    nodes: drifts.map((d) => ({ id: d, label: d, score: scoreStabilityDriftRisk(input) })),
    edges: drifts.map((d, i) => ({
      from: d,
      to: drifts[(i + 1) % Math.max(1, drifts.length)] ?? d,
      weight: 0.4,
    })),
    measuredAt: new Date().toISOString(),
  };
}
