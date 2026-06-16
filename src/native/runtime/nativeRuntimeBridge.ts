/**
 * Native Runtime Metrics Bridge — Android native module with Expo managed fallback.
 */
import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import {
  MIUI_RECLAIM_BURST_THRESHOLD,
  NATIVE_BRIDGE_VERSION,
} from '../../constants/nativeRuntimeBridge';
import type {
  NativeMemoryClassSnapshot,
  NativeRuntimeSnapshot,
  NativeThermalLevel,
  NativeTrimLevel,
  NetworkTransportQuality,
  TelemetryMetricSource,
} from '../../types/nativeRuntimeBridge';
import { getPerformanceCostSnapshot } from '../../services/performanceCostRuntime';
import {
  recordBridgeFetchTrace,
  recordNativeLifecycleTrace,
  recordAppPhaseTrace,
} from './nativeBoundaryTrace';
import { recordBridgeFetchMs } from './nativeBoundaryHistograms';

type NativeModuleShape = {
  getSnapshot?: () => Promise<Record<string, unknown>>;
  getMemoryClass?: () => Promise<Record<string, unknown>>;
  acquirePartialWakeLock?: (tag: string) => Promise<void>;
  releasePartialWakeLock?: () => Promise<void>;
  startLongRunForegroundService?: (title?: string, body?: string) => Promise<void>;
  stopLongRunForegroundService?: () => Promise<void>;
  getSurvivalStatus?: () => Promise<{ wakeLockHeld: boolean; foregroundServiceRunning: boolean }>;
  addListener?: (event: string) => void;
  removeListeners?: (count: number) => void;
};

function resolveNativeSta(): NativeModuleShape | undefined {
  if (Platform.OS !== 'android') return undefined;
  try {
    return requireNativeModule<NativeModuleShape>('StaNativeRuntime');
  } catch {
    return NativeModules.StaNativeRuntime as NativeModuleShape | undefined;
  }
}

const NativeSta: NativeModuleShape | undefined = resolveNativeSta();

let trimBurstCount = 0;
let lastTrimAt = 0;
let lastNativeSnapshot: NativeRuntimeSnapshot | null = null;
let eventSub: { remove: () => void } | null = null;
let initialized = false;

export function resetNativeRuntimeBridgeForTest(): void {
  trimBurstCount = 0;
  lastTrimAt = 0;
  lastNativeSnapshot = null;
  eventSub?.remove();
  eventSub = null;
  initialized = false;
}

export function setLastNativeSnapshotForTest(snap: NativeRuntimeSnapshot | null): void {
  lastNativeSnapshot = snap;
}

function mapTrimLevel(code: number): NativeTrimLevel {
  if (code >= 80) return 'complete';
  if (code >= 60) return 'background';
  if (code >= 40) return 'uiHidden';
  if (code >= 20) return 'runningCritical';
  if (code >= 10) return 'runningLow';
  if (code > 0) return 'runningModerate';
  return 'none';
}

function mapThermal(raw: string): NativeThermalLevel {
  const s = raw.toLowerCase();
  if (s.includes('shutdown')) return 'shutdown';
  if (s.includes('emergency')) return 'emergency';
  if (s.includes('critical') || s.includes('severe')) return 'critical';
  if (s.includes('moderate')) return 'moderate';
  if (s.includes('light')) return 'light';
  return 'none';
}

function mapNetwork(raw: string): NetworkTransportQuality {
  const s = raw.toLowerCase();
  if (s === 'offline') return 'offline';
  if (s === 'poor') return 'poor';
  if (s === 'fair') return 'fair';
  if (s === 'good') return 'good';
  if (s === 'excellent') return 'excellent';
  return 'unknown';
}

function isXiaomiFamily(manufacturer: string, brand: string): boolean {
  const m = `${manufacturer} ${brand}`.toLowerCase();
  return m.includes('xiaomi') || m.includes('redmi') || m.includes('poco');
}

