import { AppState, type AppStateStatus } from 'react-native';
import {
  BATTERY_SAVER_REFRESH_MULTIPLIER,
  NOTIFICATION_GLOBAL_BURST_MAX,
  NOTIFICATION_GLOBAL_THROTTLE_MS,
} from '../constants/performanceCost';
import type { PerformanceCostRuntimeSnapshot } from '../types/performanceCost';
import { priceRefreshMs } from '../constants/marketData';
import type { PriceRefreshMinutes } from '../types';
import { logAppStateChange } from './productionOpsLog';
import { bindPortfolioRefreshApiPause } from './portfolioRefreshCoordinator';

type Listener = (snap: PerformanceCostRuntimeSnapshot) => void;

let appState: AppStateStatus = AppState.currentState;
let batterySaver = false;
let offlineMode = false;
let lastOnlineAt: string | null = new Date().toISOString();
const listeners = new Set<Listener>();

let notificationTimestamps: number[] = [];
let onNetworkFailureHook: (() => void) | null = null;

export function registerNetworkFailureHook(handler: () => void): void {
  onNetworkFailureHook = handler;
}

function emit(): void {
  const snap = getPerformanceCostSnapshot();
  for (const l of listeners) {
    l(snap);
  }
}

export function subscribePerformanceCost(listener: Listener): () => void {
  listeners.add(listener);
  listener(getPerformanceCostSnapshot());
  return () => listeners.delete(listener);
}

export function setBatterySaverMode(enabled: boolean): void {
  batterySaver = enabled;
  emit();
}

export function setOfflineModeDetected(offline: boolean): void {
  offlineMode = offline;
  if (!offline) {
    lastOnlineAt = new Date().toISOString();
    void import('./websocketTelemetry').then(({ noteWebsocketOnline }) => noteWebsocketOnline());
  } else {
    void import('./websocketTelemetry').then(({ noteWebsocketOffline }) => noteWebsocketOffline());
  }
  emit();
}

export function noteNetworkSuccess(): void {
  offlineMode = false;
  lastOnlineAt = new Date().toISOString();
  emit();
}

export function noteNetworkFailure(): void {
  offlineMode = true;
  onNetworkFailureHook?.();
  emit();
}

export function isAppForeground(): boolean {
  return appState === 'active';
}

export function shouldPauseApiRequests(): boolean {
  if (appState !== 'active') return true;
  if (offlineMode) return true;
  return false;
}

export function shouldPauseXApi(): boolean {
  return shouldPauseApiRequests() || batterySaver;
}

export function shouldReduceAnimations(): boolean {
  return batterySaver;
}

export function effectivePriceRefreshMs(
  minutes: PriceRefreshMinutes,
  batterySaverActive: boolean,
): number {
  const base = priceRefreshMs(minutes);
  if (!batterySaverActive) return base;
  return Math.round(base * BATTERY_SAVER_REFRESH_MULTIPLIER);
}

export function canSendGlobalNotification(nowMs = Date.now()): boolean {
  notificationTimestamps = notificationTimestamps.filter(
    (t) => nowMs - t < NOTIFICATION_GLOBAL_THROTTLE_MS,
  );
  return notificationTimestamps.length < NOTIFICATION_GLOBAL_BURST_MAX;
}

export function recordGlobalNotificationSent(nowMs = Date.now()): void {
  notificationTimestamps.push(nowMs);
}

export function getPerformanceCostSnapshot(): PerformanceCostRuntimeSnapshot {
  const foreground = appState === 'active';
  return {
    appForeground: foreground,
    appStateLabel: appState,
    networkPaused: !foreground,
    offlineMode,
    batterySaverActive: batterySaver,
    animationsReduced: batterySaver,
    xApiPaused: shouldPauseXApi(),
    pollingPaused: shouldPauseApiRequests(),
    lastOnlineAt,
  };
}

let appStateSub: { remove: () => void } | null = null;

export function initPerformanceCostRuntime(): void {
  if (appStateSub) return;
  bindPortfolioRefreshApiPause(shouldPauseApiRequests);
  appStateSub = AppState.addEventListener('change', (next) => {
    const prev = appState;
    appState = next;
    logAppStateChange({
      from: prev,
      to: next,
      pauseApi: shouldPauseApiRequests(),
      offline: offlineMode,
      batterySaver,
    });
    emit();
  });
}

export function teardownPerformanceCostRuntimeForTest(): void {
  appStateSub?.remove();
  appStateSub = null;
  batterySaver = false;
  offlineMode = false;
  notificationTimestamps = [];
  appState = 'active';
}
