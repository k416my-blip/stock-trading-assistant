import { JS_GC_COOLDOWN_MS, JS_GC_SPIKE_HEAP_DROP_MB } from '../../constants/jsThreadSchedulerStabilization';

let lastHeap = 0;
let lastGcAt = 0;
let lastSpikeMs = 0;

export function resetGcSpikeDetectorForTest(): void {
  lastHeap = 0;
  lastGcAt = 0;
  lastSpikeMs = 0;
}

export function observeGcSpike(jsHeapMb: number, now = Date.now()): number {
  if (lastHeap > 0 && lastHeap - jsHeapMb >= JS_GC_SPIKE_HEAP_DROP_MB) {
    if (now - lastGcAt >= JS_GC_COOLDOWN_MS) {
      lastSpikeMs = lastHeap - jsHeapMb;
      lastGcAt = now;
    }
  }
  lastHeap = jsHeapMb;
  return lastSpikeMs;
}
