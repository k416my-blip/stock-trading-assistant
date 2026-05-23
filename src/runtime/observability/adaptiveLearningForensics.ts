/**
 * Adaptive learning forensics — drift, rollback, false causal chains.
 */
import type { AdaptiveForensicsView } from '../../types/runtimeObservability';
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import type { AdaptiveGovernanceState } from '../../types/adaptiveRuntimeGovernance';
import { getRuntimeJournalEvents } from './runtimeEventJournal';

export function buildAdaptiveLearningForensics(
  store?: AdaptiveRuntimeLearningState,
  governance?: AdaptiveGovernanceState | null,
): AdaptiveForensicsView {
  const learnedEdgeEvolution = store
    ? Object.values(store.edges)
        .map((e) => ({ edgeKey: e.edgeKey, weight: e.runtimeLearnedWeight, hits: e.hitCount }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 20)
    : [];

  const replayInstabilityHistory = getRuntimeJournalEvents({ kind: 'replay_divergence' }).map((e) => ({
    at: e.at,
    divergence: e.v1 ?? 0,
  }));

  const rollbackHistory =
    governance?.rollbackSnapshots.map((s) => ({
      id: s.id,
      at: s.createdAt,
      reason: s.reason,
    })) ?? getRuntimeJournalEvents({ kind: 'rollback_execution' }).map((e, i) => ({
      id: `j-${i}`,
      at: e.at,
      reason: e.detailJa,
    }));

  const staleLineage = store
    ? Object.values(store.edges)
        .filter((e) => e.hitCount >= 2 && e.successfulPredictionCount / e.hitCount < 0.3)
        .map((e) => e.edgeKey)
    : [];

  const falseCausalChain = store
    ? store.falsePositives.map((f) => `${f.predictedRoot}→${f.actualOutcome}×${f.count}`)
    : [];

  return {
    learnedEdgeEvolution,
    replayInstabilityHistory,
    rollbackHistory,
    staleLineage,
    falseCausalChain,
  };
}
