import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';

export function resetThreadLatencyMonitorForTest(): void {
  /* stateless */
}

export function scoreRuntimeThreadLatencyRisk(input: RuntimeResourceStabilityObserveInput): number {
  return Math.round(Math.min(1, input.eventLoopLagMs / 500) * 1000) / 1000;
}
