/**
 * Learning reliability scoring per edge.
 */
import type { AdaptiveRuntimeLearningState, DeviceProfileKind, EdgeLearningRecord } from '../../types/adaptiveRuntimeLearning';
import type { EdgeReliabilityScore } from '../../types/adaptiveRuntimeGovernance';
import { RELIABILITY_REPLAY_SUPPRESS_THRESHOLD, RELIABILITY_ROLLBACK_THRESHOLD } from '../../constants/adaptiveRuntimeGovernance';

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function scoreEdgeReliability(
  rec: EdgeLearningRecord,
  store: AdaptiveRuntimeLearningState,
  deviceProfile: DeviceProfileKind,
): EdgeReliabilityScore {
  const hit = Math.max(1, rec.hitCount);
  const successRate = rec.successfulPredictionCount / hit;
  const confidence = clamp01(rec.confidenceEma);
  const stability = clamp01(rec.stability);
  const reproducibility = clamp01(successRate * (1 - rec.falsePositiveCount / hit));
  const crossSessionConsistency = clamp01(
    (store.rootRankingHistory[String(rec.from)]?.successCount ?? 1) /
      Math.max(1, store.rootRankingHistory[String(rec.from)]?.count ?? 1),
  );
  const scoped = (rec as EdgeLearningRecord & { deviceScope?: DeviceProfileKind }).deviceScope;
  const crossDeviceConsistency = scoped == null || scoped === deviceProfile ? 1 : 0.35;

  const composite = clamp01(
    confidence * 0.25 +
      stability * 0.2 +
      reproducibility * 0.25 +
      crossSessionConsistency * 0.15 +
      crossDeviceConsistency * 0.15,
  );

  return {
    edgeKey: rec.edgeKey,
    confidence,
    stability,
    reproducibility,
    crossSessionConsistency,
    crossDeviceConsistency,
    composite,
    rollbackCandidate: composite < RELIABILITY_ROLLBACK_THRESHOLD && !rec.protectedInvariant,
    replaySuppressed: composite < RELIABILITY_REPLAY_SUPPRESS_THRESHOLD && !rec.protectedInvariant,
  };
}

export function scoreAllEdgeReliability(
  store: AdaptiveRuntimeLearningState,
  deviceProfile: DeviceProfileKind,
): Record<string, EdgeReliabilityScore> {
  const out: Record<string, EdgeReliabilityScore> = {};
  for (const rec of Object.values(store.edges)) {
    out[rec.edgeKey] = scoreEdgeReliability(rec, store, deviceProfile);
  }
  return out;
}

export function applyLowReliabilityDecay(
  store: AdaptiveRuntimeLearningState,
  reliability: Record<string, EdgeReliabilityScore>,
): number {
  let decayed = 0;
  for (const [key, rel] of Object.entries(reliability)) {
    const rec = store.edges[key];
    if (!rec || rec.protectedInvariant) continue;
    if (rel.composite < RELIABILITY_REPLAY_SUPPRESS_THRESHOLD) {
      rec.runtimeLearnedWeight = clamp01(rec.runtimeLearnedWeight * 0.85);
      decayed += 1;
    }
    if (rel.replaySuppressed) {
      rec.replaySupport = clamp01(rec.replaySupport * 0.5);
    }
  }
  return decayed;
}
