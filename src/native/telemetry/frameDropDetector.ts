import type { FrameDropSnapshot } from '../../types/nativeDeviceTelemetry';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import { getLastNativeRuntimeSnapshot } from '../runtime/nativeRuntimeBridge';

let droppedTotal = 0;

export function resetFrameDropDetectorForTest(): void {
  droppedTotal = 0;
}

export function observeFrameDrop(metrics: RuntimeTelemetryMetricsSnapshot): FrameDropSnapshot {
  const nativeEst = getLastNativeRuntimeSnapshot()?.droppedFramesEstimate ?? 0;
  const frameDrops = Math.max(metrics.droppedFrames, nativeEst);
  droppedTotal = Math.max(droppedTotal, frameDrops);
  return {
    droppedFramesTotal: droppedTotal,
    frameDropRate: metrics.render.frameDropRate,
    nativeDroppedEstimate: nativeEst,
  };
}
