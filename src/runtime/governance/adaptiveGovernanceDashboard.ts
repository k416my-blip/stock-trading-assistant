/**
 * Adaptive governance dashboard aggregation.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import type {
  AdaptiveGovernanceDashboard,
  AdaptiveGovernanceState,
  CausalContradiction,
  DriftMetrics,
} from '../../types/adaptiveRuntimeGovernance';
import type { EdgeReliabilityScore } from '../../types/adaptiveRuntimeGovernance';

export function buildAdaptiveGovernanceDashboard(
  store: AdaptiveRuntimeLearningState,
  governance: AdaptiveGovernanceState,
  reliability: Record<string, EdgeReliabilityScore>,
  contradictions: CausalContradiction[],
  drift: DriftMetrics,
): AdaptiveGovernanceDashboard {
  const composites = Object.values(reliability).map((r) => r.composite);
  const adaptiveReliability =
    composites.length === 0
      ? 0.5
      : composites.reduce((a, b) => a + b, 0) / composites.length;

  return {
    driftScore: drift.driftScore,
    driftPhase: drift.phase,
    unstableLearnedEdges: Object.values(store.edges).filter(
      (e) => e.falsePositiveCount >= 2 && !e.protectedInvariant,
    ),
    rollbackCandidates: Object.values(reliability)
      .filter((r) => r.rollbackCandidate)
      .map((r) => r.edgeKey),
    replayDivergence: drift.replayDivergence,
    adaptiveReliability: Math.round(adaptiveReliability * 1000) / 1000,
    crossDeviceContaminationRisk: governance.crossDeviceContaminationRisk,
    staleOptimizationCount: governance.staleOptimizationCount,
    contradictions,
    rollbackSnapshotCount: governance.rollbackSnapshots.length,
  };
}

export function formatGovernanceDashboardMarkdown(dashboard: AdaptiveGovernanceDashboard): string {
  return [
    '# Adaptive Governance Dashboard',
    '',
    `**Drift:** ${dashboard.driftPhase} (${Math.round(dashboard.driftScore * 100)}%)`,
    `**Adaptive reliability:** ${Math.round(dashboard.adaptiveReliability * 100)}%`,
    `**Replay divergence:** ${Math.round(dashboard.replayDivergence * 100)}%`,
    `**Cross-device contamination risk:** ${Math.round(dashboard.crossDeviceContaminationRisk * 100)}%`,
    `**Stale optimizations:** ${dashboard.staleOptimizationCount}`,
    `**Rollback candidates:** ${dashboard.rollbackCandidates.length}`,
    `**Unstable edges:** ${dashboard.unstableLearnedEdges.length}`,
    `**Contradictions:** ${dashboard.contradictions.length}`,
    `**Rollback snapshots:** ${dashboard.rollbackSnapshotCount}`,
  ].join('\n');
}
