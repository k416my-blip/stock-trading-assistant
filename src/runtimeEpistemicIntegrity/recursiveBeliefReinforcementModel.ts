import type {
  EpistemicGraphSnapshot,
  RuntimeEpistemicIntegrityObserveInput,
} from '../types/runtimeEpistemicIntegrity';
import { RECURSIVE_BELIEF_CHAIN } from '../constants/runtimeEpistemicIntegrity';

export function resetRecursiveBeliefReinforcementModelForTest(): void {
  /* stateless */
}

function chainScore(input: RuntimeEpistemicIntegrityObserveInput, node: string): number {
  switch (node) {
    case 'observer':
      return input.observerDensityScore;
    case 'governance':
      return input.governanceConfidence;
    case 'orchestration':
      return Math.min(1, input.orchestrationEdgeCount / 28);
    case 'equilibrium':
      return input.equilibriumPersistence;
    default:
      return 0.5;
  }
}

export function buildRecursiveBeliefGraph(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicGraphSnapshot {
  const nodes = RECURSIVE_BELIEF_CHAIN.map((n, i) => ({
    id: `${n}_${i}`,
    label: n,
    score: chainScore(input, n),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((n, i) => ({
      from: n.id,
      to: nodes[i + 1]?.id ?? n.id,
      weight: scoreRecursiveBeliefReinforcementRisk(input),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function scoreRecursiveBeliefReinforcementRisk(
  input: RuntimeEpistemicIntegrityObserveInput,
): number {
  let risk = 0;
  if (input.observerDensityScore > 0.5 && input.governanceConfidence > 0.75) risk += 0.25;
  if (input.recursiveGovernanceEcologyRisk > 0.35 && input.metaRecursionRisk > 0.4) risk += 0.22;
  if (input.equilibriumPersistence > 0.75 && input.observerOverheadRatio > 0.45) risk += 0.2;
  if (input.telemetryAmplificationScore > 0.4 && input.runtimeAuditCoverage > 0.7) risk += 0.18;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
