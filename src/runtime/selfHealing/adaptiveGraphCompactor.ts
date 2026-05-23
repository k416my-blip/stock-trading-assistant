/**
 * Adaptive graph compaction — prune weak edges; preserve governance-critical paths.
 */
import type { AdaptiveGraphCompactionResult } from '../../types/runtimeSelfHealing';
import { getAdaptiveLearningStore } from '../analysis/adaptiveRuntimeLearningStorage';
import { isProtectedEdge } from '../../constants/adaptiveRuntimeLearning';
import { applyLongTermDecayGovernance } from '../governance/longTermDecayGovernance';

export function compactAdaptiveGraph(force = false): AdaptiveGraphCompactionResult {
  const store = getAdaptiveLearningStore();
  const edgesBefore = Object.keys(store.edges).length;
  const transitionsBefore = Object.keys(store.transitions).length;
  let protectedPreserved = 0;
  let latentPathsMerged = 0;

  applyLongTermDecayGovernance(store);

  for (const [key, rec] of Object.entries(store.edges)) {
    if (rec.protectedInvariant || isProtectedEdge(String(rec.from), String(rec.to), rec.relation)) {
      protectedPreserved += 1;
      continue;
    }
    const weak =
      rec.hitCount < 3 &&
      rec.runtimeLearnedWeight < 0.35 &&
      rec.successfulPredictionCount / Math.max(1, rec.hitCount) < 0.25;
    if (weak || (force && rec.runtimeLearnedWeight < 0.2)) {
      delete store.edges[key];
    }
  }

  const seenLatent = new Set<string>();
  for (const [key, tr] of Object.entries(store.transitions)) {
    const sig = `${tr.from}->${tr.to}`;
    if (seenLatent.has(sig) && tr.hitCount < 2) {
      delete store.transitions[key];
      latentPathsMerged += 1;
      continue;
    }
    seenLatent.add(sig);
    if (tr.hitCount < 2 && tr.observedCount / Math.max(1, tr.hitCount) < 0.12) {
      delete store.transitions[key];
    }
  }

  const edgesAfter = Object.keys(store.edges).length;
  const transitionsPruned = transitionsBefore - Object.keys(store.transitions).length;
  const compactionRatio =
    edgesBefore === 0 ? 1 : Math.round((1 - edgesAfter / edgesBefore) * 1000) / 1000;

  return {
    edgesBefore,
    edgesAfter,
    transitionsPruned,
    latentPathsMerged,
    compactionRatio,
    protectedPreserved,
  };
}
