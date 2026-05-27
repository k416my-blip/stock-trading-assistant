import type { AppStateStatus } from 'react-native';
import {
  noteProductionAppStateProfile,
  noteProductionFrameProfile,
  noteProductionHydrationProfile,
  noteProductionInteractionProfile,
  noteProductionJsTiming,
  noteProductionTimerDrift,
} from './productionRuntimeProfiler';

export type FrameTelemetryEventKind =
  | 'event_loop_lag'
  | 'long_task'
  | 'render_timing'
  | 'render_burst_timing'
  | 'hydration_timing'
  | 'interaction_latency'
  | 'frame_risk'
  | 'app_state_timing'
  | 'resume_spike'
  | 'timer_accumulation'
  | 'listener_burst';

export type FrameTelemetryEvent = {
  at: string;
  kind: FrameTelemetryEventKind;
  label: string;
  durationMs?: number;
  value?: number;
  detail?: string;
};

export type RuntimeFrameTelemetryReport = {
  frameStallReport: FrameTelemetryEvent[];
  renderTimingReport: {
    renderCommitCount: number;
    commitSpikeCount: number;
    renderBurstCount: number;
    maxCommitMs: number;
  };
  interactionLatencyReport: {
    interactionCount: number;
    slowInteractionCount: number;
    maxInteractionMs: number;
  };
  hydrationTimingReport: {
    hydrationCount: number;
    hydrationBlockingCount: number;
    maxHydrationMs: number;
  };
  mobileFramePressureReport: {
    eventLoopLagCount: number;
    longTaskCount: number;
    resumeSpikeCount: number;
    timerAccumulationCount: number;
    listenerBurstCount: number;
  };
  metrics: {
    jsThreadHealthScore: number;
    renderBurstScore: number;
    hydrationFramePressureScore: number;
    interactionLatencyScore: number;
    mobileFrameSafetyScore: number;
    expoRuntimeResponsivenessScore: number;
  };
};

const MAX_EVENTS = 220;
const LONG_TASK_MS = 80;
const COMMIT_SPIKE_MS = 48;
const HYDRATION_BLOCK_MS = 120;
const SLOW_INTERACTION_MS = 180;
const RESUME_SPIKE_MS = 600;
const BURST_WINDOW_MS = 1_000;
const BURST_THRESHOLD = 8;

const events: FrameTelemetryEvent[] = [];
const renderMarks = new Map<string, number[]>();

let renderCommitCount = 0;
let commitSpikeCount = 0;
let renderBurstCount = 0;
let maxCommitMs = 0;
let hydrationCount = 0;
let hydrationBlockingCount = 0;
let maxHydrationMs = 0;
let interactionCount = 0;
let slowInteractionCount = 0;
let maxInteractionMs = 0;
let eventLoopLagCount = 0;
let longTaskCount = 0;
let resumeSpikeCount = 0;
let timerAccumulationCount = 0;
let listenerBurstCount = 0;
let lastBackgroundAt: number | null = null;

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function record(
  kind: FrameTelemetryEventKind,
  label: string,
  durationMs?: number,
  value?: number,
  detail?: string,
): void {
  events.push({ at: new Date().toISOString(), kind, label, durationMs, value, detail });
  if (events.length > MAX_EVENTS) events.shift();
}

export function noteEventLoopLag(label: string, lagMs: number): void {
  if (lagMs <= 0) return;
  eventLoopLagCount += 1;
  record('event_loop_lag', label, lagMs);
  noteProductionJsTiming(label, lagMs);
  if (lagMs >= LONG_TASK_MS) {
    longTaskCount += 1;
    record('long_task', label, lagMs);
  }
}

export function noteRenderTiming(label: string, commitMs: number): void {
  renderCommitCount += 1;
  maxCommitMs = Math.max(maxCommitMs, commitMs);
  record('render_timing', label, commitMs);
  noteProductionFrameProfile(label, commitMs);
  if (commitMs >= COMMIT_SPIKE_MS) {
    commitSpikeCount += 1;
    record('frame_risk', label, commitMs, undefined, 'commit spike');
  }

  const now = Date.now();
  const recent = (renderMarks.get(label) ?? []).filter((at) => now - at <= BURST_WINDOW_MS);
  recent.push(now);
  renderMarks.set(label, recent);
  if (recent.length === BURST_THRESHOLD) {
    renderBurstCount += 1;
    record('render_burst_timing', label, undefined, recent.length);
    noteProductionFrameProfile(label, commitMs, recent.length);
  }
}

