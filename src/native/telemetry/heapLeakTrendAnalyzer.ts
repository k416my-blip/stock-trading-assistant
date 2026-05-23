import type { HeapLeakTrendSnapshot } from '../../types/nativeDeviceTelemetry';
import { NATIVE_TELEMETRY_HEAP_LEAK_SAMPLES } from '../../constants/nativeDeviceTelemetry';

const heapSamples: number[] = [];

export function resetHeapLeakTrendAnalyzerForTest(): void {
  heapSamples.length = 0;
}

export function observeHeapLeakTrend(jsHeapMb: number, memoryTrendPct: number): HeapLeakTrendSnapshot {
  heapSamples.push(jsHeapMb);
  if (heapSamples.length > NATIVE_TELEMETRY_HEAP_LEAK_SAMPLES) heapSamples.shift();
  const first = heapSamples[0] ?? jsHeapMb;
  const last = heapSamples.at(-1) ?? jsHeapMb;
  const trendPct =
    heapSamples.length >= 3
      ? Math.round(((last - first) / Math.max(1, first)) * 100)
      : memoryTrendPct;
  return {
    trendPct,
    leakSuspected: trendPct > 35 && heapSamples.length >= 8,
    samples: heapSamples.length,
  };
}
