import type { LimitationGraphSnapshot, RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';
import { META_RECURSION_CHAIN } from '../constants/runtimeSelfLimitation';

export function resetRuntimeMetaRecursionDetectorForTest(): void {
  /* stateless */
}

export function scoreMetaRecursionRisk(input: RuntimeSelfLimitationObserveInput): number {
  let risk = input.recursiveStabilizationRisk * 0.3;
  risk += input.runtimeAmplificationRisk * 0.2;
  risk += Math.min(1, input.orchestrationEdgeCount / 28) * 0.2;
  risk += input.interventionDensity * 0.15;
  risk += input.runtimeAuditCoverage > 0.75 && input.interventionDensity > 0.4 ? 0.15 : 0;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function computeRecursionDepth(input: RuntimeSelfLimitationObserveInput): number {
  return Math.round(
    Math.min(8, input.orchestrationEdgeCount / 4 + input.recursiveStabilizationRisk * 5) * 10,
  ) / 10;
}

export function buildMetaRecursionGraph(input: RuntimeSelfLimitationObserveInput): LimitationGraphSnapshot {
  const risk = scoreMetaRecursionRisk(input);
  const chain = [...META_RECURSION_CHAIN];
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