function heuristicSnapshot(): NativeRuntimeSnapshot {
  const perf = getPerformanceCostSnapshot();
  const pressure = perf.batterySaverActive ? 55 : perf.offlineMode ? 40 : 18;
  return {
    available: false,
    bridgeVersion: NATIVE_BRIDGE_VERSION,
    observedAt: new Date().toISOString(),
    nativeMemoryPressurePct: pressure,
    trimLevel: trimBurstCount >= MIUI_RECLAIM_BURST_THRESHOLD ? 'background' : 'none',
    trimMemoryBurstCount: trimBurstCount,
    thermalStatus: pressure >= 55 ? 'moderate' : 'light',
    batterySaverActive: perf.batterySaverActive,
    lowPowerMode: perf.batterySaverActive,
    foreground: perf.appForeground,
    backgroundReclaimDetected: trimBurstCount >= 2,
    droppedFramesEstimate: 0,
    anrRiskScore: 0,
    networkTransportQuality: perf.offlineMode ? 'offline' : 'good',
    memoryClass: {
      memoryClassMb: 192,
      largeMemoryClassMb: 512,
      lowRamDevice: false,
      isLowRamDevice: false,
    },
    manufacturer: 'unknown',
    brand: 'unknown',
    model: 'unknown',
    isXiaomiFamily: false,
    miuiAggressiveReclaim: trimBurstCount >= MIUI_RECLAIM_BURST_THRESHOLD,
    source: 'heuristic',
    confidence: 0.48,
    nativeHeapAllocatedMb: Math.round(pressure * 0.4 + 40),
    javaHeapUsedMb: Math.round(pressure * 0.3 + 30),
    availMemMb: 2048,
    totalMemMb: 8192,
    batteryLevelPct: null,
    bridgePendingEstimate: trimBurstCount * 2,
  };
}

function parseSnapshot(raw: Record<string, unknown>): NativeRuntimeSnapshot {
  const manufacturer = String(raw.manufacturer ?? 'unknown');
  const brand = String(raw.brand ?? 'unknown');
  const memoryClass: NativeMemoryClassSnapshot = {
    memoryClassMb: Number(raw.memoryClassMb ?? 192),
    largeMemoryClassMb: Number(raw.largeMemoryClassMb ?? 512),
    lowRamDevice: Boolean(raw.lowRamDevice),
    isLowRamDevice: Boolean(raw.isLowRamDevice ?? raw.lowRamDevice),
  };
  return {
    available: true,
    bridgeVersion: Number(raw.bridgeVersion ?? NATIVE_BRIDGE_VERSION),
    observedAt: new Date().toISOString(),
    nativeMemoryPressurePct: Number(raw.nativeMemoryPressurePct ?? 0),
    trimLevel: mapTrimLevel(Number(raw.trimLevelCode ?? 0)),
    trimMemoryBurstCount: Number(raw.trimMemoryBurstCount ?? trimBurstCount),
    thermalStatus: mapThermal(String(raw.thermalStatus ?? 'none')),
    batterySaverActive: Boolean(raw.batterySaverActive),
    lowPowerMode: Boolean(raw.lowPowerMode),
    foreground: Boolean(raw.foreground),
    backgroundReclaimDetected: Boolean(raw.backgroundReclaimDetected),
    droppedFramesEstimate: Number(raw.droppedFramesEstimate ?? 0),
    anrRiskScore: Number(raw.anrRiskScore ?? 0),
    networkTransportQuality: mapNetwork(String(raw.networkTransportQuality ?? 'unknown')),
    memoryClass,
    manufacturer,
    brand,
    model: String(raw.model ?? 'unknown'),
    isXiaomiFamily: Boolean(raw.isXiaomiFamily) || isXiaomiFamily(manufacturer, brand),
    miuiAggressiveReclaim: Boolean(raw.miuiAggressiveReclaim),
    source: 'native',
    confidence: 0.92,
    nativeHeapAllocatedMb: Number(raw.nativeHeapAllocatedMb ?? 0),
    javaHeapUsedMb: Number(raw.javaHeapUsedMb ?? 0),
    availMemMb: Number(raw.availMemMb ?? 0),
    totalMemMb: Number(raw.totalMemMb ?? 0),
    batteryLevelPct: raw.batteryLevelPct == null ? null : Number(raw.batteryLevelPct),
    bridgePendingEstimate: Number(raw.bridgePendingEstimate ?? 0),
  };
}

