/**
 * Adaptive Entropy Engine — prevent learning rigidity.
 */
import type { EntropyMetrics } from '../../types/runtimeEvolution';
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { ENTROPY_LOW_THRESHOLD } from '../../constants/runtimeEvolution';
import { isProtectedEdge } from '../../constants/adaptiveRuntimeLearning';

export function resetAdaptiveEntropyEngineForTest(): void {
  /* stateless */
}

export function measureAdaptiveEntropy(
  store: AdaptiveRuntimeLearningState,
  contradictionCount = 0,
): EntropyMetrics {
  const edges = Object.values(store.edges);
  const kinds = new Set(edges.map((e) => `${e.from}:${e.to}`));
  const edgeDiversity = Math.min(1, kinds.size / Math.max(1, edges.length));

  const transitions = Object.values(store.transitions);
  const probs = transitions.map((t) => t.learnedProbability);
  const mean = probs.length ? probs.reduce((a, b) => a + b, 0) / probs.length : 0;
  const variance =
    probs.length < 2
      ? 0.5
      : probs.reduce((s, p) => s + (p - mean) ** 2, 0) / probs.length;
  const latentPathVariance = Math.min(1, Math.sqrt(variance) * 2);

  const replayExplorationRatio = Math.min(
    1,
    store.falsePositives.length / Math.max(1, store.replayCount) + 0.15,
  );

  const contradictionTolerance = Math.min(1, contradictionCount / 5 + 0.2);
  const altPersist = Math.min(1, store.falsePositives.length / Math.max(1, edges.length));

  const entropyScore =
    Math.round(
      ((edgeDiversity +
        latentPathVariance +
        replayExplorationRatio +
        contradictionTolerance +
        altPersist) /
        5) *
        1000,
    ) / 1000;

  return {
    edgeDiversity,
    latentPathVariance,
    replayExplorationRatio,
    contradictionTolerance,
    alternativeHypothesisPersistence: altPersist,
    entropyScore,
  };
}

export function restoreEntropyOnLow(
  store: AdaptiveRuntimeLearningState,
  entropy: EntropyMetrics,
): { decayed: number; reopened: number } {
  if (entropy.entropyScore >= ENTROPY_LOW_THRESHOLD) {
    return { decayed: 0, reopened: 0 };
  }

  let decayed = 0;
  let reopened = 0;
  for (const rec of Object.values(store.edges)) {
    if (rec.protectedInvariant || isProtectedEdge(String(rec.from), String(rec.to), rec.relation)) {
      continue;
    }
    if (rec.confidenceEma > 0.85) {
      rec.confidenceEma *= 0.92;
      rec.runtimeLearnedWeight *= 0.95;
      decayed += 1;
    }
    if (rec.runtimeLearnedWeight < 0.2 && rec.hitCount >= 1) {
      rec.runtimeLearnedWeight = Math.min(0.35, rec.runtimeLearnedWeight + 0.08);
      reopened += 1;
    }
  }
  return { decayed, reopened };
}
