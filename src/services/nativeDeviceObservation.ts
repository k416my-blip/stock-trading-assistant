/**
 * Native device observation — AppState + performance snapshot heuristics (no extra native modules).
 */
import { AppState, type AppStateStatus } from 'react-native';
import type {
  NativeAppStateObservation,
  NativeDeviceObservationSnapshot,
  NativeNetworkType,
  NativeThermalStatus,
} from '../types/runtimeTelemetry';
import { getPerformanceCostSnapshot } from './performanceCostRuntime';
import { getResumeTransitionCount } from './mobileRedmiRuntime';
import { getLastNativeRuntimeSnapshot } from '../native/runtime/nativeRuntimeBridge';

type ObservationState = {
  appState: AppStateStatus;
  foregroundTransitions: number;
  lastResumeAt: number;
  memoryWarningCount: number;
  miuiReclaimSignals: number;
};

const state: ObservationState = {
  appState: AppState.currentState,
  foregroundTransitions: 0,
  lastResumeAt: 0,
  memoryWarningCount: 0,
  miuiReclaimSignals: 0,
};

let appSub: { remove: () => void } | null = null;

function mapAppState(s: AppStateStatus): NativeAppStateObservation {
  if (s === 'active') return 'active';
  if (s === 'background') return 'background';
  if (s === 'inactive') return 'inactive';
  if (s === 'unknown') return 'unknown';
  if (s === 'extension') return 'extension';
  return 'unknown';
}

function thermalFromPressure(pct: number): NativeThermalStatus {
  if (pct >= 88) return 'critical';
  if (pct >= 72) return 'severe';
  if (pct >= 55) return 'moderate';
  if (pct >= 35) return 'light';
  return 'none';
}

function networkFromPerf(offline: boolean, paused: boolean): NativeNetworkType {
  if (offline) return 'offline';
  if (paused) return 'unknown';
  return 'wifi';
}

export function resetNativeDeviceObservationForTest(): void {
  state.appState = 'active';
  state.foregroundTransitions = 0;
  state.lastResumeAt = 0;
  state.memoryWarningCount = 0;
  state.miuiReclaimSignals = 0;
  appSub?.remove();
  appSub = null;
}

export function noteNativeForegroundTransition(): void {
  state.foregroundTransitions += 1;
  state.lastResumeAt = Date.now();
}

export function noteNativeMemoryWarning(): void {
  state.memoryWarningCount += 1;
  state.miuiReclaimSignals += 1;
}

export function initNativeDeviceObservation(): void {
  if (appSub) return;
  appSub = AppState.addEventListener('change', (next) => {
    const prev = state.appState;
    state.appState = next;
    if (next === 'active' && prev.match(/inactive|background/)) {
      noteNativeForegroundTransition();
    }
    if (prev === 'active' && next.match(/inactive|background/)) {
      if (getResumeTransitionCount() > 3) {
        state.miuiReclaimSignals += 1;
      }
    }
  });
}

export function observeNativeDevice(input: {
  thermalPressurePct: number;
  memoryPressure: boolean;
  queueSize: number;
}): NativeDeviceObservationSnapshot {
  const perf = getPerformanceCostSnapshot();
  const bridge = getLastNativeRuntimeSnapshot();
  const thermal =
    bridge?.source === 'native' && bridge.thermalStatus !== 'unknown'
      ? (bridge.thermalStatus as NativeThermalStatus)
      : thermalFromPressure(input.thermalPressurePct);
  const resumeSpike =
    state.foregroundTransitions >= 2 &&
    Date.now() - state.lastResumeAt < 4000 &&
    state.lastResumeAt > 0;
  const miuiAggressive =
    bridge?.miuiAggressiveReclaim === true ||
    state.miuiReclaimSignals >= 2 ||
    (input.memoryPressure && input.queueSize > 50 && perf.appStateLabel === 'background');

  return {
    batterySaverActive: bridge?.batterySaverActive ?? perf.batterySaverActive,
    lowPowerMode: bridge?.lowPowerMode ?? perf.batterySaverActive,
    thermalStatus: thermal,
    memoryWarning:
      (bridge?.trimLevel !== 'none' && bridge?.trimLevel != null) ||
      state.memoryWarningCount > 0 ||
      input.memoryPressure,
    appState: mapAppState(state.appState),
    backgroundRestriction: bridge?.backgroundReclaimDetected ?? !perf.appForeground,
    networkType: networkFromPerf(perf.offlineMode, perf.networkPaused),
    miuiAggressiveReclaim: miuiAggressive,
    thermalThrottlingDetected:
      bridge?.thermalStatus === 'moderate' ||
      bridge?.thermalStatus === 'severe' ||
      bridge?.thermalStatus === 'critical' ||
      thermal === 'moderate' ||
      thermal === 'severe' ||
      thermal === 'critical',
    resumeSpikeDetected: resumeSpike,
    observedAt: new Date().toISOString(),
  };
}
