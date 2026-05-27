import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';

export function resetEventQueueSaturationDetectorForTest(): void {
  /* stateless */
}

export function scoreRuntimeEventQueueRisk(input: RuntimeResourceStabilityObserveInput): number {
  return Math.round(
    Math.min(1, input.eventLoopLagMs / 400 + input.bridgeTrafficRate / 25) * 1000,
  ) / 1000;
}
