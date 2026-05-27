import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';

export function resetRenderStormMonitorForTest(): void {
  /* stateless */
}

export function scoreRuntimeRenderStormRisk(input: RuntimeResourceStabilityObserveInput): number {
  return Math.round(
    Math.min(1, input.renderStormRisk + (input.renderFps < 20 ? 0.35 : 0)) * 1000,
  ) / 1000;
}
