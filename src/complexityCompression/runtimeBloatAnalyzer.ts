import type { CompressionGraphSnapshot, ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetRuntimeBloatAnalyzerForTest(): void {
  /* stateless */
}

export function scoreRuntimeBloat(input: ComplexityCompressionObserveInput): number {
  let bloat = input.observerOverheadRatio * 0.25;
  bloat += input.telemetryAmplificationScore * 0.2;
  bloat += Math.min(1, input.orchestrationEdgeCount / 30) * 0.2;
  bloat += input.loadSheddingSeverity * 0.15;
  bloat += Math.min(1, input.pacingLayerCount / 10) * 0.1;
  bloat += input.runtimeTradingSuppression * 0.1;
  return Math.round(Math.min(1, bloat) * 1000) / 1000;
}

export function scoreOrchestrationInflationRisk(input: ComplexityCompressionObserveInput): number {
  let risk = Math.min(1, input.orchestrationEdgeCount / 28) * 0.4;
  risk += input.interventionDensity * 0.3;
  risk += (1 - input.metaCoordinationStability) * 0.2;
  if (input.sessionMinutes >= 120) risk += 0.1;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function buildOrchestrationInflationGraph(input: ComplexityCompressionObserveInput): CompressionGraphSnapshot {
  const risk = scoreOrchestrationInflationRisk(input);
  const layers = ['meta', 'governance', 'recovery', 'suppression', 'audit', 'safety'];
  return {
    nodes: layers.map((l) => ({ id: l, label: l, score: risk })),
    edges: layers.slice(0, -1).map((l, i) => ({
      from: l,
      to: layers[i + 1] ?? l,
      weight: input.interventionDensity,
    })),
    measuredAt: new Date().toISOString(),
  };
}
