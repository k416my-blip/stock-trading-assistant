const renderSamples: number[] = [];
const apiSamples: number[] = [];
const sessionStartMs = Date.now();

export function recordRenderDurationMs(ms: number): void {
  renderSamples.push(ms);
  if (renderSamples.length > 40) renderSamples.shift();
}

export function recordApiLatencyMs(ms: number): void {
  apiSamples.push(ms);
  if (apiSamples.length > 60) apiSamples.shift();
}

function avg(samples: number[]): number | null {
  if (samples.length === 0) return null;
  return Math.round((samples.reduce((a, b) => a + b, 0) / samples.length) * 10) / 10;
}

export function getProfilerMetrics(): {
  lastRenderMs: number | null;
  avgRenderMs: number | null;
  lastApiLatencyMs: number | null;
  avgApiLatencyMs: number | null;
  estimatedHeapMB: number | null;
  sessionUptimeMinutes: number;
} {
  const uptimeMin = Math.round((Date.now() - sessionStartMs) / 60_000);
  let heap: number | null = null;
  try {
    const perf = globalThis.performance as { memory?: { usedJSHeapSize?: number } } | undefined;
    if (perf?.memory?.usedJSHeapSize) {
      heap = Math.round((perf.memory.usedJSHeapSize / 1024 / 1024) * 10) / 10;
    }
  } catch {
    heap = null;
  }
  return {
    lastRenderMs: renderSamples.length ? renderSamples[renderSamples.length - 1] : null,
    avgRenderMs: avg(renderSamples),
    lastApiLatencyMs: apiSamples.length ? apiSamples[apiSamples.length - 1] : null,
    avgApiLatencyMs: avg(apiSamples),
    estimatedHeapMB: heap,
    sessionUptimeMinutes: uptimeMin,
  };
}

export function resetProfilerForTest(): void {
  renderSamples.length = 0;
  apiSamples.length = 0;
}
