import { JS_TASK_BUDGET_MS } from '../../constants/jsThreadSchedulerStabilization';

let spentMs = 0;
let windowStart = Date.now();

export function resetJsTaskBudgetAllocatorForTest(): void {
  spentMs = 0;
  windowStart = Date.now();
}

export function allocateTaskBudget(requestedMs: number, now = Date.now()): number {
  if (now - windowStart > 1_000) {
    spentMs = 0;
    windowStart = now;
  }
  const remaining = Math.max(0, JS_TASK_BUDGET_MS - spentMs);
  const grant = Math.min(requestedMs, remaining);
  spentMs += grant;
  return grant;
}

export function hasTaskBudget(now = Date.now()): boolean {
  if (now - windowStart > 1_000) return true;
  return spentMs < JS_TASK_BUDGET_MS;
}
