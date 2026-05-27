import type {
  NarrativeGraphSnapshot,
  RuntimeNarrativeIntegrityObserveInput,
} from '../types/runtimeNarrativeIntegrity';
import { RECURSIVE_NARRATIVE_CHAIN } from '../constants/runtimeNarrativeIntegrity';

export function resetRecursiveNarrativeInflationModelForTest(): void {
  /* stateless */
}

function chainScore(input: RuntimeNarrativeIntegrityObserveInput, node: string): number {
  switch (node) {
    case 'explanation':
      return input.runtimeAuditCoverage;
    case 'interpretation':
      return input.runtimeStrategicCoherence;
    case 'reinforcement':
      return input.recursiveBeliefReinforcementRisk;
    case 'fixation':
      return input.equilibriumPersistence;
    case 'reinterpretation':
      return input.observerConfirmationLoopRisk;
    default:
      return 0.5;
  }
}

export function buildRecursiveNarrativeGraph(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeGraphSnapshot {
  const nodes = RECURSIVE_NARRATIVE_CHAIN.map((n, i) => ({
    id: `${n}_${i}`,
    label: n,
    score: chainScore(input, n),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((n, i) => ({
      from: n.id,
      to: nodes[i + 1]?.id ?? n.id,
      weight: scoreRecursiveNarrativeInflationRisk(input),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function scoreRecursiveNarrativeInflationRisk(
  input: RuntimeNarrativeIntegrityObserveInput,
): number {
  let risk = 0;
  if (input.runtimeAuditCoverage > 0.72 && input.runtimeStrategicCoherence > 0.75) risk += 0.25;
  if (input.recursiveBeliefReinforcementRisk > 0.35 && input.equilibriumPersistence > 0.72) {
    risk += 0.22;
  }
  if (input.observerConfirmationLoopRisk > 0.35 && input.governanceConfidence > 0.75) risk += 0.2;
  if (input.recursiveSelfObservationRisk > 0.35) risk += 0.18;
  if (input.runtimeEpistemologyInflationRisk > 0.35) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
