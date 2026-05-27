import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';

export function resetTelemetryPayloadExplosionDetectorForTest(): void {
  /* stateless */
}

export function scoreRuntimeTelemetryPayloadRisk(input: RuntimeResourceStabilityObserveInput): number {
  return Math.round(
    Math.min(1, input.bridgeTrafficRate / 20 + input.telemetryAmplificationScore * 0.5) * 1000,
  ) / 1000;
}
