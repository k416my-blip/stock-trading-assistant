import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';

export function resetMemoryPressureMonitorForTest(): void {
  /* stateless */
}

export function scoreRuntimeMemoryPressure(input: RuntimeResourceStabilityObserveInput): number {
  return Math.round(
    Math.min(1, input.jsHeapMb / 200 + input.memoryTrendPct / 100) * 1000,
  ) / 1000;
}
