import {
  DASHBOARD_MAX_FPS_COMPACT,
  DASHBOARD_MAX_FPS_STABLE,
  FRAME_COALESCE_MS,
} from '../constants/asyncRuntimeCoordinator';

let lastFrameEmitAt = 0;
let coalescedPending = false;
let coalesceCallback: (() => void) | null = null;
let compactMode = false;
let fpsCapOverride: number | null = null;
let metricsSamplingOverride: number | null = null;

export function resetDashboardFrameStabilizerForTest(): void {
  lastFrameEmitAt = 0;
  coalescedPending = false;
  coalesceCallback = null;
  compactMode = false;
  fpsCapOverride = null;
  metricsSamplingOverride = null;
}

export function setDashboardFpsCap(cap: number | null): void {
  fpsCapOverride = cap == null ? null : Math.max(4, Math.min(60, cap));
}

export function setMetricsSamplingRate(rate: number): void {
  metricsSamplingOverride = Math.max(0.1, Math.min(1, rate));
}

export function setDashboardCompactMode(enabled: boolean): void {
  compactMode = enabled;
}

export function getDashboardMaxFps(): number {
  if (fpsCapOverride != null) return fpsCapOverride;
  return compactMode ? DASHBOARD_MAX_FPS_COMPACT : DASHBOARD_MAX_FPS_STABLE;
}

export function shouldEmitDashboardFrame(): boolean {
  const minInterval = 1000 / getDashboardMaxFps();
  const now = Date.now();
  if (now - lastFrameEmitAt < minInterval) return false;
  lastFrameEmitAt = now;
  return true;
}

/** Coalesce rapid dashboard invalidations into one frame. */
export function scheduleDashboardFrameUpdate(fn: () => void): void {
  coalesceCallback = fn;
  if (coalescedPending) return;
  coalescedPending = true;
  setTimeout(() => {
    coalescedPending = false;
    if (shouldEmitDashboardFrame()) {
      coalesceCallback?.();
    }
    coalesceCallback = null;
  }, FRAME_COALESCE_MS);
}

export function getMetricsSamplingRate(): number {
  if (metricsSamplingOverride != null) return metricsSamplingOverride;
  return compactMode ? 0.35 : 1;
}