export function isNativeRuntimeBridgeAvailable(): boolean {
  return Platform.OS === 'android' && typeof NativeSta?.getSnapshot === 'function';
}

export async function fetchNativeRuntimeSnapshot(): Promise<NativeRuntimeSnapshot> {
  const started = Date.now();
  if (!isNativeRuntimeBridgeAvailable() || !NativeSta?.getSnapshot) {
    const h = heuristicSnapshot();
    lastNativeSnapshot = h;
    const durationMs = Date.now() - started;
    recordBridgeFetchMs(durationMs);
    recordBridgeFetchTrace({
      durationMs,
      ok: true,
      metricSource: 'heuristic',
      detailJa: 'heuristic fallback',
    });
    return h;
  }
  try {
    const raw = await NativeSta.getSnapshot();
    const snap = parseSnapshot(raw);
    lastNativeSnapshot = snap;
    const durationMs = Date.now() - started;
    recordBridgeFetchMs(durationMs);
    void import('../telemetry/bridgeCongestionMonitor').then(({ noteBridgeFetchDurationMs }) => {
      noteBridgeFetchDurationMs(durationMs);
    });
    if (durationMs > 250) {
      void import('./anrPreventionLayer').then(({ noteBridgeCongestion }) => {
        noteBridgeCongestion(Math.min(100, durationMs / 10));
      });
    }
    recordBridgeFetchTrace({
      durationMs,
      ok: true,
      metricSource: 'native',
      detailJa: `native snapshot ${snap.model}`,
    });
    return snap;
  } catch (err) {
    const h = heuristicSnapshot();
    lastNativeSnapshot = h;
    const durationMs = Date.now() - started;
    recordBridgeFetchMs(durationMs);
    recordBridgeFetchTrace({
      durationMs,
      ok: false,
      metricSource: 'heuristic',
      detailJa: `fetch error: ${err instanceof Error ? err.message : 'unknown'}`,
    });
    return h;
  }
}

export function getLastNativeRuntimeSnapshot(): NativeRuntimeSnapshot | null {
  return lastNativeSnapshot;
}

export function noteNativeTrimMemory(levelCode = 15): void {
  const now = Date.now();
  if (now - lastTrimAt < 3000) {
    trimBurstCount += 1;
  } else {
    trimBurstCount = 1;
  }
  lastTrimAt = now;
  void import('./lifecycleTimeline').then(({ recordLifecycleEvent }) => {
    recordLifecycleEvent('trim_memory', `trim level ${levelCode}`, true);
  });
}

export function initNativeRuntimeBridge(): void {
  if (initialized) return;
  initialized = true;

  if (NativeSta) {
    const emitter = new NativeEventEmitter(NativeModules.StaNativeRuntime ?? NativeSta);
    eventSub = emitter.addListener('onTrimMemory', (payload: { level?: number }) => {
      noteNativeTrimMemory(payload?.level ?? 10);
    });
    emitter.addListener(
      'onNativeLifecycle',
      (payload: { kind?: string; level?: number; phase?: string }) => {
        recordNativeLifecycleTrace(
          `${payload.kind ?? 'lifecycle'} level ${payload.level ?? 0} · ${payload.phase ?? 'unknown'}`,
        );
      },
    );
  }

  let lastBgAt: number | null = null;
  AppState.addEventListener('change', (next) => {
    void import('./lifecycleTimeline').then(({ recordLifecycleEvent }) => {
      if (next === 'active') {
        recordAppPhaseTrace('foreground', 'AppState active');
        recordLifecycleEvent('foreground', 'AppState active', false);
        if (lastBgAt != null && Date.now() - lastBgAt < 45_000) {
          trimBurstCount += 1;
        }
        lastBgAt = null;
      } else if (next === 'background') {
        lastBgAt = Date.now();
        recordAppPhaseTrace('background', 'AppState background');
        recordLifecycleEvent('background', 'AppState background', false);
      } else {
        recordAppPhaseTrace('inactive', 'AppState inactive');
        recordLifecycleEvent('inactive', 'AppState inactive', false);
      }
    });
  });

  void fetchNativeRuntimeSnapshot();
}
