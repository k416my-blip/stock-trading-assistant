import type { AppStateStatus } from 'react-native';
import { noteProductionLongSessionDegradation } from './productionRuntimeProfiler';

export type LongSessionReplayKind =
  | 'session_tick'
  | 'appstate_resume_replay'
  | 'reconnect_replay'
  | 'offline_online_replay'
  | 'hydration_replay'
  | 'governor_replay'
  | 'deferred_activation_replay'
  | 'retry_cascade_replay'
  | 'render_burst_replay'
  | 'js_stall_replay'
  | 'queue_congestion_replay'
  | 'stale_async_replay'
  | 'recovery_validation';

export type LongSessionReplayEvent = {
  at: string;
  elapsedMs: number;
  kind: LongSessionReplayKind;
  label: string;
  value?: number;
  detail?: string;
};

export type LongSessionValidationWindow = '30min' | '1h' | 'background' | 'low-memory' | 'battery-saver' | 'offline';

export type LongSessionRuntimeSoakReport = {
  soakTestReport: LongSessionReplayEvent[];
  replayDiagnosticsReport: LongSessionReplayEvent[];
  reconnectReplayReport: {
    reconnectBursts: number;
    retryCascadeReplays: number;
    staleAsyncReplays: number;
  };
  hydrationReplayReport: {
    hydrationReplays: number;
    hydrationStarvationCount: number;
    deferredQueueBuildupCount: number;
  };
  longSessionDriftReport: {
    sessionDurationMs: number;
    validationWindows: LongSessionValidationWindow[];
    jsThreadDegradationSamples: number;
    renderDriftSamples: number;
    timerDriftSamples: number;
    listenerResurrectionSamples: number;
  };
  recoveryStabilityReport: {
    resumeReplays: number;
    offlineOnlineReplays: number;
    recoveryValidations: number;
    screenInactiveRecoveries: number;
  };
  metrics: {
    longSessionStabilityScore: number;
    reconnectRecoveryScore: number;
    hydrationReplaySafetyScore: number;
    runtimeDriftContainmentScore: number;
    jsThreadStabilityScore: number;
    recoveryConsistencyScore: number;
  };
};

const MAX_EVENTS = 260;
const THIRTY_MINUTES_MS = 30 * 60_000;
const ONE_HOUR_MS = 60 * 60_000;
const JS_DEGRADATION_LAG_MS = 120;
const RENDER_DRIFT_MS = 64;
const HYDRATION_STARVATION_MS = 12_000;
const QUEUE_BUILDUP_THRESHOLD = 8;

const sessionStartedAt = Date.now();
const events: LongSessionReplayEvent[] = [];
const validationWindows = new Set<LongSessionValidationWindow>();
const hydrationStartedAt = new Map<string, number>();
const deferredQueueMarks = new Map<string, number>();

let reconnectBursts = 0;
let retryCascadeReplays = 0;
let staleAsyncReplays = 0;
let hydrationReplays = 0;
let hydrationStarvationCount = 0;
let deferredQueueBuildupCount = 0;
let jsThreadDegradationSamples = 0;
let renderDriftSamples = 0;
let timerDriftSamples = 0;
let listenerResurrectionSamples = 0;
let resumeReplays = 0;
let offlineOnlineReplays = 0;
let recoveryValidations = 0;
let screenInactiveRecoveries = 0;

