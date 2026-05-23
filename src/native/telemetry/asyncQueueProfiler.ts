import type { AsyncQueueProfilerSnapshot } from '../../types/nativeDeviceTelemetry';
import { NATIVE_TELEMETRY_ASYNC_SATURATION_DEPTH } from '../../constants/nativeDeviceTelemetry';

export function observeAsyncQueue(depth: number, latencyMs: number): AsyncQueueProfilerSnapshot {
  return {
    depth,
    latencyMs,
    saturationPct: Math.min(100, Math.round((depth / NATIVE_TELEMETRY_ASYNC_SATURATION_DEPTH) * 100)),
  };
}
