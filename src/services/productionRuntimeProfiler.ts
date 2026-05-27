import type { AppStateStatus } from 'react-native';

export type ProductionRuntimeProfileKind =
  | 'frame_budget_overflow'
  | 'dropped_frame_risk'
  | 'frame_starvation'
  | 'render_burst_spike'
  | 'commit_blocking'
  | 'hydration_blocking'
  | 'js_event_loop_lag'
  | 'long_task'
  | 'timer_execution_drift'
  | 'hermes_gc_pause_estimate'
  | 'async_queue_delay'
  | 'interaction_latency'
  | 'navigation_latency'
  | 'memory_retention'
  | 'appstate_resume_timing'
  | 'background_wake_latency'
  | 'reconnect_latency'
  | 'offline_recovery_latency'
  | 'battery_saver_slowdown'
  | 'bridge_congestion_estimate'
  | 'long_session_degradation';

export type ProductionRuntimeProfileEvent = {
  at: string;
  elapsedMs: number;
  kind: ProductionRuntimeProfileKind;
  label: string;
  durationMs?: number;
  value?: number;
  detail?: string;
};

export type ProductionRuntimeWindowSnapshot = {
  window: '5m' | '30m' | '1h';
  eventCount: number;
  peakDurationMs: number;
  frameDropHotspots: string[];
  jsStallHotspots: string[];
  reconnectHotspots: string[];
};

export type ProductionRuntimeProfilingReport = {
  runtimeProfilingReport: ProductionRuntimeProfileEvent[];
  jsThreadReport: {
    eventLoopLagCount: number;
    longTaskCount: number;
    hermesGcPauseEstimates: number;
    maxJsBlockMs: number;
  };
  frameStabilityReport: {
    droppedFrameRisks: number;
    frameBudgetOverflows: number;
    renderBurstSpikes: number;
    frameStarvationEvents: number;
    maxCommitBlockingMs: number;
  };
  interactionLatencyReport: {
    interactionCount: number;
    navigationTransitionCount: number;
    maxInteractionMs: number;
    hotspots: string[];
  };
  memoryPressureReport: {
    memoryRetentionSamples: number;
    maxMemoryRetentionValue: number;
    hiddenBackgroundRetentionEvents: number;
  };
  androidRecoveryReport: {
    resumeTimings: number;
    backgroundWakeLatencyEvents: number;
    reconnectLatencyEvents: number;
    offlineRecoveryLatencyEvents: number;
    batterySaverSlowdownEvents: number;
  };
  expoRuntimeReport: {
    bridgeCongestionEstimates: number;
    hydrationBlockingEvents: number;
    longSessionDegradationEvents: number;
    rollingSnapshots: ProductionRuntimeWindowSnapshot[];
  };
  metrics: {
    frameStabilityScore: number;
    jsThreadHealthScore: number;
    interactionResponsivenessScore: number;
    hydrationBlockingScore: number;
    runtimeLatencyScore: number;
    memoryRetentionScore: number;
    longSessionPerformanceScore: number;
  };
};

const MAX_EVENTS = 320;
const FRAME_BUDGET_MS = 16.7;
const DROPPED_FRAME_MS = 33.4;
const FRAME_STARVATION_MS = 80;
const GC_PAUSE_ESTIMATE_MS = 140;
const SLOW_INTERACTION_MS = 180;
const RECONNECT_SLOW_MS = 2_000;
const MEMORY_RETENTION_WARNING = 4;
const sessionStartedAt = Date.now();
const events: ProductionRuntimeProfileEvent[] = [];

let eventLoopLagCount = 0;
let longTaskCount = 0;
let hermesGcPauseEstimates = 0;
let maxJsBlockMs = 0;
let droppedFrameRisks = 0;
let frameBudgetOverflows = 0;
let renderBurstSpikes = 0;
let frameStarvationEvents = 0;
let maxCommitBlockingMs = 0;
let interactionCount = 0;
let navigationTransitionCount = 0;
let maxInteractionMs = 0;
let memoryRetentionSamples = 0;
let maxMemoryRetentionValue = 0;
let hiddenBackgroundRetentionEvents = 0;
let resumeTimings = 0;
let backgroundWakeLatencyEvents = 0;
let reconnectLatencyEvents = 0;
let offlineRecoveryLatencyEvents = 0;
let batterySaverSlowdownEvents = 0;
let bridgeCongestionEstimates = 0;
let hydrationBlockingEvents = 0;
let longSessionDegradationEvents = 0;
let lastBackgroundAt: number | null = null;

