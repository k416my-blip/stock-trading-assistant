/**
 * Cognitive Garbage Collector — compress/isolate stale cognitive state.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { getExplanationCacheSize } from '../../services/explanationStormGuard';
import { appendGcAudit } from './metabolismStorage';

export function collectCognitiveGarbage(
  store: AdaptiveRuntimeLearningState,
  lightOnly: boolean,
): { compressed: number } {
  let compressed = 0;

  for (const [key, hist] of Object.entries(store.gapHistograms)) {
    if (hist.length > (lightOnly ? 32 : 16)) {
      store.gapHistograms[key] = hist.slice(lightOnly ? -32 : -16);
      compressed += 1;
      appendGcAudit('cognitive_gc_histogram', key, 'decayed', 'gap histogram compressed');
    }
  }

  const cacheSize = getExplanationCacheSize();
  if (cacheSize > (lightOnly ? 12 : 6)) {
    appendGcAudit('cognitive_gc_explanation', 'explanation_cache', 'decayed', `cache pressure ${cacheSize}`);
    compressed += 1;
  }

  if (!lightOnly) {
    for (const [key, tr] of Object.entries(store.transitions)) {
      if (tr.hitCount < 2) {
        tr.learnedProbability *= 0.8;
        compressed += 1;
      }
    }
  }

  return { compressed };
}
