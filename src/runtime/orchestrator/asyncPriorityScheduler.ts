/**
 * Priority-based async scheduler — starvation prevention, aging, cancellation, dynamic concurrency.
 */
import {
  getAsyncConcurrentLimit,
  getCoordinatorQueueDepth,
  setAsyncConcurrentLimit,
} from '../../services/asyncRuntimeCoordinator';
import type { RuntimeOrchestratorPolicy } from '../../types/runtimeOrchestrator';
import { shouldOrchestratorAllowLowPriorityAsync } from './runtimeOrchestrator';

export type AsyncPriority = 'critical' | 'high' | 'normal' | 'low' | 'idle';

type ScheduledTask = {
  id: string;
  priority: AsyncPriority;
  label: string;
  fn: () => Promise<void>;
  enqueuedAt: number;
  cancelToken: { cancelled: boolean };
};

const PRIORITY_RANK: Record<AsyncPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  idle: 4,
};

const state = {
  queue: [] as ScheduledTask[],
  running: 0,
  taskSeq: 0,
  lastPolicy: null as RuntimeOrchestratorPolicy | null,
};

let drainScheduled = false;

export function resetAsyncPrioritySchedulerForTest(): void {
  state.queue = [];
  state.running = 0;
  state.taskSeq = 0;
  state.lastPolicy = null;
  drainScheduled = false;
}

export function createAsyncCancellationToken(): { cancelled: boolean } {
  return { cancelled: false };
}

export function cancelAsyncTasksByLabel(prefix: string): number {
  let n = 0;
  for (const t of state.queue) {
    if (t.label.startsWith(prefix)) {
      t.cancelToken.cancelled = true;
      n += 1;
    }
  }
  return n;
}

export function applyAsyncSchedulerPolicy(policy: RuntimeOrchestratorPolicy): void {
  state.lastPolicy = policy;
  let concurrency = 2;
  if (policy.pauseNonessentialRenderLoop) concurrency = 1;
  else if (policy.suspendLowPriorityAsync) concurrency = 1;
  if (policy.queueHardLimit != null && policy.queueHardLimit <= 20) concurrency = 1;
  setAsyncConcurrentLimit(concurrency);

  if (!shouldOrchestratorAllowLowPriorityAsync()) {
    state.queue = state.queue.filter(
      (t) => t.priority === 'critical' || t.priority === 'high' || t.priority === 'normal',
    );
  }
  if (policy.queueHardLimit != null && state.queue.length > policy.queueHardLimit) {
    const sorted = [...state.queue].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    state.queue = sorted.slice(0, policy.queueHardLimit);
  }
}

export function enqueuePriorityTask(
  priority: AsyncPriority,
  label: string,
  fn: () => Promise<void>,
  token?: { cancelled: boolean },
): boolean {
  if (priority === 'low' || priority === 'idle') {
    if (!shouldOrchestratorAllowLowPriorityAsync()) return false;
  }

  state.taskSeq += 1;
  state.queue.push({
    id: `prio-${state.taskSeq}`,
    priority,
    label,
    fn,
    enqueuedAt: Date.now(),
    cancelToken: token ?? createAsyncCancellationToken(),
  });
  scheduleDrain();
  return true;
}

function compareTasks(a: ScheduledTask, b: ScheduledTask): number {
  const pa = PRIORITY_RANK[a.priority];
  const pb = PRIORITY_RANK[b.priority];
  if (pa !== pb) return pa - pb;
  const ageA = Date.now() - a.enqueuedAt;
  const ageB = Date.now() - b.enqueuedAt;
  if (ageA > 12_000 && ageB <= 12_000) return -1;
  if (ageB > 12_000 && ageA <= 12_000) return 1;
  return a.enqueuedAt - b.enqueuedAt;
}

async function drain(): Promise<void> {
  drainScheduled = false;
  const limit = getAsyncConcurrentLimit();
  while (state.running < limit && state.queue.length > 0) {
    state.queue.sort(compareTasks);
    const task = state.queue.shift();
    if (!task || task.cancelToken.cancelled) continue;
    state.running += 1;
    try {
      await task.fn();
    } finally {
      state.running -= 1;
    }
  }
  if (state.queue.length > 0 && state.running < limit) scheduleDrain();
}

function scheduleDrain(): void {
  if (drainScheduled) return;
  drainScheduled = true;
  setTimeout(() => {
    void drain();
  }, 0);
}

export function getPrioritySchedulerDepth(): number {
  return state.queue.length + state.running + getCoordinatorQueueDepth();
}

export function compactStalePriorityQueue(maxAgeMs = 60_000): number {
  const before = state.queue.length;
  const now = Date.now();
  state.queue = state.queue.filter(
    (t) => now - t.enqueuedAt < maxAgeMs || t.priority === 'critical' || t.priority === 'high',
  );
  return before - state.queue.length;
}
