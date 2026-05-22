import type { LayerRuntimeMode, MobileRuntimeMetricsSnapshot } from '../types/layerRuntimeScheduler';

type MetricsState = {
  refreshTimestamps: number[];
  reconnectCount: number;
  lastForegroundAt: number | null;
  lastBackgroundAt: number | null;
  lastResumeRecoveryMs: number | null;
  lastRefreshDurationMs: number;
};

const state: MetricsState = {
  refreshTimestamps: [],
  reconnectCount: 0,
  lastForegroundAt: Date.now(),
  lastBackgroundAt: null,
  lastResumeRecoveryMs: null,
  lastRefreshDurationMs: 0,
};

let lastFrameAt = Date.now();
let frameCount = 0;
let fpsEstimate = 60;

export function resetMobileRuntimeMetricsForTest(): void {
  state.refreshTimestamps = [];
  state.reconnectCount = 0;
  state.lastForegroundAt = Date.now();
  state.lastBackgroundAt = null;
  state.lastResumeRecoveryMs = null;
  state.lastRefreshDurationMs = 0;
  lastFrameAt = Date.now();
  frameCount = 0;
  fpsEstimate = 60;
}

/** Lightweight FPS estimate from refresh cadence (no native module). */
export function tickMobileRuntimeFrame(): void {
  frameCount += 1;
  const now = Date.now();
  if (now - lastFrameAt >= 1000) {
    fpsEstimate = Math.min(60, frameCount);
    frameCount = 0;
    lastFrameAt = now;
  }
}

export function noteProactiveRefreshForMetrics(durationMs: number): void {
  const now = Date.now();
  state.refreshTimestamps.push(now);
  state.refreshTimestamps = state.refreshTimestamps.filter((t) => now - t < 60_000);
  state.lastRefreshDurationMs = durationMs;
  tickMobileRuntimeFrame();
  void import('./crossLayerCascadeEngine').then(({ noteCascadeDashboardRender }) => {
    noteCascadeDashboardRender();
  });
}

export function noteWebsocketReconnect(): void {
  state.reconnectCount += 1;
}

export function noteAppBackgrounded(): void {
  state.lastBackgroundAt = Date.now();
}

export function noteAppForegroundResume(): number | null {
  if (state.lastBackgroundAt == null) return null;
  const ms = Date.now() - state.lastBackgroundAt;
  state.lastResumeRecoveryMs = ms;
  state.lastForegroundAt = Date.now();
  state.lastBackgroundAt = null;
  return ms;
}

function renderBurstRatePerMinute(): number {
  const now = Date.now();
  const recent = state.refreshTimestamps.filter((t) => now - t < 60_000);
  return recent.length;
}

export function buildMobileRuntimeMetricsSnapshot(
  mode: LayerRuntimeMode,
  input: {
    memoryPressure: boolean;
    queueSize: number;
    thermalPressurePct: number;
    jsPressureBoost?: number;
  },
): MobileRuntimeMetricsSnapshot {
  const refreshBurst = renderBurstRatePerMinute();
  const jsThreadPressurePct = Math.min(
    100,
    Math.round(
      (input.jsPressureBoost ?? 0) +
        state.lastRefreshDurationMs / 80 +
        refreshBurst * 4 +
        (input.memoryPressure ? 25 : 0),
    ),
  );
  const estimatedMemoryPressurePct = Math.min(
    100,
    Math.round(input.queueSize * 0.7 + (input.memoryPressure ? 35 : 0) + refreshBurst * 2),
  );

  return {
    runtimeFPS: fpsEstimate,
    jsThreadPressurePct,
    estimatedMemoryPressurePct,
    renderBurstRate: refreshBurst,
    websocketReconnectRate: Math.min(100, state.reconnectCount * 8),
    backgroundResumeRecoveryMs: state.lastResumeRecoveryMs,
    schedulerMode: mode,
    measuredAt: new Date().toISOString(),
  };
}
