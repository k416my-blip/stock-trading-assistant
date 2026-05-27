import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetRuntimeNoiseReductionEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeNoiseRatio(input: ComplexityCompressionObserveInput): number {
  let noise = input.runtimeEntropyScore * 0.35;
  noise += Math.min(1, input.eventLoopLagMs / 500) * 0.25;
  noise += input.renderStormRisk * 0.2;
  noise += Math.min(1, input.reconnectPerMin / 12) * 0.1;
  noise += input.telemetryAmplificationScore * 0.1;
  return Math.round(Math.min(1, noise) * 1000) / 1000;
}

export function smoothNoiseEstimate(input: ComplexityCompressionObserveInput): number {
  return Math.round((1 - scoreRuntimeNoiseRatio(input)) * 1000) / 1000;
}
