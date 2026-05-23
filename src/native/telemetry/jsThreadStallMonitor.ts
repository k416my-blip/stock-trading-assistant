import type { JsThreadStallSnapshot } from '../../types/nativeDeviceTelemetry';
import { observeAnrRisk } from '../runtime/anrPreventionLayer';
import { NATIVE_TELEMETRY_JS_STALL_WARN_MS } from '../../constants/nativeDeviceTelemetry';

export function observeJsThreadStall(eventLoopLagMs: number): JsThreadStallSnapshot {
  const anr = observeAnrRisk();
  const stallMs = Math.max(anr.eventLoopStallMs, eventLoopLagMs);
  return {
    stallMs,
    eventLoopLagMs,
    longSyncDetected: anr.longSyncTaskDetected || stallMs >= NATIVE_TELEMETRY_JS_STALL_WARN_MS,
  };
}