function elapsedMs(): number {
  return Date.now() - sessionStartedAt;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function record(kind: LongSessionReplayKind, label: string, value?: number, detail?: string): void {
  const event = { at: new Date().toISOString(), elapsedMs: elapsedMs(), kind, label, value, detail };
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();
}

function refreshValidationWindows(): void {
  const duration = elapsedMs();
  if (duration >= THIRTY_MINUTES_MS) validationWindows.add('30min');
  if (duration >= ONE_HOUR_MS) validationWindows.add('1h');
}

export function noteLongSessionTick(label = 'long-session'): void {
  refreshValidationWindows();
  record('session_tick', label, elapsedMs());
}

export function noteLongSessionAppStateReplay(nextState: AppStateStatus): void {
  refreshValidationWindows();
  if (nextState === 'active') {
    resumeReplays += 1;
    validationWindows.add('background');
    record('appstate_resume_replay', 'AppState', resumeReplays, 'active');
    return;
  }
  screenInactiveRecoveries += 1;
  record('recovery_validation', 'screen-inactive', screenInactiveRecoveries, nextState);
}

export function noteLongSessionJsThreadSample(label: string, lagMs: number): void {
  refreshValidationWindows();
  if (lagMs >= JS_DEGRADATION_LAG_MS) {
    jsThreadDegradationSamples += 1;
    record('js_stall_replay', label, lagMs, 'long-session JS degradation sample');
    noteProductionLongSessionDegradation(label, lagMs, 'JS thread degradation');
  }
}

export function noteLongSessionRenderDrift(label: string, elapsedCommitMs: number): void {
  refreshValidationWindows();
  if (elapsedCommitMs >= RENDER_DRIFT_MS) {
    renderDriftSamples += 1;
    record('render_burst_replay', label, elapsedCommitMs, 'render drift sample');
    noteProductionLongSessionDegradation(label, elapsedCommitMs, 'render drift');
  }
}

export function noteLongSessionTimerDrift(label: string, activeTimers: number): void {
  refreshValidationWindows();
  if (activeTimers >= QUEUE_BUILDUP_THRESHOLD) {
    timerDriftSamples += 1;
    record('queue_congestion_replay', label, activeTimers, 'timer drift');
  }
}

export function noteLongSessionListenerResurrection(label: string, activeListeners: number): void {
  refreshValidationWindows();
  if (activeListeners >= 2) {
    listenerResurrectionSamples += 1;
    record('recovery_validation', label, activeListeners, 'listener resurrection check');
  }
}

export function noteLongSessionHydrationQueued(label: string, queueDepth: number): void {
  refreshValidationWindows();
  hydrationStartedAt.set(label, Date.now());
  deferredQueueMarks.set(label, queueDepth);
  if (queueDepth >= QUEUE_BUILDUP_THRESHOLD) {
    deferredQueueBuildupCount += 1;
    record('queue_congestion_replay', label, queueDepth, 'deferred queue buildup');
    noteProductionLongSessionDegradation(label, queueDepth, 'deferred queue buildup');
  }
}

export function noteLongSessionHydrationReplay(label: string, elapsedHydrationMs: number): void {
  refreshValidationWindows();
  hydrationReplays += 1;
  const startedAt = hydrationStartedAt.get(label);
  const retainedMs = startedAt ? Date.now() - startedAt : elapsedHydrationMs;
  if (retainedMs >= HYDRATION_STARVATION_MS) {
    hydrationStarvationCount += 1;
    record('hydration_replay', label, retainedMs, 'hydration starvation');
    noteProductionLongSessionDegradation(label, retainedMs, 'hydration starvation');
  } else {
    record('hydration_replay', label, elapsedHydrationMs);
  }
  hydrationStartedAt.delete(label);
  deferredQueueMarks.delete(label);
}

export function noteLongSessionDeferredActivationReplay(label: string, detail?: string): void {
  refreshValidationWindows();
  record('deferred_activation_replay', label, undefined, detail);
}

export function noteLongSessionGovernorReplay(label: string, detail?: string): void {
  refreshValidationWindows();
  record('governor_replay', label, undefined, detail);
}

export function noteLongSessionReconnectReplay(label: string, detail?: string): void {
  refreshValidationWindows();
  reconnectBursts += 1;
  record('reconnect_replay', label, reconnectBursts, detail);
}

export function noteLongSessionOfflineOnlineReplay(offline: boolean, label: string): void {
  refreshValidationWindows();
  offlineOnlineReplays += 1;
  if (offline) validationWindows.add('offline');
  record('offline_online_replay', label, offlineOnlineReplays, offline ? 'offline' : 'online');
}

export function noteLongSessionRetryReplay(label: string, retryDepth: number, detail?: string): void {
  refreshValidationWindows();
  if (retryDepth >= 4) {
    retryCascadeReplays += 1;
    record('retry_cascade_replay', label, retryDepth, detail);
  }
}

export function noteLongSessionStaleAsyncReplay(label: string, detail?: string): void {
  refreshValidationWindows();
  staleAsyncReplays += 1;
  record('stale_async_replay', label, staleAsyncReplays, detail);
}

export function noteLongSessionRecoveryValidation(label: string, window: LongSessionValidationWindow, detail?: string): void {
  refreshValidationWindows();
  validationWindows.add(window);
  recoveryValidations += 1;
  record('recovery_validation', label, recoveryValidations, detail ?? window);
}

export function getLongSessionRuntimeSoakReport(): LongSessionRuntimeSoakReport {
  refreshValidationWindows();
  const sessionDurationMs = elapsedMs();
  const driftTotal =
    jsThreadDegradationSamples +
    renderDriftSamples +
    timerDriftSamples +
    listenerResurrectionSamples +
    deferredQueueBuildupCount;
  const longSessionStabilityScore = round(1 - Math.min(0.9, driftTotal / 80));
  const reconnectRecoveryScore = round(
    1 - Math.min(0.9, (reconnectBursts + retryCascadeReplays) / Math.max(10, recoveryValidations + 10)),
  );
  const hydrationReplaySafetyScore = round(
    1 - Math.min(0.9, (hydrationStarvationCount + deferredQueueBuildupCount) / Math.max(10, hydrationReplays + 10)),
  );
  const runtimeDriftContainmentScore = round(1 - Math.min(0.9, driftTotal / Math.max(20, events.length + 20)));
  const jsThreadStabilityScore = round(1 - Math.min(0.9, jsThreadDegradationSamples / 30));
  const recoveryConsistencyScore = round(
    1 - Math.min(0.9, staleAsyncReplays / Math.max(10, resumeReplays + offlineOnlineReplays + recoveryValidations + 10)),
  );

  return {
    soakTestReport: [...events],
    replayDiagnosticsReport: events.filter((event) => event.kind.endsWith('_replay')),
    reconnectReplayReport: {
      reconnectBursts,
      retryCascadeReplays,
      staleAsyncReplays,
    },
    hydrationReplayReport: {
      hydrationReplays,
      hydrationStarvationCount,
      deferredQueueBuildupCount,
    },
    longSessionDriftReport: {
      sessionDurationMs,
      validationWindows: [...validationWindows],
      jsThreadDegradationSamples,
      renderDriftSamples,
      timerDriftSamples,
      listenerResurrectionSamples,
    },
    recoveryStabilityReport: {
      resumeReplays,
      offlineOnlineReplays,
      recoveryValidations,
      screenInactiveRecoveries,
    },
    metrics: {
      longSessionStabilityScore,
      reconnectRecoveryScore,
      hydrationReplaySafetyScore,
      runtimeDriftContainmentScore,
      jsThreadStabilityScore,
      recoveryConsistencyScore,
    },
  };
}

export function resetLongSessionRuntimeSoakForTest(): void {
  events.length = 0;
  validationWindows.clear();
  hydrationStartedAt.clear();
  deferredQueueMarks.clear();
  reconnectBursts = 0;
  retryCascadeReplays = 0;
  staleAsyncReplays = 0;
  hydrationReplays = 0;
  hydrationStarvationCount = 0;
  deferredQueueBuildupCount = 0;
  jsThreadDegradationSamples = 0;
  renderDriftSamples = 0;
  timerDriftSamples = 0;
  listenerResurrectionSamples = 0;
  resumeReplays = 0;
  offlineOnlineReplays = 0;
  recoveryValidations = 0;
  screenInactiveRecoveries = 0;
}
