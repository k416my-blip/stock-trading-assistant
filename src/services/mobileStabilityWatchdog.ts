import type { AppStateStatus } from 'react-native';
import {
  noteLongSessionListenerResurrection,
  noteLongSessionTimerDrift,
} from './longSessionRuntimeSoak';
import { noteListenerBurst, noteTimerAccumulation } from './runtimeFrameTelemetry';
import {
  noteMemoryListenerRegistered,
  noteMemoryListenerRemoved,
  noteMemoryTimerCleared,
  noteMemoryTimerScheduled,
} from './runtimeMemoryPressureDefense';

export type MobileStabilityWatchdogEventKind =
  | 'lifecycle_change'
  | 'foreground_resume'
  | 'background_pause'
  | 'timer_scheduled'
  | 'timer_cleared'
  | 'deferred_activation_scheduled'
  | 'deferred_activation_completed'
  | 'deferred_activation_cancelled'
  | 'deferred_activation_duplicate_prevented'
  | 'render_commit'
  | 'render_stall'
  | 'render_burst'
  | 'hydration_backlog'
  | 'market_queue_pressure'
  | 'memory_pressure'
  | 'listener_registered'
  | 'listener_removed';

export type MobileStabilityWatchdogEvent = {
  at: string;
  kind: MobileStabilityWatchdogEventKind;
  label: string;
  value?: number;
  detail?: string;
};

export type MobileStabilityWatchdogReport = {
  mobileStabilityReport: MobileStabilityWatchdogEvent[];
  runtimeWatchdogReport: {
    renderCommitCount: number;
    renderStallCount: number;
    renderBurstCount: number;
    hydrationBacklogCount: number;
  };
  memoryPressureReport: {
    maxPendingTimers: number;
    maxDeferredQueueDepth: number;
    maxMarketQueueDepth: number;
    memoryPressureEvents: number;
  };
  renderFreezeDiagnostics: {
    lastAppState: AppStateStatus | 'unknown';
    lifecycleTransitions: number;
    foregroundResumes: number;
    backgroundPauses: number;
    activeListeners: number;
  };
  metrics: {
    runtimeFreezeRiskScore: number;
    mobileMemorySafetyScore: number;
    hydrationBacklogReduction: number;
    renderBurstContainmentScore: number;
    lifecycleStabilityScore: number;
  };
};

const MAX_EVENTS = 180;
const RENDER_STALL_MS = 48;
const RENDER_BURST_WINDOW_MS = 1_000;
const RENDER_BURST_THRESHOLD = 8;
const HYDRATION_BACKLOG_THRESHOLD = 10;
const TIMER_PRESSURE_THRESHOLD = 24;
const MARKET_QUEUE_PRESSURE_THRESHOLD = 10;

const events: MobileStabilityWatchdogEvent[] = [];
const activeTimers = new Set<string>();
const activeListeners = new Set<string>();
const renderMarks = new Map<string, number[]>();

let lastAppState: AppStateStatus | 'unknown' = 'unknown';
let lifecycleTransitions = 0;
let foregroundResumes = 0;
let backgroundPauses = 0;
let renderCommitCount = 0;
let renderStallCount = 0;
let renderBurstCount = 0;
let hydrationBacklogCount = 0;
let memoryPressureEvents = 0;
let maxPendingTimers = 0;
let maxDeferredQueueDepth = 0;
let maxMarketQueueDepth = 0;
let deferredQueueDepth = 0;

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function record(kind: MobileStabilityWatchdogEventKind, label: string, value?: number, detail?: string): void {
  events.push({ at: new Date().toISOString(), kind, label, value, detail });
  if (events.length > MAX_EVENTS) events.shift();
}

function noteMemoryPressure(label: string, value: number, detail?: string): void {
  memoryPressureEvents += 1;
  record('memory_pressure', label, value, detail);
}

export function noteLifecycleChange(nextState: AppStateStatus): void {
  if (lastAppState !== nextState) {
    lifecycleTransitions += 1;
    record('lifecycle_change', 'AppState', undefined, `${lastAppState}->${nextState}`);
  }
  if (nextState === 'active' && lastAppState !== 'active') {
    foregroundResumes += 1;
    record('foreground_resume', 'AppState');
  }
  if (nextState !== 'active' && lastAppState === 'active') {
    backgroundPauses += 1;
    record('background_pause', 'AppState');
  }
  lastAppState = nextState;
}

