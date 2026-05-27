import type {
  EcologyGraphSnapshot,
  RuntimeCivilizationalResilienceObserveInput,
} from '../types/runtimeCivilizationalResilience';
import { RECURSIVE_GOVERNANCE_CHAIN } from '../constants/runtimeCivilizationalResilience';

export function resetRecursiveGovernanceEcologyModelForTest(): void {
  /* stateless */
}

function chainScore(input: RuntimeCivilizationalResilienceObserveInput, node: string): number {
  switch (node) {
    case 'governance':
      return input.governanceConfidence;
    case 'audit':
      return input.runtimeAuditCoverage;
    case 'orchestration':
      return Math.min(1, input.orchestrationEdgeCount / 28);
    case 'meta':
      return input.metaRecursionRisk;
    case 'equilibrium':
      return input.equilibriumPersistence;
    default:
      return 0.5;
  }
}

export function buildRecursiveGovernanceGraph(
  input: RuntimeCivilizationalResilienceObserveInput,
): EcologyGraphSnapshot {
  const nodes = RECURSIVE_GOVERNANCE_CHAIN.map((n) => ({
    id: n,
    label: n,
    score: chainScore(input, n),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((n, i) => ({
      from: n.id,
      to: nodes[i + 1]?.id ?? n.id,
      weight: scoreRecursiveGovernanceEcologyRisk(input),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function scoreRecursiveGovernanceEcologyRisk(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  let risk = 0;
  if (input.governanceConfidence > 0.78 && input.runtimeGovernanceInflationRisk > 0.35) risk += 0.25;
  if (input.runtimeAuditCoverage > 0.72 && input.metaRecursionRisk > 0.4) risk += 0.22;
  if (input.metaCoordinationStability > 0.72 && input.interventionDensity > 0.4) risk += 0.2;
  if (input.equilibriumPersistence > 0.75 && input.runtimeGovernanceInflationRisk > 0.3) risk += 0.18;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
