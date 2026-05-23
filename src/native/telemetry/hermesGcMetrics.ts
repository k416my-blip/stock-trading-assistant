import type { HermesGcMetricsSnapshot } from '../../types/nativeDeviceTelemetry';
import { NATIVE_TELEMETRY_GC_HEAP_DROP_MB } from '../../constants/nativeDeviceTelemetry';

let lastHeapMb = 0;
let lastSampleAt = 0;
let gcEvents = 0;

export function resetHermesGcMetricsForTest(): void {
  lastHeapMb = 0;
  lastSampleAt = 0;
  gcEvents = 0;
}

export function observeHermesGcMetrics(jsHeapMb: number): HermesGcMetricsSnapshot {
  const now = Date.now();
  let heapDropMbLastSample = 0;
  if (lastSampleAt > 0 && lastHeapMb - jsHeapMb >= NATIVE_TELEMETRY_GC_HEAP_DROP_MB) {
    gcEvents += 1;
    heapDropMbLastSample = lastHeapMb - jsHeapMb;
  }
  const elapsedSec = lastSampleAt > 0 ? Math.max(0.5, (now - lastSampleAt) / 1000) : 1;
  const gcEventsPerSec = gcEvents / elapsedSec;
  lastHeapMb = jsHeapMb;
  lastSampleAt = now;
  gcEvents = 0;
  return {
    gcEventsPerSec: Math.round(gcEventsPerSec * 100) / 100,
    heapDropMbLastSample: Math.round(heapDropMbLastSample * 10) / 10,
    source: 'heuristic',
  };
}
