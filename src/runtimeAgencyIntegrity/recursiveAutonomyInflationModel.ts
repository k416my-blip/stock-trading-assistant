import type { AgencyGraphSnapshot, RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import { RECURSIVE_AUTONOMY_CHAIN } from '../constants/runtimeAgencyIntegrity';

export function resetRecursiveAutonomyInflationModelForTest(): void {
  /* stateless */
}

function chainScore(input: RuntimeAgencyIntegrityObserveInput, node: string): number {
  switch (node) {
    case 'orchestration':
      return Math.min(1, input.orchestrationEdgeCount / 28);
    case 'observer':
      return input.observerDensityScore;
    case 'governance':
      return input.governanceConfidence;
    case 'intervention':
      return input.interventionDensity;
    case 'equilibrium':
      return input.equilibriumPersistence;
    default:
      return 0.5;
  }
}

export function buildRecursiveAutonomyGraph(input: RuntimeAgencyIntegrityObserveInput): AgencyGraphSnapshot {
  const nodes = RECURSIVE_AUTONOMY_CHAIN.map((n, i) => ({
    id: `${n}_${i}`,
    label: n,
    score: chainScore(input, n),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((n, i) => ({
      from: n.id,
      to: nodes[i + 1]?.id ?? n.id,
      weight: scoreRecursiveAutonomyInflationRisk(input),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function scoreRecursiveAutonomyInflationRisk(input: RuntimeAgencyIntegrityObserveInput): number {
  let risk = 0;
  if (input.orchestrationEdgeCount > 16 && input.observerDensityScore > 0.48) risk += 0.25;
  if (input.governanceConfidence > 0.75 && input.interventionDensity > 0.4) risk += 0.22;
  if (input.equilibriumPersistence > 0.75 && input.metaRecursionRisk > 0.4) risk += 0.2;
  if (input.recursiveBeliefReinforcementRisk > 0.35) risk += 0.18;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
