import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetTelemetryAmplificationMonitorForTest(): void {
  /* stateless */
}

export function monitorTelemetryAmplification(input: RuntimeObserverRecursionObserveInput): number {
  return Math.round(
    (input.telemetryAmplificationScore + input.bridgeTrafficRate / 25) * 1000,
  ) / 1000;
}
