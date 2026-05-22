import { ASYNC_BUDGET_PER_SECOND } from '../constants/asyncRuntimeCoordinator';
import type { AsyncTaskKind } from '../types/asyncRuntimeCoordinator';

type BudgetDecision = 'allow' | 'defer' | 'coalesce' | 'merge' | 'idle_schedule';

const windowTimestamps = new Map<AsyncTaskKind, number[]>();
const coalescePending = new Set<AsyncTaskKind>();

export function resetAsyncBudgetForTest(): void {
  windowTimestamps.clear();
  coalescePending.clear();
}

function prune(kind: AsyncTaskKind, now: number): number[] {
  const kept = (windowTimestamps.get(kind) ?? []).filter((t) => now - t < 1000);
  windowTimestamps.set(kind, kept);
  return kept;
}

export function getAsyncBudgetCount(kind: AsyncTaskKind): number {
  return prune(kind, Date.now()).length;
}

export function resolveAsyncBudgetDecision(kind: AsyncTaskKind): BudgetDecision {
  const max = ASYNC_BUDGET_PER_SECOND[kind];
  if (getAsyncBudgetCount(kind) < max) {
    const now = Date.now();
    const kept = prune(kind, now);
    kept.push(now);
    windowTimestamps.set(kind, kept);
    return 'allow';
  }
  if (kind === 'orchestration' || kind === 'memory_graph') return 'defer';
  if (kind === 'dashboard' || kind === 'metrics') return 'coalesce';
  if (kind === 'explanation') return 'merge';
  if (kind === 'websocket' || kind === 'hydration') return 'idle_schedule';
  return 'defer';
}

export function markAsyncCoalesced(kind: AsyncTaskKind): void {
  coalescePending.add(kind);
}

export function consumeCoalescePending(kind: AsyncTaskKind): boolean {
  if (!coalescePending.has(kind)) return false;
  coalescePending.delete(kind);
  return true;
}
