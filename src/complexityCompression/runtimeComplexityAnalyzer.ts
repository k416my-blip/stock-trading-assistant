import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

const complexityHistory: { at: string; score: number }[] = [];

export function resetRuntimeComplexityAnalyzerForTest(): void {
  complexityHistory.length = 0;
}

export function scoreRuntimeComplexity(input: ComplexityCompressionObserveInput): number {
  let complexity = 0;
  complexity += Math.min(1, input.observerCountEstimate / 40) * 0.2;
  complexity += input.telemetryAmplificationScore * 0.15;
  complexity += Math.min(1, input.pacingLayerCount / 12) * 0.12;
  complexity += input.interventionDensity * 0.15;
  complexity += Math.min(1, input.recoveryChainLength / 8) * 0.12;
  complexity += Math.min(1, input.orchestrationEdgeCount / 24) * 0.13;
  complexity += input.observerOverheadRatio * 0.13;
  const rounded = Math.round(Math.min(1, complexity) * 1000) / 1000;
  complexityHistory.push({ at: new Date().toISOString(), score: rounded });
  if (complexityHistory.length > 64) complexityHistory.shift();
  return rounded;
}

export function getComplexityEvolution(): { at: string; score: number }[] {
  return [...complexityHistory];
}

export function estimateLayerCounts(input: ComplexityCompressionObserveInput): {
  observers: number;
  pacing: number;
  interventions: number;
  recoveryChains: number;
  orchestrationEdges: number;
} {
  return {
    observers: input.observerCountEstimate,
    pacing: input.pacingLayerCount,
    interventions: Math.round(input.interventionDensity * 20),
    recoveryChains: input.recoveryChainLength,
    orchestrationEdges: input.orchestrationEdgeCount,
  };
}
