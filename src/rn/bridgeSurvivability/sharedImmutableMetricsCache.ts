import { RN_IMMUTABLE_CACHE_MAX } from '../../constants/rnBridgeSurvivability';

const cache = new Map<string, Readonly<Record<string, unknown>>>();
let hits = 0;
let misses = 0;

export function resetSharedImmutableMetricsCacheForTest(): void {
  cache.clear();
  hits = 0;
  misses = 0;
}

export function getImmutableMetrics(key: string, factory: () => Record<string, unknown>): Readonly<Record<string, unknown>> {
  const hit = cache.get(key);
  if (hit) {
    hits += 1;
    return hit;
  }
  misses += 1;
  const snap = Object.freeze({ ...factory() });
  if (cache.size >= RN_IMMUTABLE_CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, snap);
  return snap;
}

export function immutableReuseRatio(): number {
  const total = hits + misses;
  if (total === 0) return 1;
  return Math.round((hits / total) * 1000) / 1000;
}
