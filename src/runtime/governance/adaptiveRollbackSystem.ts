/**
 * Adaptive rollback — snapshots and safe baseline restore.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import type { EdgeReliabilityScore } from '../../types/adaptiveRuntimeGovernance';
import type { RollbackSnapshot } from '../../types/adaptiveRuntimeGovernance';
import { createAdaptiveLearningState } from '../analysis/adaptiveRuntimeLearningStorage';

let snapshots: RollbackSnapshot[] = [];
let baselineStore: AdaptiveRuntimeLearningState | null = null;
let snapshotSeq = 0;

export function resetRollbackSystemForTest(): void {
  snapshots = [];
  baselineStore = null;
  snapshotSeq = 0;
}

export function ensureBaselineSnapshot(deviceProfile: AdaptiveRuntimeLearningState['deviceProfile']): void {
  if (!baselineStore) {
    baselineStore = createAdaptiveLearningState(deviceProfile);
    snapshots.push({
      id: 'baseline',
      createdAt: new Date().toISOString(),
      reason: 'safe_baseline',
      edgeCount: 0,
      isBaseline: true,
    });
  }
}

export function createRollbackSnapshot(store: AdaptiveRuntimeLearningState, reason: string): RollbackSnapshot {
  snapshotSeq += 1;
  const snap: RollbackSnapshot = {
    id: `snap-${snapshotSeq}`,
    createdAt: new Date().toISOString(),
    reason,
    edgeCount: Object.keys(store.edges).length,
    isBaseline: false,
  };
  snapshots.push(snap);
  if (snapshots.length > 12) snapshots.shift();
  return snap;
}

export function identifyRollbackCandidates(
  reliability: Record<string, EdgeReliabilityScore>,
): string[] {
  return Object.values(reliability)
    .filter((r) => r.rollbackCandidate)
    .map((r) => r.edgeKey);
}

export function applyRollback(
  store: AdaptiveRuntimeLearningState,
  reliability: Record<string, EdgeReliabilityScore>,
  driftCritical: boolean,
): { rolledBack: number; restoredBaseline: boolean } {
  ensureBaselineSnapshot(store.deviceProfile);
  let rolledBack = 0;

  for (const [key, rel] of Object.entries(reliability)) {
    const rec = store.edges[key];
    if (!rec || rec.protectedInvariant) continue;
    if (!rel.rollbackCandidate && !driftCritical) continue;
    delete store.edges[key];
    rolledBack += 1;
  }

  if (driftCritical && baselineStore) {
    store.edges = { ...baselineStore.edges };
    store.transitions = { ...baselineStore.transitions };
    return { rolledBack, restoredBaseline: true };
  }

  if (rolledBack > 0) {
    createRollbackSnapshot(store, 'unstable_learned_edges');
  }

  return { rolledBack, restoredBaseline: false };
}

export function getRollbackSnapshots(): RollbackSnapshot[] {
  return [...snapshots];
}

export function getRollbackFrequency(): number {
  return snapshots.filter((s) => !s.isBaseline).length;
}
