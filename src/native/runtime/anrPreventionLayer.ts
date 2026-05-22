import type { AnrRiskSnapshot } from '../../types/nativeRuntimeBridge';
import { cooperativeYield } from '../../services/cooperativeYield';
import { getLastNativeRuntimeSnapshot } from './nativeRuntimeBridge';

type AnrState = {
  lastEventLoopPing: number;
  stallMs: number;
  renderFreezeMs: number;
  bridgeCongestion: number;
  longSyncDetected: boolean;
  preventionEnabled: boolean;
};

const state: AnrState = {
  lastEventLoopPing: Date.now(),
  stallMs: 0,
  renderFreezeMs: 0,
  bridgeCongestion: 0,
  longSyncDetected: false,
  preventionEnabled: true,
};

let pingTimer: ReturnType<typeof setInterval> | null = null;

export function resetAnrPreventionLayerForTest(): void {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
  state.lastEventLoopPing = Date.now();
  state.stallMs = 0;
  state.renderFreezeMs = 0;
  state.bridgeCongestion = 0;
  state.longSyncDetected = false;
  state.preventionEnabled = true;
}

export function noteRenderFreezeDurationMs(ms: number): void {
  state.renderFreezeMs = Math.max(state.renderFreezeMs, ms);
}

export function noteBridgeCongestion(score: number): void {
  state.bridgeCongestion = Math.max(state.bridgeCongestion, score);
}

export function noteLongSyncTask(durationMs: number): void {
  if (durationMs > 120) state.longSyncDetected = true;
}

function computeAnrRisk(): number {
  const native = getLastNativeRuntimeSnapshot();
  let risk = Math.min(
    100,
    Math.round(
      state.stallMs / 8 +
        state.renderFreezeMs / 10 +
        state.bridgeCongestion * 0.5 +
        (state.longSyncDetected ? 25 : 0) +
        (native?.anrRiskScore ?? 0) * 0.4,
    ),
  );
  return risk;
}

export function observeAnrRisk(): AnrRiskSnapshot {
  const now = Date.now();
  const gap = now - state.lastEventLoopPing;
  if (gap > 200) state.stallMs = gap;

  return {
    eventLoopStallMs: state.stallMs,
    renderFreezeMs: state.renderFreezeMs,
    bridgeCongestionScore: state.bridgeCongestion,
    longSyncTaskDetected: state.longSyncDetected,
    anrRiskScore: computeAnrRisk(),
    preventionActive: state.preventionEnabled,
  };
}

export async function runChunkedWithYield<T>(
  chunks: Array<() => Promise<void>>,
  yieldMs = 4,
): Promise<void> {
  for (const chunk of chunks) {
    await chunk();
    await cooperativeYield(yieldMs);
  }
}

export async function deferHeavyWork(fn: () => Promise<void>, delayMs = 32): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      void fn().finally(() => resolve());
    }, delayMs);
  });
}

export function initAnrPreventionLayer(): void {
  if (pingTimer) return;
  state.lastEventLoopPing = Date.now();
  pingTimer = setInterval(() => {
    const now = Date.now();
    const gap = now - state.lastEventLoopPing;
    if (gap > 150) state.stallMs = gap;
    state.lastEventLoopPing = now;
  }, 100);
}

export function pingEventLoop(): void {
  state.lastEventLoopPing = Date.now();
  state.stallMs = 0;
}
