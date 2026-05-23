import type { RenderStormSnapshot } from '../../types/nativeDeviceTelemetry';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import { NATIVE_TELEMETRY_RENDER_STORM_BURST } from '../../constants/nativeDeviceTelemetry';

let renderWindow: number[] = [];

export function resetRenderStormDetectorForTest(): void {
  renderWindow = [];
}

export function observeRenderStorm(metrics: RuntimeTelemetryMetricsSnapshot): RenderStormSnapshot {
  const burst = metrics.render.renderBurstRate;
  renderWindow.push(burst);
  if (renderWindow.length > 10) renderWindow.shift();
  const avgBurst = renderWindow.reduce((s, v) => s + v, 0) / Math.max(1, renderWindow.length);
  const renderCountPerSec = Math.round(avgBurst * metrics.renderFPS * 0.1);
  return {
    renderCountPerSec,
    renderBurstRate: burst,
    renderStormDetected: burst >= NATIVE_TELEMETRY_RENDER_STORM_BURST || metrics.render.renderSpikeDetected,
    excessiveRerenderDetected: metrics.render.excessiveRerenderDetected,
  };
}
