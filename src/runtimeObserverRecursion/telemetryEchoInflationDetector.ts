import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetTelemetryEchoInflationDetectorForTest(): void {
  /* stateless */
}

export function scoreTelemetryAmplificationRisk(input: RuntimeObserverRecursionObserveInput): number {
  return Math.round(
    Math.min(
      1,
      input.telemetryAmplificationScore * 0.45 +
        input.runtimeAmplificationRisk * 0.3 +
        Math.min(1, input.bridgeTrafficRate / 20) * 0.25,
    ) * 1000,
  ) / 1000;
}