export function noteWatchdogTimerScheduled(label: string): string {
  const id = `${label}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  activeTimers.add(id);
  maxPendingTimers = Math.max(maxPendingTimers, activeTimers.size);
  record('timer_scheduled', label, activeTimers.size);
  noteTimerAccumulation(label, activeTimers.size);
  noteLongSessionTimerDrift(label, activeTimers.size);
  noteMemoryTimerScheduled(label, id);
  if (activeTimers.size >= TIMER_PRESSURE_THRESHOLD) {
    noteMemoryPressure('timer_pressure', activeTimers.size, label);
  }
  return id;
}

export function noteWatchdogTimerCleared(id: string, label = 'timer'): void {
  if (activeTimers.delete(id)) {
    record('timer_cleared', label, activeTimers.size);
    noteMemoryTimerCleared(id, label);
  }
}

export function noteDeferredActivationScheduled(label: string): void {
  deferredQueueDepth += 1;
  maxDeferredQueueDepth = Math.max(maxDeferredQueueDepth, deferredQueueDepth);
  record('deferred_activation_scheduled', label, deferredQueueDepth);
  if (deferredQueueDepth >= HYDRATION_BACKLOG_THRESHOLD) {
    hydrationBacklogCount += 1;
    record('hydration_backlog', label, deferredQueueDepth);
  }
}

export function noteDeferredActivationCompleted(label: string, elapsedMs: number): void {
  deferredQueueDepth = Math.max(0, deferredQueueDepth - 1);
  record('deferred_activation_completed', label, elapsedMs);
}

export function noteDeferredActivationCancelled(label: string): void {
  deferredQueueDepth = Math.max(0, deferredQueueDepth - 1);
  record('deferred_activation_cancelled', label, deferredQueueDepth);
}

export function noteDeferredActivationDuplicatePrevented(label: string): void {
  record('deferred_activation_duplicate_prevented', label);
}

export function noteRenderCommit(label: string, elapsedMs: number): void {
  renderCommitCount += 1;
  record('render_commit', label, elapsedMs);
  if (elapsedMs >= RENDER_STALL_MS) {
    renderStallCount += 1;
    record('render_stall', label, elapsedMs);
  }

  const now = Date.now();
  const recent = (renderMarks.get(label) ?? []).filter((at) => now - at <= RENDER_BURST_WINDOW_MS);
  recent.push(now);
  renderMarks.set(label, recent);
  if (recent.length === RENDER_BURST_THRESHOLD) {
    renderBurstCount += 1;
    record('render_burst', label, recent.length);
  }
}

export function noteMarketQueuePressure(snapshot: {
  pending: number;
  inFlight: number;
  uniqueKeys: number;
}): void {
  const depth = snapshot.pending + snapshot.inFlight;
  maxMarketQueueDepth = Math.max(maxMarketQueueDepth, depth);
  record('market_queue_pressure', 'marketDataRequestQueue', depth, `keys=${snapshot.uniqueKeys}`);
  if (depth >= MARKET_QUEUE_PRESSURE_THRESHOLD) {
    noteMemoryPressure('market_queue_pressure', depth, `keys=${snapshot.uniqueKeys}`);
  }
}

export function noteListenerRegistered(label: string): void {
  activeListeners.add(label);
  record('listener_registered', label, activeListeners.size);
  noteListenerBurst(label, activeListeners.size);
  noteLongSessionListenerResurrection(label, activeListeners.size);
  noteMemoryListenerRegistered(label);
}

export function noteListenerRemoved(label: string): void {
  activeListeners.delete(label);
  record('listener_removed', label, activeListeners.size);
  noteMemoryListenerRemoved(label);
}

export function getMobileStabilityWatchdogReport(): MobileStabilityWatchdogReport {
  const runtimeFreezeRiskScore = round(
    Math.min(
      1,
      renderStallCount * 0.08 +
        renderBurstCount * 0.12 +
        hydrationBacklogCount * 0.1 +
        memoryPressureEvents * 0.08,
    ),
  );
  const mobileMemorySafetyScore = round(
    1 -
      Math.min(
        0.85,
        maxPendingTimers / 80 * 0.35 +
          maxDeferredQueueDepth / 40 * 0.3 +
          maxMarketQueueDepth / 40 * 0.35,
      ),
  );
  const hydrationBacklogReduction = round(1 - Math.min(0.9, hydrationBacklogCount / 20));
  const renderBurstContainmentScore = round(1 - Math.min(0.9, renderBurstCount / 20));
  const lifecycleStabilityScore = round(1 - Math.min(0.85, foregroundResumes / 80 + backgroundPauses / 80));

  return {
    mobileStabilityReport: [...events],
    runtimeWatchdogReport: {
      renderCommitCount,
      renderStallCount,
      renderBurstCount,
      hydrationBacklogCount,
    },
    memoryPressureReport: {
      maxPendingTimers,
      maxDeferredQueueDepth,
      maxMarketQueueDepth,
      memoryPressureEvents,
    },
    renderFreezeDiagnostics: {
      lastAppState,
      lifecycleTransitions,
      foregroundResumes,
      backgroundPauses,
      activeListeners: activeListeners.size,
    },
    metrics: {
      runtimeFreezeRiskScore,
      mobileMemorySafetyScore,
      hydrationBacklogReduction,
      renderBurstContainmentScore,
      lifecycleStabilityScore,
    },
  };
}

export function resetMobileStabilityWatchdogForTest(): void {
  events.length = 0;
  activeTimers.clear();
  activeListeners.clear();
  renderMarks.clear();
  lastAppState = 'unknown';
  lifecycleTransitions = 0;
  foregroundResumes = 0;
  backgroundPauses = 0;
  renderCommitCount = 0;
  renderStallCount = 0;
  renderBurstCount = 0;
  hydrationBacklogCount = 0;
  memoryPressureEvents = 0;
  maxPendingTimers = 0;
  maxDeferredQueueDepth = 0;
  maxMarketQueueDepth = 0;
  deferredQueueDepth = 0;
}
