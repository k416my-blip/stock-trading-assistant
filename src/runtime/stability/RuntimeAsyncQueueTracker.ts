type TaskSample = { at: number; durationMs: number };

let queuedEstimate = 0;
let executorLagMs = 0;
let unresolvedEstimate = 0;
let longTaskMs = 0;
const recentTasks: TaskSample[] = [];

export function resetRuntimeAsyncQueueTrackerForTest(): void {
  queuedEstimate = 0;
  executorLagMs = 0;
  unresolvedEstimate = 0;
  longTaskMs = 0;
  recentTasks.length = 0;
}

export function observeAsyncQueue(
  queueDepth: number,
  queueLagMs: number,
  taskDurationMs = 0,
  at = Date.now(),
): void {
  queuedEstimate = queueDepth;
  executorLagMs = queueLagMs;
  if (taskDurationMs > longTaskMs) longTaskMs = taskDurationMs;
  if (taskDurationMs > 400) {
    recentTasks.push({ at, durationMs: taskDurationMs });
    if (recentTasks.length > 32) recentTasks.shift();
  }
  unresolvedEstimate = Math.min(99, Math.round(queueDepth * 0.35 + (queueLagMs > 200 ? 8 : 0)));
}

export function getAsyncQueueMetrics(): {
  queuedTaskCount: number;
  executorLagMs: number;
  unresolvedPromiseEstimate: number;
  longTaskDurationMs: number;
} {
  return {
    queuedTaskCount: queuedEstimate,
    executorLagMs,
    unresolvedPromiseEstimate: unresolvedEstimate,
    longTaskDurationMs: longTaskMs,
  };
}

export function isAsyncStarvation(queueThreshold: number, lagThresholdMs: number): boolean {
  return queuedEstimate >= queueThreshold || executorLagMs >= lagThresholdMs;
}
