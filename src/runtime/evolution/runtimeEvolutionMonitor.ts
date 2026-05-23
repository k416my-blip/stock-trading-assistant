/**
 * Runtime Evolution Monitor — adaptation health and stagnation signals.
 */
import type { EvolutionHealthState, EvolutionMonitorSignals } from '../../types/runtimeEvolution';
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { getRollbackFrequency } from '../governance/adaptiveRollbackSystem';
import { getLastGovernanceState } from '../governance/adaptiveRuntimeGovernance';

let healthState: EvolutionHealthState = 'EVOLVING';
const mutationHistory: number[] = [];

export function resetRuntimeEvolutionMonitorForTest(): void {
  healthState = 'EVOLVING';
  mutationHistory.length = 0;
}

function shannonEntropy(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let h = 0;
  for (const w of weights) {
    if (w <= 0) continue;
    const p = w / total;
    h -= p * Math.log2(p);
  }
  const maxH = Math.log2(Math.max(2, weights.length));
  return maxH === 0 ? 0 : Math.round((h / maxH) * 1000) / 1000;
}

export function collectEvolutionSignals(store: AdaptiveRuntimeLearningState): EvolutionMonitorSignals {
  const edges = Object.values(store.edges);
  const weights = edges.map((e) => e.runtimeLearnedWeight);
  const confidences = edges.map((e) => e.confidenceEma);
  const edgeEntropy = shannonEntropy(weights.length ? weights : [1]);

  const rootKeys = Object.keys(store.rootRankingHistory);
  const rootCounts = rootKeys.map((k) => store.rootRankingHistory[k]?.count ?? 0);
  const totalRoots = rootCounts.reduce((a, b) => a + b, 0);
  const maxRoot = totalRoots > 0 ? Math.max(...rootCounts) / totalRoots : 0;
  const replayDependence = Math.min(1, store.replayCount / Math.max(1, edges.length * 3 + 1));

  const gov = getLastGovernanceState();
  const rollbackFrequency = getRollbackFrequency() / Math.max(1, store.replayCount);

  const prevEdgeCount = mutationHistory.at(-1) ?? edges.length;
  mutationHistory.push(edges.length);
  if (mutationHistory.length > 24) mutationHistory.shift();
  const graphMutationRate =
    prevEdgeCount === 0 ? 0 : Math.abs(edges.length - prevEdgeCount) / Math.max(1, prevEdgeCount);

  const recoveryAttempts = Object.values(store.recovery).reduce((s, r) => s + r.attempts, 0);
  const recoverySuccesses = Object.values(store.recovery).reduce((s, r) => s + r.successes, 0);
  const recoveryReliance =
    recoveryAttempts === 0 ? 0 : recoverySuccesses / Math.max(1, recoveryAttempts);

  const confSpread =
    confidences.length < 2
      ? 1
      : Math.max(...confidences) - Math.min(...confidences);
  const confidenceFlattening = Math.max(0, 1 - confSpread);

  const transitionCount = Object.keys(store.transitions).length;
  const adaptationDiversity = Math.min(
    1,
    (edgeEntropy + transitionCount / Math.max(1, edges.length + 1)) / 2,
  );

  const learningStagnation =
    graphMutationRate < 0.05 && store.replayCount > 5 ? 1 - graphMutationRate * 10 : graphMutationRate;

  return {
    adaptationDiversity,
    replayDependence: Math.max(replayDependence, maxRoot),
    rollbackFrequency,
    edgeEntropy,
    graphMutationRate,
    recoveryReliance,
    learningStagnation,
    confidenceFlattening,
  };
}

export function resolveEvolutionHealthState(signals: EvolutionMonitorSignals): EvolutionHealthState {
  const gov = getLastGovernanceState();
  const driftCritical = gov?.drift.phase === 'DRIFT_CRITICAL' || gov?.drift.phase === 'DRIFT_FRAGMENTING';

  if (driftCritical && signals.rollbackFrequency > 0.4) return 'COLLAPSING';
  if (signals.replayDependence >= 0.75 && signals.adaptationDiversity < 0.3) return 'OVERFITTED';
  if (signals.learningStagnation > 0.7 && signals.edgeEntropy < 0.35) return 'STAGNATING';
  if (
    signals.edgeEntropy >= 0.45 &&
    signals.graphMutationRate > 0.05 &&
    signals.rollbackFrequency < 0.35
  ) {
    return 'EVOLVING';
  }
  if (signals.confidenceFlattening < 0.5 && signals.rollbackFrequency < 0.25) return 'STABLE';
  if (signals.learningStagnation > 0.5) return 'STAGNATING';
  return 'STABLE';
}

export function getEvolutionHealthState(): EvolutionHealthState {
  return healthState;
}

export function updateEvolutionHealthState(next: EvolutionHealthState): void {
  healthState = next;
}
