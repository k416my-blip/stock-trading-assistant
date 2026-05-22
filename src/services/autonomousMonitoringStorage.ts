import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTONOMOUS_MAX_SILENT_LOG } from '../constants/autonomousMonitoring';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { SilentMonitoringEvent } from '../types/autonomousMonitoring';

export type AdaptiveNotificationState = {
  multiplier: number;
  acknowledgedCount: number;
  dismissedCount: number;
  lastAdjustedAt: string;
};

export type AutonomousMonitoringPersisted = {
  version: 1;
  recentViewedSymbols: string[];
  silentEvents: SilentMonitoringEvent[];
  adaptive: AdaptiveNotificationState;
  lastBundleAt: string | null;
};

const DEFAULT_ADAPTIVE: AdaptiveNotificationState = {
  multiplier: 1,
  acknowledgedCount: 0,
  dismissedCount: 0,
  lastAdjustedAt: new Date().toISOString(),
};

export function defaultAutonomousMonitoringState(): AutonomousMonitoringPersisted {
  return {
    version: 1,
    recentViewedSymbols: [],
    silentEvents: [],
    adaptive: { ...DEFAULT_ADAPTIVE },
    lastBundleAt: null,
  };
}

export async function loadAutonomousMonitoringState(): Promise<AutonomousMonitoringPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.autonomousMonitoring);
    if (!raw) return defaultAutonomousMonitoringState();
    const parsed = JSON.parse(raw) as Partial<AutonomousMonitoringPersisted>;
    return {
      version: 1,
      recentViewedSymbols: Array.isArray(parsed.recentViewedSymbols)
        ? parsed.recentViewedSymbols.slice(0, 12)
        : [],
      silentEvents: Array.isArray(parsed.silentEvents)
        ? parsed.silentEvents.slice(-AUTONOMOUS_MAX_SILENT_LOG)
        : [],
      adaptive: parsed.adaptive?.multiplier
        ? {
            multiplier: Math.min(2, Math.max(0.4, parsed.adaptive.multiplier)),
            acknowledgedCount: parsed.adaptive.acknowledgedCount ?? 0,
            dismissedCount: parsed.adaptive.dismissedCount ?? 0,
            lastAdjustedAt: parsed.adaptive.lastAdjustedAt ?? new Date().toISOString(),
          }
        : { ...DEFAULT_ADAPTIVE },
      lastBundleAt: parsed.lastBundleAt ?? null,
    };
  } catch {
    return defaultAutonomousMonitoringState();
  }
}

export async function saveAutonomousMonitoringState(
  state: AutonomousMonitoringPersisted,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.autonomousMonitoring, JSON.stringify(state));
}

export async function recordRecentViewedSymbol(symbol: string): Promise<void> {
  const s = symbol.trim().toUpperCase();
  if (!s) return;
  const state = await loadAutonomousMonitoringState();
  const next = [s, ...state.recentViewedSymbols.filter((x) => x !== s)].slice(0, 12);
  await saveAutonomousMonitoringState({ ...state, recentViewedSymbols: next });
}

export async function appendSilentMonitoringEvent(
  event: SilentMonitoringEvent,
): Promise<void> {
  const state = await loadAutonomousMonitoringState();
  const silentEvents = [...state.silentEvents, event].slice(-AUTONOMOUS_MAX_SILENT_LOG);
  await saveAutonomousMonitoringState({ ...state, silentEvents });
}

export async function updateAdaptiveFromUserAction(
  action: 'acknowledged' | 'dismissed',
): Promise<AdaptiveNotificationState> {
  const state = await loadAutonomousMonitoringState();
  const adaptive = { ...state.adaptive };
  if (action === 'acknowledged') adaptive.acknowledgedCount += 1;
  else adaptive.dismissedCount += 1;

  const total = adaptive.acknowledgedCount + adaptive.dismissedCount;
  if (total >= 5 && total % 5 === 0) {
    const dismissRate = adaptive.dismissedCount / total;
    if (dismissRate > 0.6) adaptive.multiplier = Math.max(0.5, adaptive.multiplier - 0.15);
    else if (dismissRate < 0.25) adaptive.multiplier = Math.min(1.5, adaptive.multiplier + 0.1);
    adaptive.lastAdjustedAt = new Date().toISOString();
  }

  await saveAutonomousMonitoringState({ ...state, adaptive });
  return adaptive;
}
