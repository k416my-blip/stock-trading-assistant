/**
 * Redmi / Xiaomi mobile runtime helpers — no wakelock, no stealth persistence.
 */
import { AppState, type AppStateStatus } from 'react-native';
import { noteAppBackgrounded, noteAppForegroundResume } from './mobileRuntimeMetrics';
import { beginHydrationPauseWindow } from './hydrationCollisionGuard';
import { noteForegroundResumeSpike } from './redmiSchedulerGuard';
import { requestReconnectSchedule } from '../runtime/stability/reconnectCoordinator';
import { ORCHESTRATION_RESTART_DELAY_MS } from '../constants/layerRuntimeScheduler';
import {
  FOREGROUND_RESUME_DEBOUNCE_MS,
  HYDRATION_COOLDOWN_MS,
  THERMAL_RUNAWAY_DELTA_THRESHOLD,
  WEBSOCKET_RECONNECT_BASE_MS,
  WEBSOCKET_RECONNECT_MAX_MS,
} from '../constants/crossLayerCascade';

type RedmiRuntimeState = {
  initialized: boolean;
  appState: AppStateStatus;
  foregroundResumeHandlers: Set<() => void>;
  delayedOrchestrationTimer: ReturnType<typeof setTimeout> | null;
  activeTimers: Map<string, ReturnType<typeof setTimeout>>;
  lastHydrationAt: string | null;
  cacheFirstUntil: number;
  lastForegroundResumeAt: number;
  lastHydrationAttemptAt: number;
  wsReconnectAttempts: number;
  lastThermalPressurePct: number;
  resumeTransitionCount: number;
};

const state: RedmiRuntimeState = {
  initialized: false,
  appState: AppState.currentState,
  foregroundResumeHandlers: new Set(),
  delayedOrchestrationTimer: null,
  activeTimers: new Map(),
  lastHydrationAt: null,
  cacheFirstUntil: 0,
  lastForegroundResumeAt: 0,
  lastHydrationAttemptAt: 0,
  wsReconnectAttempts: 0,
  lastThermalPressurePct: 0,
  resumeTransitionCount: 0,
};

let appSub: { remove: () => void } | null = null;

export function initMobileRedmiRuntime(onForegroundResume?: () => void): void {
  if (onForegroundResume) {
    state.foregroundResumeHandlers.add(onForegroundResume);
  }
  if (state.initialized) return;
  state.initialized = true;
  void import('./nativeDeviceObservation').then(({ initNativeDeviceObservation }) => {
    initNativeDeviceObservation();
  });
  appSub = AppState.addEventListener('change', (next) => {
    const prev = state.appState;
    state.appState = next;
    if (prev === 'active' && next.match(/inactive|background/)) {
      noteAppBackgrounded();
      enableCacheFirstMode(30_000);
      void import('../native/runtime/miuiReclaimDetector').then(({ noteMiuiBackgroundStart }) => {
        noteMiuiBackgroundStart();
      });
    }
    if (next === 'active' && prev.match(/inactive|background/)) {
      void import('../runtime/orchestrator/redmiOrchestratorGuard').then(({ beginRedmiStagedResume }) => {
        beginRedmiStagedResume();
      });
      const now = Date.now();
      state.resumeTransitionCount += 1;
      if (now - state.lastForegroundResumeAt < FOREGROUND_RESUME_DEBOUNCE_MS) {
        return;
      }
      state.lastForegroundResumeAt = now;
      const recoveryMs = noteAppForegroundResume();
      void import('../native/runtime/miuiReclaimDetector').then(({ noteMiuiForegroundResume }) => {
        noteMiuiForegroundResume();
      });
      void import('../native/runtime/lifecycleTimeline').then(({ recordLifecycleEvent }) => {
        recordLifecycleEvent('resume', 'foreground orchestration restart', false);
      });
      scheduleDelayedOrchestrationRestart();
      scheduleDedupedTimer(
        'fg-resume-hydration',
        () => {
          if (Date.now() - state.lastHydrationAttemptAt < HYDRATION_COOLDOWN_MS) return;
          state.lastHydrationAttemptAt = Date.now();
          markHydrationComplete();
          for (const h of state.foregroundResumeHandlers) {
            h();
          }
        },
        ORCHESTRATION_RESTART_DELAY_MS,
      );
      if (recoveryMs != null && recoveryMs > 500) {
        requestReconnectSchedule(
          WEBSOCKET_RECONNECT_BASE_MS,
          WEBSOCKET_RECONNECT_MAX_MS,
          'redmi foreground resume',
          'redmi_foreground',
        );
      }
    }
  });
}

