import { COOPERATIVE_YIELD_MS } from '../constants/asyncRuntimeCoordinator';

type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };

function runIdleCallback(cb: (deadline: IdleDeadline) => void, timeoutMs: number): void {
  const g = globalThis as {
    requestIdleCallback?: (fn: (d: IdleDeadline) => void, opts?: { timeout: number }) => number;
  };
  if (typeof g.requestIdleCallback === 'function') {
    g.requestIdleCallback(cb, { timeout: timeoutMs });
    return;
  }
  setTimeout(() => {
    const start = Date.now();
    cb({
      didTimeout: true,
      timeRemaining: () => Math.max(0, timeoutMs - (Date.now() - start)),
    });
  }, COOPERATIVE_YIELD_MS);
}

/** Yields to the event loop — use in long orchestration / explanation paths. */
export function cooperativeYield(timeoutMs = 16): Promise<void> {
  return new Promise((resolve) => {
    runIdleCallback(() => resolve(), timeoutMs);
  });
}

export async function cooperativeYieldLoop(steps: number): Promise<void> {
  for (let i = 0; i < steps; i++) {
    await cooperativeYield();
  }
}
