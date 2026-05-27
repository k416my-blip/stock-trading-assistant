import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';

export function resetResourceDriftRadarBuilderForTest(): void {
  /* stateless */
}

export function buildDriftRadar(input: RuntimeResourceStabilityObserveInput): { axis: string; value: number }[] {
  return [
    { axis: 'heap', value: input.jsHeapMb / 200 },
    { axis: 'lag', value: input.eventLoopLagMs / 500 },
    { axis: 'render', value: input.renderStormRisk },
    { axis: 'bridge', value: input.bridgeTrafficRate / 20 },
    { axis: 'session', value: Math.min(1, input.sessionMinutes / 240) },
  ].map((p) => ({ ...p, value: Math.round(Math.min(1, p.value) * 1000) / 1000 }));
}
