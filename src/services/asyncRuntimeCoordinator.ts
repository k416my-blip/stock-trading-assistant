/**
 * Async Runtime Orchestration Coordinator — burst suppression, concurrency, cooperative yielding.
 */
import { RUNTIME_KERNEL_OWNS_POLICY } from '../constants/runtimeKernel';
import {
  ASYNC_BURST_WINDOW_MS,
  ASYNC_CONCURRENT_LIMIT,
  ASYNC_MAX_BURST_PER_WINDOW,
  ASYNC_QUEUE_AGING_MS,
  ASYNC_STARVATION_BOOST_MS,
  EVENTLOOP_STATE_LABELS_JA,
  QUEUE_PRIORITY,
} from '../constants/asyncRuntimeCoordinator';
import type {
  AsyncRuntimeEvaluation,
  AsyncTaskKind,
  AsyncTaskQueue,
  EvaluateAsyncRuntimeInput,
} from '../types/asyncRuntimeCoordinator';
import { resolveAsyncBudgetDecision } from './asyncBudgetSystem';
import { cooperativeYield } from './cooperativeYield';
import {
  getDashboardMaxFps,
  getMetricsSamplingRate,
  setDashboardCompactMode,
  shouldEmitDashboardFrame,
} from './dashboardFrameStabilizer';
import { evaluateEventLoopPressure } from './eventLoopPressureMonitor';
import {
  getHydrationCollisionRiskPct,
  isOrchestrationPausedForHydration,
} from './hydrationCollisionGuard';
import { resolveLongSessionAsyncPolicy } from './longSessionAsyncStability';
import {
  applyBatterySaverGuard,
  applyThermalThrottlingGuard,
  isPostResumeLightweightWindow,
  isAsyncResumeCooldownActive,
} from './redmiSchedulerGuard';
import {
  getWebsocketFrameDelayMs,
  setWebsocketLightweightMode,
} from './websocketStabilityGuard';

type QueuedTask = {
  id: string;
  kind: AsyncTaskKind;
  queue: AsyncTaskQueue;
  label: string;
  fn: () => Promise<void>;
  enqueuedAt: number;
};

const state = {
  queue: [] as QueuedTask[],
  running: 0,
  burstTimestamps: [] as number[],
  microtaskBurst: 0,
  lastTaskLatencyMs: 0,
  lastEvaluation: null as AsyncRuntimeEvaluation | null,
  taskIdSeq: 0,
};

let concurrentLimitOverride: number | null = null;
let drainScheduled = false;

export function setAsyncConcurrentLimit(limit: number): void {
  concurrentLimitOverride = Math.max(1, Math.min(4, Math.round(limit)));
}

export function getAsyncConcurrentLimit(): number {
  return concurrentLimitOverride ?? ASYNC_CONCURRENT_LIMIT;
}

export function resetAsyncRuntimeCoordinatorForTest(): void {
  state.queue = [];
  state.running = 0;
  state.burstTimestamps = [];
  state.microtaskBurst = 0;
  state.lastTaskLatencyMs = 0;
  state.lastEvaluation = null;
  state.taskIdSeq = 0;
  drainScheduled = false;
  concurrentLimitOverride = null;
}

export function getCoordinatorQueueDepth(): number {
  return state.queue.length + state.running;
}

export function getLastTaskLatencyMs(): number {
  return state.lastTaskLatencyMs;
}

export function getMicrotaskBurstCount(): number {
  return state.microtaskBurst;
}

/** Lightweight metrics snapshot before full async evaluation (telemetry tuning). */
export function buildAsyncMetricsProbe(input: {
  queueSize: number;
  cascadePressure: number;
}): import('../types/asyncRuntimeCoordinator').AsyncRuntimeMetricsSnapshot {
  const depth = getCoordinatorQueueDepth();
  const latency = getLastTaskLatencyMs();
  const pressure = Math.min(
    100,
    Math.round(depth * 1.2 + input.cascadePressure * 0.35 + state.microtaskBurst * 3),
  );
  let eventLoopState: import('../types/asyncRuntimeCoordinator').EventLoopState = 'EVENTLOOP_OK';
  if (pressure >= 82) eventLoopState = 'EVENTLOOP_CRITICAL';
  else if (pressure >= 62) eventLoopState = 'EVENTLOOP_SATURATED';
  else if (pressure >= 42) eventLoopState = 'EVENTLOOP_BUSY';
  return {
    eventLoopPressure: pressure,
    microtaskBurstRisk: Math.min(100, state.microtaskBurst * 5),
    renderBlockRisk: Math.min(100, Math.round(input.queueSize * 0.4)),
    asyncQueueDepth: depth,
    taskExecutionLatencyMs: latency,
    websocketFrameDelayMs: getWebsocketFrameDelayMs(),
    hydrationCollisionRisk: 0,
    eventLoopState,
    measuredAt: new Date().toISOString(),
  };
}

function noteBurst(): boolean {
  const now = Date.now();
  state.burstTimestamps = state.burstTimestamps.filter((t) => now - t < ASYNC_BURST_WINDOW_MS);
  state.burstTimestamps.push(now);
  state.microtaskBurst = state.burstTimestamps.length;
  return state.burstTimestamps.length <= ASYNC_MAX_BURST_PER_WINDOW;
}

