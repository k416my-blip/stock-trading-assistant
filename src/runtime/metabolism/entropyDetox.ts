/**
 * Entropy Detox — reduce low-quality duplicate/contradictory density.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { appendGcAudit } from './metabolismStorage';

export function runEntropyDetox(store: AdaptiveRuntimeLearningState): { detoxScore: number; pruned: number } {
  let pruned = 0;
  const seen = new Set<string>();

  for (const [key, rec] of Object.entries(store.edges)) {
    const sig = `${rec.from}:${rec.to}:${rec.relation}`;
    if (seen.has(sig) && rec.runtimeLearnedWeight < 0.35) {
      rec.runtimeLearnedWeight *= 0.7;
      rec.confidenceEma *= 0.85;
      pruned += 1;
      appendGcAudit('entropy_detox_dup', key, 'decayed', 'duplicate edge density reduced');
    }
    seen.add(sig);
  }

  if (store.falsePositives.length > 12) {
    const removed = store.falsePositives.length - 12;
    store.falsePositives = store.falsePositives.slice(-12);
    pruned += removed;
    appendGcAudit('entropy_detox_fp', 'falsePositives', 'decayed', `trimmed ${removed} low-quality fp`);
  }

  const detoxScore = Math.max(0, 1 - pruned / Math.max(1, Object.keys(store.edges).length + 1));
  return { detoxScore: Math.round(detoxScore * 1000) / 1000, pruned };
}
