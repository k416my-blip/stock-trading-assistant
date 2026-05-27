import type { RuntimeSelfRecursionEnduranceObserveInput } from '../types/runtimeSelfRecursionEndurance';

export function resetTelemetryEchoRiskScorerForTest(): void {
  /* stateless */
}

export function scoreTelemetryEchoRisk(input: RuntimeSelfRecursionEnduranceObserveInput): number {
  const base =
    input.telemetryAmplificationScore * 0.45 +
    input.runtimeAmplificationRisk * 0.25 +
    Math.min(1, input.telemetrySampleCount / 120) * 0.3;
  return Math.round(Math.min(1, Math.max(0.04, base)) * 1000) / 1000;
}
