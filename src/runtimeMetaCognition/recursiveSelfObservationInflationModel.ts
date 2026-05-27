import type {
  MetaCognitionGraphSnapshot,
  RuntimeMetaCognitionObserveInput,
} from '../types/runtimeMetaCognition';
import { RECURSIVE_SELF_OBSERVATION_CHAIN } from '../constants/runtimeMetaCognition';

export function resetRecursiveSelfObservationInflationModelForTest(): void {
  /* stateless */
}

function chainScore(input: RuntimeMetaCognitionObserveInput, node: string): number {
  switch (node) {
    case 'observer':
      return input.observerDensityScore;
    case 'audit':
      return input.runtimeAuditCoverage;
    case 'self_model':
      return input.metaCoordinationStability;
    case 'coherence':
      return input.runtimeStrategicCoherence;
    case 'governance':
      return input.governanceConfidence;
    default:
      return 0.5;
  }
}

export function buildRecursiveSelfObservationGraph(
  input: RuntimeMetaCognitionObserveInput,
): MetaCognitionGraphSnapshot {
  const nodes = RECURSIVE_SELF_OBSERVATION_CHAIN.map((n, i) => ({
    id: `${n}_${i}`,
    label: n,
    score: chainScore(input, n),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((n, i) => ({
      from: n.id,
      to: nodes[i + 1]?.id ?? n.id,
      weight: scoreRecursiveSelfObservationRisk(input),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function scoreRecursiveSelfObservationRisk(input: RuntimeMetaCognitionObserveInput): number {
  let risk = 0;
  if (input.observerDensityScore > 0.48 && input.runtimeAuditCoverage > 0.72) risk += 0.25;
  if (input.metaCoordinationStability > 0.72 && input.runtimeStrategicCoherence > 0.75) risk += 0.22;
  if (input.governanceConfidence > 0.75 && input.observerOverheadRatio > 0.42) risk += 0.2;
  if (input.recursiveBeliefReinforcementRisk > 0.35) risk += 0.18;
  if (input.observerConfirmationLoopRisk > 0.35) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
