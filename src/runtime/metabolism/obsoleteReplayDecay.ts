/**
 * Obsolete Replay Decay — time-weight decay without physical delete.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { replayRelevance } from './memoryRelevanceHalfLife';
import { archiveReplay } from './metabolismStorage';

export function decayObsoleteReplays(
  store: AdaptiveRuntimeLearningState,
  nowMs = Date.now(),
  tombstoneOnly = false,
): { decayed: number; archived: number } {
  const lastUpdated = Date.parse(store.lastUpdatedAt);
  const ageMs = Math.max(0, nowMs - lastUpdated);
  const rel = replayRelevance(ageMs);

  let decayed = 0;
  let archived = 0;

  if (store.replayCount > 0 && rel < 0.35) {
    const obsoleteCount = Math.floor(store.replayCount * (1 - rel));
    if (!tombstoneOnly) {
      store.replayCount = Math.max(0, store.replayCount - obsoleteCount);
    }
    for (let i = 0; i < obsoleteCount; i += 1) {
      archiveReplay(store.replayCount + i, rel, 'obsolete replay decay');
      archived += 1;
    }
    decayed = obsoleteCount;
  }

  for (const rec of Object.values(store.edges)) {
    if (rec.replaySupport > 0 && rel < 0.4) {
      rec.replaySupport = Math.round(rec.replaySupport * rel * 100) / 100;
      decayed += 1;
    }
  }

  return { decayed, archived };
}