export function teardownMobileRedmiRuntimeForTest(): void {
  appSub?.remove();
  appSub = null;
  state.initialized = false;
  state.foregroundResumeHandlers.clear();
  if (state.delayedOrchestrationTimer) clearTimeout(state.delayedOrchestrationTimer);
  state.delayedOrchestrationTimer = null;
  for (const t of state.activeTimers.values()) clearTimeout(t);
  state.activeTimers.clear();
}

export function registerForegroundResumeHydration(handler: () => void): () => void {
  state.foregroundResumeHandlers.add(handler);
  return () => state.foregroundResumeHandlers.delete(handler);
}

/** Deduped timer — same key replaces prior timeout. */
export function scheduleDedupedTimer(
  key: string,
  fn: () => void,
  delayMs: number,
): void {
  const existing = state.activeTimers.get(key);
  if (existing) clearTimeout(existing);
  const id = setTimeout(() => {
    state.activeTimers.delete(key);
    fn();
  }, delayMs);
  state.activeTimers.set(key, id);
}

export function cancelDedupedTimer(key: string): void {
  const existing = state.activeTimers.get(key);
  if (existing) {
    clearTimeout(existing);
    state.activeTimers.delete(key);
  }
}

export function scheduleDelayedOrchestrationRestart(onReady?: () => void): void {
  if (state.delayedOrchestrationTimer) clearTimeout(state.delayedOrchestrationTimer);
  state.delayedOrchestrationTimer = setTimeout(() => {
    state.delayedOrchestrationTimer = null;
    onReady?.();
  }, ORCHESTRATION_RESTART_DELAY_MS);
}

export function noteWebsocketSoftReconnect(): void {
  requestReconnectSchedule(
    WEBSOCKET_RECONNECT_BASE_MS,
    WEBSOCKET_RECONNECT_MAX_MS,
    'mobile soft reconnect',
    'mobile_soft',
  );
}

export function noteThermalPressureForRunaway(thermalPressurePct: number): boolean {
  const delta = thermalPressurePct - state.lastThermalPressurePct;
  state.lastThermalPressurePct = thermalPressurePct;
  if (delta >= THERMAL_RUNAWAY_DELTA_THRESHOLD) {
    enableCacheFirstMode(45_000);
    return true;
  }
  return false;
}

export function resetWebsocketReconnectBackoff(): void {
  state.wsReconnectAttempts = 0;
}

export function cleanupDuplicateTimers(): void {
  for (const [key, id] of state.activeTimers) {
    if (key.startsWith('dup-')) clearTimeout(id);
  }
}

export function enableCacheFirstMode(durationMs: number): void {
  state.cacheFirstUntil = Date.now() + durationMs;
}

export function isCacheFirstModeActive(): boolean {
  return Date.now() < state.cacheFirstUntil;
}

export function markHydrationComplete(): void {
  if (Date.now() - state.lastHydrationAttemptAt < HYDRATION_COOLDOWN_MS && state.lastHydrationAt) {
    return;
  }
  state.lastHydrationAttemptAt = Date.now();
  state.lastHydrationAt = new Date().toISOString();
}

export function getLastHydrationAt(): string | null {
  return state.lastHydrationAt;
}

export function isAppInBackground(): boolean {
  return state.appState !== 'active';
}

export function getResumeTransitionCount(): number {
  return state.resumeTransitionCount;
}
