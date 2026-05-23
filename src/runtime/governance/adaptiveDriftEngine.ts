/**
 * Adaptive Drift Engine — detects drift velocity, instability, replay divergence.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import type { DriftMetrics, DriftPhase, GovernanceRunInput } from '../../types/adaptiveRuntimeGovernance';
import {
  DRIFT_CRITICAL_THRESHOLD,
  DRIFT_FRAGMENTING_THRESHOLD,
  DRIFT_WARNING_THRESHOLD,
} from '../../constants/adaptiveRuntimeGovernance';

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function classifyPhase(score: number): DriftPhase {
  if (score >= DRIFT_CRITICAL_THRESHOLD) return 'DRIFT_CRITICAL';
  if (score >= DRIFT_FRAGMENTING_THRESHOLD) return 'DRIFT_FRAGMENTING';
  if (score >= DRIFT_WARNING_THRESHOLD) return 'DRIFT_WARNING';
  return 'DRIFT_STABLE';
}

export function computeDriftMetrics(
  store: AdaptiveRuntimeLearningState,
  input: GovernanceRunInput,
  previousDriftScore?: number,
): DriftMetrics {
  const edges = Object.values(store.edges);
  const unstable = edges.filter((e) => e.falsePositiveCount >= 2 && !e.protectedInvariant);
  const fpRate =
    edges.length === 0
      ? 0
      : edges.reduce((s, e) => s + e.falsePositiveCount, 0) / edges.reduce((s, e) => s + e.hitCount, 1);

  const weightVolatility =
    edges.length === 0
      ? 0
      : edges.reduce((s, e) => s + Math.abs(e.runtimeLearnedWeight - e.confidenceEma), 0) / edges.length;

  const replayDivergence =
    store.replayCount < 2
      ? 0
      : clamp01(
          (input.previousRootKind && input.rootKind && input.previousRootKind !== input.rootKind ? 0.6 : 0.1) +
            fpRate * 0.4,
        );

  const causalInconsistency = clamp01(
    unstable.length / Math.max(1, edges.length) + (input.graph.edges.filter((e) => e.edgeStability === 'unstable').length > 3 ? 0.3 : 0),
  );

  const staleCount = edges.filter(
    (e) => e.hitCount > 0 && e.successfulPredictionCount / e.hitCount < 0.25 && !e.protectedInvariant,
  ).length;
  const staleOptimizationPersistence = clamp01(staleCount / Math.max(1, edges.length));

  const optimizationInstability = clamp01(weightVolatility * 0.5 + fpRate * 0.5);

  const driftScore = clamp01(
    optimizationInstability * 0.25 +
      causalInconsistency * 0.2 +
      replayDivergence * 0.2 +
      weightVolatility * 0.15 +
      staleOptimizationPersistence * 0.2,
  );

  const driftVelocity = clamp01(
    previousDriftScore != null ? Math.abs(driftScore - previousDriftScore) : driftScore * 0.5,
  );

  const adaptiveVolatility = clamp01(weightVolatility + driftVelocity * 0.5);

  return {
    driftVelocity,
    optimizationInstability,
    causalInconsistency,
    replayDivergence,
    adaptiveVolatility,
    staleOptimizationPersistence,
    driftScore,
    phase: classifyPhase(driftScore),
  };
}
