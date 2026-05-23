/**
 * Memory reclamation — caches, snapshots, journal, reconnect history, adaptive edges.
 */
import type { MemoryReclamationResult } from '../../types/runtimeSelfHealing';
import { JOURNAL_COMPACT_TARGET, JOURNAL_COMPACT_THRESHOLD, SNAPSHOT_THIN_KEEP } from '../../constants/runtimeSelfHealing';
import { getJournalStats, compactRuntimeJournal } from '../observability/runtimeEventJournal';
import { thinRuntimeSnapshots } from '../observability/runtimeSnapshotSystem';
import { getAdaptiveLearningStore } from '../analysis/adaptiveRuntimeLearningStorage';
import { isProtectedEdge } from '../../constants/adaptiveRuntimeLearning';
import { applyLongTermDecayGovernance } from '../governance/longTermDecayGovernance';
import { trimReconnectSequenceTrace } from '../stability/reconnectSequenceTrace';

let lastReclaimAt = 0;
let totalReclaimedBytes = 0;

export function resetMemoryReclamationForTest(): void {
  lastReclaimAt = 0;
  totalReclaimedBytes = 0;
}

export function runMemoryReclamation(opts?: {
  force?: boolean;
  nowMs?: number;
}): MemoryReclamationResult {
  const now = opts?.nowMs ?? Date.now();
  const journalBefore = getJournalStats();
  let journalCompacted = 0;
  if (opts?.force || journalBefore.count >= JOURNAL_COMPACT_THRESHOLD) {
    journalCompacted = compactRuntimeJournal(JOURNAL_COMPACT_TARGET);
  }

  const snapshotsThinned = thinRuntimeSnapshots(SNAPSHOT_THIN_KEEP);

  let reconnectHistoryTrimmed = 0;
  if (opts?.force) {
    reconnectHistoryTrimmed = trimReconnectSequenceTrace(16);
  }

  const store = getAdaptiveLearningStore();
  const edgesBefore = Object.keys(store.edges).length;
  const decay = applyLongTermDecayGovernance(store, now);
  let adaptiveEdgesPruned = decay.pruned30d + decay.transitionsPruned;

  for (const [key, rec] of Object.entries(store.edges)) {
    if (rec.protectedInvariant) continue;
    if (
      isProtectedEdge(String(rec.from), String(rec.to), rec.relation) &&
      rec.runtimeLearnedWeight >= 0.55
    ) {
      continue;
    }
    if (rec.hitCount < 2 && rec.runtimeLearnedWeight < 0.25 && !rec.protectedInvariant) {
      delete store.edges[key];
      adaptiveEdgesPruned += 1;
    }
  }

  const edgesAfter = Object.keys(store.edges).length;
  const graphCompactionRatio =
    edgesBefore === 0 ? 1 : Math.round((1 - edgesAfter / edgesBefore) * 1000) / 1000;

  const reclaimedBytesEstimate =
    journalCompacted * 64 + snapshotsThinned * 512 + adaptiveEdgesPruned * 128;
  totalReclaimedBytes += reclaimedBytesEstimate;
  lastReclaimAt = now;

  return {
    reclaimedBytesEstimate,
    staleCachesPurged: decay.histogramsCompressed,
    snapshotsThinned,
    journalCompacted,
    reconnectHistoryTrimmed,
    adaptiveEdgesPruned,
    graphCompactionRatio,
  };
}

export function getTotalReclaimedBytes(): number {
  return totalReclaimedBytes;
}

export function getLastReclaimAt(): number {
  return lastReclaimAt;
}
