import type { RenderPerformanceSnapshot } from '../types/runtimeTelemetry';

type RenderObsState = {
  frameSamples: number[];
  dropStreak: number;
  commitDurations: number[];
  rerenderBursts: number[];
  lastBurstAt: number;
};

const state: RenderObsState = {
  frameSamples: [],
  dropStreak: 0,
  commitDurations: [],
  rerenderBursts: [],
  lastBurstAt: 0,
};

export function resetRenderPerformanceObserverForTest(): void {
  state.frameSamples = [];
  state.dropStreak = 0;
  state.commitDurations = [];
  state.rerenderBursts = [];
  state.lastBurstAt = 0;
}

export function noteRenderFrame(fps: number, dropped = false): void {
  state.frameSamples.push(fps);
  if (state.frameSamples.length > 120) state.frameSamples.shift();
  if (dropped) {
    state.dropStreak += 1;
  } else {
    state.dropStreak = Math.max(0, state.dropStreak - 1);
  }
}

export function noteDashboardCommitDuration(ms: number): void {
  state.commitDurations.push(ms);
  if (state.commitDurations.length > 40) state.commitDurations.shift();
}

export function noteSubtreeRerenderBurst(count = 1): void {
  const now = Date.now();
  if (now - state.lastBurstAt < 800) {
    state.rerenderBursts.push(count);
  } else {
    state.rerenderBursts = [count];
  }
  state.lastBurstAt = now;
  if (state.rerenderBursts.length > 30) state.rerenderBursts.shift();
}

export function observeRenderPerformance(input: {
  runtimeFPS: number;
  renderBurstRate: number;
  jsThreadPressurePct: number;
  refreshDurationMs?: number;
}): RenderPerformanceSnapshot {
  const fps = input.runtimeFPS;
  noteRenderFrame(fps, fps < 12);
  if (input.refreshDurationMs != null) {
    noteDashboardCommitDuration(input.refreshDurationMs);
  }

  const avgFps =
    state.frameSamples.length > 0
      ? state.frameSamples.reduce((a, b) => a + b, 0) / state.frameSamples.length
      : fps;
  const frameDropRate = Math.min(
    100,
    Math.round((state.dropStreak / Math.max(1, state.frameSamples.length)) * 100 + (fps < 15 ? 12 : 0)),
  );
  const avgCommit =
    state.commitDurations.length > 0
      ? state.commitDurations.reduce((a, b) => a + b, 0) / state.commitDurations.length
      : input.refreshDurationMs ?? 0;
  const burstSum = state.rerenderBursts.reduce((a, b) => a + b, 0);

  return {
    renderFPS: Math.round(avgFps),
    frameDropRate,
    renderBurstRate: input.renderBurstRate,
    dashboardCommitDurationMs: Math.round(avgCommit),
    reactTransitionPressurePct: Math.min(100, input.jsThreadPressurePct + burstSum * 3),
    renderSpikeDetected: fps < 10 || avgCommit > 220,
    subtreeHotReloadDetected: burstSum >= 6 && Date.now() - state.lastBurstAt < 2000,
    excessiveRerenderDetected: input.renderBurstRate >= 18 || burstSum >= 10,
  };
}