function elapsedMs(): number {
  return Date.now() - sessionStartedAt;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function record(
  kind: ProductionRuntimeProfileKind,
  label: string,
  durationMs?: number,
  value?: number,
  detail?: string,
): void {
  events.push({ at: new Date().toISOString(), elapsedMs: elapsedMs(), kind, label, durationMs, value, detail });
  if (events.length > MAX_EVENTS) events.shift();
}

export function noteProductionFrameProfile(label: string, commitMs: number, burstSize = 0): void {
  maxCommitBlockingMs = Math.max(maxCommitBlockingMs, commitMs);
  if (commitMs >= FRAME_BUDGET_MS) {
    frameBudgetOverflows += 1;
    record('frame_budget_overflow', label, commitMs);
  }
  if (commitMs >= DROPPED_FRAME_MS) {
    droppedFrameRisks += 1;
    record('dropped_frame_risk', label, commitMs);
  }
  if (commitMs >= FRAME_STARVATION_MS) {
    frameStarvationEvents += 1;
    record('frame_starvation', label, commitMs);
  }
  if (burstSize >= 8) {
    renderBurstSpikes += 1;
    record('render_burst_spike', label, commitMs, burstSize);
  }
  record('commit_blocking', label, commitMs);
}

export function noteProductionHydrationProfile(label: string, elapsedHydrationMs: number): void {
  if (elapsedHydrationMs >= 120) {
    hydrationBlockingEvents += 1;
    record('hydration_blocking', label, elapsedHydrationMs);
  }
}

export function noteProductionJsTiming(label: string, lagMs: number): void {
  if (lagMs <= 0) return;
  eventLoopLagCount += 1;
  maxJsBlockMs = Math.max(maxJsBlockMs, lagMs);
  record('js_event_loop_lag', label, lagMs);
  if (lagMs >= 80) {
    longTaskCount += 1;
    record('long_task', label, lagMs);
  }
  if (lagMs >= GC_PAUSE_ESTIMATE_MS) {
    hermesGcPauseEstimates += 1;
    record('hermes_gc_pause_estimate', label, lagMs);
  }
}

export function noteProductionTimerDrift(label: string, activeTimers: number): void {
  if (activeTimers < 12) return;
  record('timer_execution_drift', label, undefined, activeTimers);
  if (activeTimers >= 20) {
    bridgeCongestionEstimates += 1;
    record('bridge_congestion_estimate', label, undefined, activeTimers, 'timer buildup');
  }
}

export function noteProductionAsyncQueueDelay(label: string, queueDepth: number, detail?: string): void {
  if (queueDepth <= 1) return;
  record('async_queue_delay', label, undefined, queueDepth, detail);
}

export function noteProductionInteractionProfile(label: string, elapsedInteractionMs: number, detail?: string): void {
  interactionCount += 1;
  maxInteractionMs = Math.max(maxInteractionMs, elapsedInteractionMs);
  record('interaction_latency', label, elapsedInteractionMs, undefined, detail);
  if (elapsedInteractionMs >= SLOW_INTERACTION_MS) {
    record('dropped_frame_risk', label, elapsedInteractionMs, undefined, 'interaction blocking');
  }
}

export function noteProductionNavigationLatency(routeName: string, elapsedNavigationMs: number): void {
  navigationTransitionCount += 1;
  maxInteractionMs = Math.max(maxInteractionMs, elapsedNavigationMs);
  record('navigation_latency', routeName, elapsedNavigationMs);
}

export function noteProductionMemoryProfile(label: string, value: number, detail?: string): void {
  memoryRetentionSamples += 1;
  maxMemoryRetentionValue = Math.max(maxMemoryRetentionValue, value);
  record('memory_retention', label, undefined, value, detail);
  if (value >= MEMORY_RETENTION_WARNING) {
    hiddenBackgroundRetentionEvents += 1;
  }
}

export function noteProductionAppStateProfile(nextState: AppStateStatus, transitionMs = 0): void {
  record('appstate_resume_timing', 'AppState', transitionMs, undefined, nextState);
  if (nextState === 'active') {
    resumeTimings += 1;
    if (lastBackgroundAt != null) {
      const wakeMs = Date.now() - lastBackgroundAt;
      if (wakeMs >= 600) {
        backgroundWakeLatencyEvents += 1;
        record('background_wake_latency', 'AppState', wakeMs);
      }
    }
    lastBackgroundAt = null;
  } else {
    lastBackgroundAt = Date.now();
  }
}

export function noteProductionReconnectLatency(label: string, latencyMs: number, detail?: string): void {
  reconnectLatencyEvents += 1;
  record('reconnect_latency', label, latencyMs, undefined, detail);
  if (latencyMs >= RECONNECT_SLOW_MS) {
    record('bridge_congestion_estimate', label, latencyMs, undefined, 'slow reconnect');
  }
}

export function noteProductionOfflineRecoveryLatency(label: string, latencyMs: number, detail?: string): void {
  offlineRecoveryLatencyEvents += 1;
  record('offline_recovery_latency', label, latencyMs, undefined, detail);
}

export function noteProductionBatterySaverSlowdown(label: string, value = 1): void {
  batterySaverSlowdownEvents += 1;
  record('battery_saver_slowdown', label, undefined, value);
}

export function noteProductionLongSessionDegradation(label: string, value: number, detail?: string): void {
  longSessionDegradationEvents += 1;
  record('long_session_degradation', label, undefined, value, detail);
}

function snapshotWindow(window: ProductionRuntimeWindowSnapshot['window'], durationMs: number): ProductionRuntimeWindowSnapshot {
  const nowElapsed = elapsedMs();
  const scoped = events.filter((event) => nowElapsed - event.elapsedMs <= durationMs);
  const peakDurationMs = scoped.reduce((max, event) => Math.max(max, event.durationMs ?? 0), 0);
  const frameDropHotspots = scoped
    .filter((event) => event.kind === 'dropped_frame_risk' || event.kind === 'frame_starvation')
    .map((event) => event.label)
    .slice(-8);
  const jsStallHotspots = scoped
    .filter((event) => event.kind === 'long_task' || event.kind === 'hermes_gc_pause_estimate')
    .map((event) => event.label)
    .slice(-8);
  const reconnectHotspots = scoped
    .filter((event) => event.kind === 'reconnect_latency' || event.kind === 'offline_recovery_latency')
    .map((event) => event.label)
    .slice(-8);
  return {
    window,
    eventCount: scoped.length,
    peakDurationMs,
    frameDropHotspots,
    jsStallHotspots,
    reconnectHotspots,
  };
}

function uniqueHotspots(kind: ProductionRuntimeProfileKind): string[] {
  return [...new Set(events.filter((event) => event.kind === kind).map((event) => event.label))].slice(-10);
}

export function getProductionRuntimeProfilingReport(): ProductionRuntimeProfilingReport {
  const frameStabilityScore = round(
    1 - Math.min(0.9, (droppedFrameRisks + frameStarvationEvents + renderBurstSpikes) / 90),
  );
  const jsThreadHealthScore = round(1 - Math.min(0.9, (longTaskCount + hermesGcPauseEstimates * 2) / 90));
  const interactionResponsivenessScore = round(
    1 - Math.min(0.9, uniqueHotspots('dropped_frame_risk').length / Math.max(12, interactionCount + 12)),
  );
  const hydrationBlockingScore = round(1 - Math.min(0.9, hydrationBlockingEvents / 40));
  const runtimeLatencyScore = round(
    1 - Math.min(0.9, (reconnectLatencyEvents + offlineRecoveryLatencyEvents + backgroundWakeLatencyEvents) / 80),
  );
  const memoryRetentionScore = round(1 - Math.min(0.9, hiddenBackgroundRetentionEvents / 40));
  const longSessionPerformanceScore = round(1 - Math.min(0.9, longSessionDegradationEvents / 40));

  return {
    runtimeProfilingReport: [...events],
    jsThreadReport: {
      eventLoopLagCount,
      longTaskCount,
      hermesGcPauseEstimates,
      maxJsBlockMs,
    },
    frameStabilityReport: {
      droppedFrameRisks,
      frameBudgetOverflows,
      renderBurstSpikes,
      frameStarvationEvents,
      maxCommitBlockingMs,
    },
    interactionLatencyReport: {
      interactionCount,
      navigationTransitionCount,
      maxInteractionMs,
      hotspots: uniqueHotspots('interaction_latency'),
    },
    memoryPressureReport: {
      memoryRetentionSamples,
      maxMemoryRetentionValue,
      hiddenBackgroundRetentionEvents,
    },
    androidRecoveryReport: {
      resumeTimings,
      backgroundWakeLatencyEvents,
      reconnectLatencyEvents,
      offlineRecoveryLatencyEvents,
      batterySaverSlowdownEvents,
    },
    expoRuntimeReport: {
      bridgeCongestionEstimates,
      hydrationBlockingEvents,
      longSessionDegradationEvents,
      rollingSnapshots: [
        snapshotWindow('5m', 5 * 60_000),
        snapshotWindow('30m', 30 * 60_000),
        snapshotWindow('1h', 60 * 60_000),
      ],
    },
    metrics: {
      frameStabilityScore,
      jsThreadHealthScore,
      interactionResponsivenessScore,
      hydrationBlockingScore,
      runtimeLatencyScore,
      memoryRetentionScore,
      longSessionPerformanceScore,
    },
  };
}

export function resetProductionRuntimeProfilerForTest(): void {
  events.length = 0;
  eventLoopLagCount = 0;
  longTaskCount = 0;
  hermesGcPauseEstimates = 0;
  maxJsBlockMs = 0;
  droppedFrameRisks = 0;
  frameBudgetOverflows = 0;
  renderBurstSpikes = 0;
  frameStarvationEvents = 0;
  maxCommitBlockingMs = 0;
  interactionCount = 0;
  navigationTransitionCount = 0;
  maxInteractionMs = 0;
  memoryRetentionSamples = 0;
  maxMemoryRetentionValue = 0;
  hiddenBackgroundRetentionEvents = 0;
  resumeTimings = 0;
  backgroundWakeLatencyEvents = 0;
  reconnectLatencyEvents = 0;
  offlineRecoveryLatencyEvents = 0;
  batterySaverSlowdownEvents = 0;
  bridgeCongestionEstimates = 0;
  hydrationBlockingEvents = 0;
  longSessionDegradationEvents = 0;
  lastBackgroundAt = null;
}
