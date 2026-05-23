import { JS_TIMER_COALESCE_MS } from '../../constants/jsThreadSchedulerStabilization';

type Pending = { fn: () => void; at: number };

const pending = new Map<string, Pending>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function resetTimerCoalescingForTest(): void {
  pending.clear();
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
}

export function scheduleCoalescedTimer(key: string, fn: () => void, delayMs = JS_TIMER_COALESCE_MS): void {
  pending.set(key, { fn, at: Date.now() + delayMs });
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const now = Date.now();
    for (const [k, p] of [...pending.entries()]) {
      if (p.at <= now) {
        pending.delete(k);
        try {
          p.fn();
        } catch {
          /* stabilization path only */
        }
      }
    }
  }, JS_TIMER_COALESCE_MS);
}