export function noteHydrationTiming(label: string, elapsedMs: number): void {
  hydrationCount += 1;
  maxHydrationMs = Math.max(maxHydrationMs, elapsedMs);
  record('hydration_timing', label, elapsedMs);
  noteProductionHydrationProfile(label, elapsedMs);
  if (elapsedMs >= HYDRATION_BLOCK_MS) {
    hydrationBlockingCount += 1;
    record('frame_risk', label, elapsedMs, undefined, 'hydration blocking risk');
  }
}

export function noteInteractionLatency(label: string, elapsedMs: number, detail?: string): void {
  interactionCount += 1;
  maxInteractionMs = Math.max(maxInteractionMs, elapsedMs);
  record('interaction_latency', label, elapsedMs, undefined, detail);
  noteProductionInteractionProfile(label, elapsedMs, detail);
  if (elapsedMs >= SLOW_INTERACTION_MS) {
    slowInteractionCount += 1;
    record('frame_risk', label, elapsedMs, undefined, 'slow interaction');
  }
}

export function noteAppStateFrameTiming(nextState: AppStateStatus, transitionMs = 0): void {
  record('app_state_timing', 'AppState', transitionMs, undefined, nextState);
  noteProductionAppStateProfile(nextState, transitionMs);
  if (nextState === 'active' && lastBackgroundAt != null) {
    const resumeMs = Date.now() - lastBackgroundAt;
    if (resumeMs >= RESUME_SPIKE_MS) {
      resumeSpikeCount += 1;
      record('resume_spike', 'AppState', resumeMs);
    }
    lastBackgroundAt = null;
  } else if (nextState !== 'active') {
    lastBackgroundAt = Date.now();
  }
}

export function noteTimerAccumulation(label: string, activeTimers: number): void {
  if (activeTimers < 12) return;
  timerAccumulationCount += 1;
  record('timer_accumulation', label, undefined, activeTimers);
  noteProductionTimerDrift(label, activeTimers);
}

export function noteListenerBurst(label: string, activeListeners: number): void {
  if (activeListeners < 6) return;
  listenerBurstCount += 1;
  record('listener_burst', label, undefined, activeListeners);
}

export function getRuntimeFrameTelemetryReport(): RuntimeFrameTelemetryReport {
  const jsThreadHealthScore = round(1 - Math.min(0.9, (eventLoopLagCount + longTaskCount * 2) / 80));
  const renderBurstScore = round(1 - Math.min(0.9, (renderBurstCount + commitSpikeCount) / 80));
  const hydrationFramePressureScore = round(1 - Math.min(0.9, hydrationBlockingCount / Math.max(1, hydrationCount + 10)));
  const interactionLatencyScore = round(1 - Math.min(0.9, slowInteractionCount / Math.max(1, interactionCount + 10)));
  const mobileFrameSafetyScore = round(
    1 -
      Math.min(
        0.9,
        (resumeSpikeCount + timerAccumulationCount + listenerBurstCount + longTaskCount) / 100,
      ),
  );
  const expoRuntimeResponsivenessScore = round(
    (jsThreadHealthScore +
      renderBurstScore +
      hydrationFramePressureScore +
      interactionLatencyScore +
      mobileFrameSafetyScore) /
      5,
  );

  return {
    frameStallReport: [...events],
    renderTimingReport: {
      renderCommitCount,
      commitSpikeCount,
      renderBurstCount,
      maxCommitMs,
    },
    interactionLatencyReport: {
      interactionCount,
      slowInteractionCount,
      maxInteractionMs,
    },
    hydrationTimingReport: {
      hydrationCount,
      hydrationBlockingCount,
      maxHydrationMs,
    },
    mobileFramePressureReport: {
      eventLoopLagCount,
      longTaskCount,
      resumeSpikeCount,
      timerAccumulationCount,
      listenerBurstCount,
    },
    metrics: {
      jsThreadHealthScore,
      renderBurstScore,
      hydrationFramePressureScore,
      interactionLatencyScore,
      mobileFrameSafetyScore,
      expoRuntimeResponsivenessScore,
    },
  };
}

export function resetRuntimeFrameTelemetryForTest(): void {
  events.length = 0;
  renderMarks.clear();
  renderCommitCount = 0;
  commitSpikeCount = 0;
  renderBurstCount = 0;
  maxCommitMs = 0;
  hydrationCount = 0;
  hydrationBlockingCount = 0;
  maxHydrationMs = 0;
  interactionCount = 0;
  slowInteractionCount = 0;
  maxInteractionMs = 0;
  eventLoopLagCount = 0;
  longTaskCount = 0;
  resumeSpikeCount = 0;
  timerAccumulationCount = 0;
  listenerBurstCount = 0;
  lastBackgroundAt = null;
}