function compareTasks(a: QueuedTask, b: QueuedTask): number {
  const pa = QUEUE_PRIORITY[a.queue];
  const pb = QUEUE_PRIORITY[b.queue];
  if (pa !== pb) return pa - pb;
  const ageA = Date.now() - a.enqueuedAt;
  const ageB = Date.now() - b.enqueuedAt;
  if (ageA > ASYNC_QUEUE_AGING_MS && ageB <= ASYNC_QUEUE_AGING_MS) return -1;
  if (ageB > ASYNC_QUEUE_AGING_MS && ageA <= ASYNC_QUEUE_AGING_MS) return 1;
  if (ageA > ASYNC_STARVATION_BOOST_MS) return -1;
  if (ageB > ASYNC_STARVATION_BOOST_MS) return 1;
  return a.enqueuedAt - b.enqueuedAt;
}

async function drainQueue(): Promise<void> {
  drainScheduled = false;
  while (state.running < getAsyncConcurrentLimit() && state.queue.length > 0) {
    if (!noteBurst()) {
      await cooperativeYield(32);
      continue;
    }
    state.queue.sort(compareTasks);
    const task = state.queue.shift();
    if (!task) break;

    const budget = resolveAsyncBudgetDecision(task.kind);
    if (budget === 'defer' || budget === 'idle_schedule') {
      if (task.queue !== 'HIGH') {
        state.queue.push(task);
        await cooperativeYield(16);
        continue;
      }
    }

    state.running += 1;
    const started = Date.now();
    try {
      await task.fn();
      await cooperativeYield();
    } finally {
      state.lastTaskLatencyMs = Date.now() - started;
      state.running -= 1;
    }
  }
  if (state.queue.length > 0 && state.running < getAsyncConcurrentLimit()) {
    scheduleDrain();
  }
}

function scheduleDrain(): void {
  if (drainScheduled) return;
  drainScheduled = true;
  setTimeout(() => {
    void drainQueue();
  }, 0);
}

export function enqueueAsyncTask(
  kind: AsyncTaskKind,
  queue: AsyncTaskQueue,
  label: string,
  fn: () => Promise<void>,
): void {
  if (queue === 'IDLE_ONLY' && typeof requestAnimationFrame === 'undefined') {
    setTimeout(fn, 50);
    return;
  }
  state.taskIdSeq += 1;
  state.queue.push({
    id: `async-${state.taskIdSeq}`,
    kind,
    queue,
    label,
    fn,
    enqueuedAt: Date.now(),
  });
  scheduleDrain();
}

export async function runCoordinatedTask<T>(
  kind: AsyncTaskKind,
  queue: AsyncTaskQueue,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    enqueueAsyncTask(kind, queue, label, async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function shouldDeferAsyncWork(kind: AsyncTaskKind): boolean {
  const decision = resolveAsyncBudgetDecision(kind);
  return decision === 'defer' || decision === 'merge' || decision === 'coalesce';
}

export function evaluateAsyncRuntime(input: EvaluateAsyncRuntimeInput): AsyncRuntimeEvaluation {
  const longPolicy = resolveLongSessionAsyncPolicy();
  const cascadeCompact = input.cascadePressure >= 58;
  const compact =
    cascadeCompact ||
    longPolicy.dashboardMinimalRefresh ||
    isPostResumeLightweightWindow();

  if (!RUNTIME_KERNEL_OWNS_POLICY) {
    setDashboardCompactMode(compact);
    setWebsocketLightweightMode(
      compact || input.batterySaver || input.cascadePressure >= 78,
    );
  }

  applyBatterySaverGuard(input.batterySaver);
  applyThermalThrottlingGuard(input.cascadePressure > 70 ? 72 : 0);

  const metrics = evaluateEventLoopPressure({
    ...input,
    asyncQueueDepth: getCoordinatorQueueDepth(),
    taskExecutionLatencyMs: getLastTaskLatencyMs(),
    microtaskBurstCount: getMicrotaskBurstCount(),
    websocketFrameDelayMs: getWebsocketFrameDelayMs(),
    hydrationCollisionRisk: getHydrationCollisionRiskPct(
      input.queueSize,
      isAsyncResumeCooldownActive(),
    ),
  });

  if (longPolicy.pruneLowPriorityQueue) {
    state.queue = state.queue.filter((t) => t.queue === 'HIGH' || t.queue === 'NORMAL');
  }
  if (longPolicy.cancelIdleOnly) {
    state.queue = state.queue.filter((t) => t.queue !== 'IDLE_ONLY');
  }

  const evaluation: AsyncRuntimeEvaluation = {
    state: metrics.eventLoopState,
    stateLabelJa: EVENTLOOP_STATE_LABELS_JA[metrics.eventLoopState],
    metrics,
    summaryJa: [
      EVENTLOOP_STATE_LABELS_JA[metrics.eventLoopState],
      `queue ${metrics.asyncQueueDepth} · latency ${metrics.taskExecutionLatencyMs}ms`,
      compact ? 'compact dashboard' : 'full dashboard',
    ].join(' · '),
    compactDashboardMode: compact,
    maxDashboardFps: getDashboardMaxFps(),
    websocketLightweight: compact || input.batterySaver,
    hydrationPaused: isOrchestrationPausedForHydration(),
    deferHeavyTasks:
      metrics.eventLoopState === 'EVENTLOOP_SATURATED' ||
      metrics.eventLoopState === 'EVENTLOOP_CRITICAL' ||
      longPolicy.orchestrationSimplified,
  };

  state.lastEvaluation = evaluation;
  return evaluation;
}

export function getLastAsyncRuntimeEvaluation(): AsyncRuntimeEvaluation | null {
  return state.lastEvaluation;
}

export function shouldAllowDashboardRender(): boolean {
  const ev = state.lastEvaluation;
  if (ev?.compactDashboardMode && !shouldEmitDashboardFrame()) return false;
  if (getMetricsSamplingRate() < 1 && Math.random() > getMetricsSamplingRate()) return false;
  return true;
}

export { cooperativeYield };
