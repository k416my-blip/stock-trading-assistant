import type { DashboardRenderProfilerSnapshot } from '../../types/nativeDeviceTelemetry';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { NativeTelemetrySamplingMode } from '../../types/nativeDeviceTelemetry';

let lastDashboardSampleAt = 0;

export function resetDashboardRenderProfilerForTest(): void {
  lastDashboardSampleAt = 0;
}

export function observeDashboardRender(
  metrics: RuntimeTelemetryMetricsSnapshot,
  samplingMode: NativeTelemetrySamplingMode,
): DashboardRenderProfilerSnapshot {
  const now = Date.now();
  const throttled = samplingMode !== 'full' && now - lastDashboardSampleAt < 5_000;
  if (!throttled) lastDashboardSampleAt = now;
  return {
    dashboardCommitMs: metrics.render.dashboardCommitDurationMs,
    fps: metrics.renderFPS,
    samplingThrottled: throttled,
  };
}
