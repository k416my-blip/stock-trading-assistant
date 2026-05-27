import type { ObserverGraphSnapshot, RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';
import { OBSERVER_RECURSION_CHAIN } from '../constants/runtimeObserverRecursion';

export function resetRecursiveObserverCascadeModelForTest(): void {
  /* stateless */
}

export function buildObserveGraph(input: RuntimeObserverRecursionObserveInput): ObserverGraphSnapshot {
  const nodes = OBSERVER_RECURSION_CHAIN.map((label, i) => ({
    id: `${label}_${i}`,
    label,
    score: scoreObserverRecursionRisk(input) * (0.7 + i * 0.06),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((n, i) => ({
      from: n.id,
      to: nodes[i + 1]?.id ?? n.id,
      weight: input.telemetryAmplificationScore,
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function scoreObserverRecursionRisk(input: RuntimeObserverRecursionObserveInput): number {
  let risk = 0.06;
  if (input.observerDensityScore > 0.45 && input.observerOverheadRatio > 0.4) risk += 0.28;
  if (input.runtimeAuditCoverage > 0.7 && input.orchestrationEdgeCount > 18) risk += 0.24;
  if (input.metaRecursionRisk > 0.4) risk += 0.2;
  if (input.telemetryAmplificationScore > 0.45) risk += 0.18;
  return Math.round(Math.min(1, Math.max(0.05, risk)) * 1000) / 1000;
}
