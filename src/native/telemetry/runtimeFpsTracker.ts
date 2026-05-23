import type { RuntimeFpsSnapshot } from '../../types/nativeDeviceTelemetry';
import { TELEMETRY_DEGRADED_FPS_MIN, TELEMETRY_OK_FPS_MIN } from '../../constants/runtimeTelemetry';

export function observeRuntimeFps(fps: number, droppedFrames: number): RuntimeFpsSnapshot {
  return {
    fps,
    droppedFrames,
    stable: fps >= TELEMETRY_OK_FPS_MIN || fps >= TELEMETRY_DEGRADED_FPS_MIN,
  };
}
