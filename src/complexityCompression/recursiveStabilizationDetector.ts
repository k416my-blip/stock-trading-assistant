import type { CompressionGraphSnapshot, ComplexityCompressionObserveInput } from '../types/complexityCompression';
import { RECURSIVE_STABILIZATION_CHAIN } from '../constants/complexityCompression';

export function resetRecursiveStabilizationDetectorForTest(): void {
  /* stateless */
}

export function scoreRecursiveStabilizationRisk(input: ComplexityCompressionObserveInput): number {
  let risk = 0;
  if (input.runtimeAmplificationRisk > 0.4) risk += 0.25;
  if (input.recoveryChainLength > 5) risk += 0.2;
  if (input.interventionDensity > 0.5) risk += 0.18;
  if (input.runtimeEntropyScore > 0.45) risk += 0.15;
  if (input.orchestrationEdgeCount > 18) risk += 0.12;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function buildRecursiveStabilizationMap(input: ComplexityCompressionObserveInput): CompressionGraphSnapshot {
  const chain = [...RECURSIVE_STABILIZATION_CHAIN];
  const risk = scoreRecursiveStabilizationRisk(input);
  return {
    nodes: chain.map((c) => ({ id: c, label: c, score: risk })),
    edges: chain.slice(0, -1).map((c, i) => ({
      from: c,
      to: chain[i + 1] ?? c,
      weight: risk,
    })),
    measuredAt: new Date().toISOString(),
  };
}
