import type { ObserverGraphSnapshot, RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetObserverDependencyGraphBuilderForTest(): void {
  /* stateless */
}

export function buildDependencyGraph(input: RuntimeObserverRecursionObserveInput): ObserverGraphSnapshot {
  const layers = ['governance', 'audit', 'observer', 'telemetry'];
  const nodes = layers.map((label) => ({
    id: label,
    label,
    score: input.observerOverheadRatio,
  }));
  return {
    nodes,
    edges: [{ from: 'governance', to: 'observer', weight: input.telemetryAmplificationScore }],
    measuredAt: new Date().toISOString(),
  };
}
