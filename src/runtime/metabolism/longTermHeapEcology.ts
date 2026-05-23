/**
 * Long-Term Heap Ecology — session heap growth / fragmentation signals.
 */
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import { SESSION_GC_MINUTES } from '../../constants/runtimeMetabolism';

const heapSamples: { atMs: number; mb: number }[] = [];

export function resetHeapEcologyForTest(): void {
  heapSamples.length = 0;
}

export function recordHeapEcologySample(metrics: RuntimeTelemetryMetricsSnapshot): void {
  heapSamples.push({ atMs: Date.now(), mb: metrics.jsHeapEstimateMb });
  if (heapSamples.length > 96) heapSamples.shift();
}

export function computeHeapEcologyScore(sessionMinutes: number): number {
  if (heapSamples.length < 2) return 0.85;

  const first = heapSamples[0].mb;
  const last = heapSamples.at(-1)!.mb;
  const growthPct = first > 0 ? ((last - first) / first) * 100 : 0;

  let sessionPenalty = 0;
  for (const window of SESSION_GC_MINUTES) {
    if (sessionMinutes >= window) sessionPenalty += 0.05;
  }

  const score = Math.max(0, 1 - growthPct / 80 - sessionPenalty);
  return Math.round(score * 1000) / 1000;
}
