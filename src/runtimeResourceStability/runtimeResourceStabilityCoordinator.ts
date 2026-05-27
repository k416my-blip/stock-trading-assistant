import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';
import { scoreRuntimeMemoryPressure } from './memoryPressureMonitor';

export function resetRuntimeResourceStabilityCoordinatorForTest(): void {
  /* stateless */
}

export function scoreResourceStability(input: RuntimeResourceStabilityObserveInput): number {
  const risks = [
    scoreRuntimeMemoryPressure(input),
    input.eventLoopLagMs / 500,
    input.renderStormRisk,
  ];
  const mean = risks.reduce((a, b) => a + b, 0) / risks.length;
  return Math.round((1 - Math.min(1, mean)) * 1000) / 1000;
}
