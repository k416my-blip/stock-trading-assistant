import type { TelemetryConfidenceField } from '../../types/nativeRuntimeBridge';
import { getLastNativeRuntimeSnapshot, noteNativeTrimMemory } from './nativeRuntimeBridge';
import { recordLifecycleEvent } from './lifecycleTimeline';

type MiuiState = {
  shortBackgroundReconnects: number;
  hydrationResetSpikes: number;
  reconnectStormCount: number;
  trimBurstCount: number;
  lastBackgroundAt: number | null;
};

const state: MiuiState = {
  shortBackgroundReconnects: 0,
  hydrationResetSpikes: 0,
  reconnectStormCount: 0,
  trimBurstCount: 0,
  lastBackgroundAt: null,
};

export function resetMiuiReclaimDetectorForTest(): void {
  state.shortBackgroundReconnects = 0;
  state.hydrationResetSpikes = 0;
  state.reconnectStormCount = 0;
  state.trimBurstCount = 0;
  state.lastBackgroundAt = null;
}

export function noteMiuiBackgroundStart(): void {
  state.lastBackgroundAt = Date.now();
}

export function noteMiuiForegroundResume(): void {
  if (state.lastBackgroundAt != null && Date.now() - state.lastBackgroundAt < 40_000) {
    state.shortBackgroundReconnects += 1;
    recordLifecycleEvent('resume', 'short background resume', false);
  }
  state.lastBackgroundAt = null;
}

export function noteMiuiForcedReconnect(): void {
  state.reconnectStormCount += 1;
  recordLifecycleEvent('reconnect_start', 'forced reconnect', false);
}

export function noteMiuiHydrationResetSpike(): void {
  state.hydrationResetSpikes += 1;
}

export function noteMiuiTrimBurst(): void {
  state.trimBurstCount += 1;
  noteNativeTrimMemory(20);
}

export function detectMiuiAggressiveReclaim(): TelemetryConfidenceField<boolean> {
  const native = getLastNativeRuntimeSnapshot();
  const xiaomi = native?.isXiaomiFamily ?? false;
  const heuristic =
    state.shortBackgroundReconnects >= 2 ||
    state.hydrationResetSpikes >= 2 ||
    state.reconnectStormCount >= 3 ||
    state.trimBurstCount >= 3;

  const nativeFlag = native?.miuiAggressiveReclaim ?? false;
  const detected = (xiaomi && heuristic) || nativeFlag;

  if (native?.source === 'native' && nativeFlag) {
    return { value: true, source: 'native', confidence: 0.94, freshnessMs: 0 };
  }
  if (detected) {
    return { value: true, source: xiaomi ? 'hybrid' : 'heuristic', confidence: 0.72, freshnessMs: 0 };
  }
  return { value: false, source: 'heuristic', confidence: 0.55, freshnessMs: 0 };
}

export function getMiuiReclaimEventCount(): number {
  return (
    state.shortBackgroundReconnects +
    state.hydrationResetSpikes +
    state.reconnectStormCount +
    state.trimBurstCount
  );
}
