let idleBudgetUsed = 0;
let idleBudgetMax = 8;

export function resetIdleCallbackSchedulingForTest(): void {
  idleBudgetUsed = 0;
  idleBudgetMax = 8;
}

export function runIdleWork(fn: () => void, budgetMs = 6): boolean {
  if (idleBudgetUsed >= idleBudgetMax) return false;
  const g = globalThis as {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  };
  const run = () => {
    idleBudgetUsed += 1;
    const start = Date.now();
    fn();
    if (Date.now() - start > budgetMs) idleBudgetMax = Math.max(2, idleBudgetMax - 1);
  };
  if (typeof g.requestIdleCallback === 'function') {
    g.requestIdleCallback(run, { timeout: budgetMs + 4 });
    return true;
  }
  setTimeout(run, 0);
  return true;
}

export function getIdleBudgetUsage(): number {
  return idleBudgetMax > 0 ? Math.min(1, idleBudgetUsed / idleBudgetMax) : 0;
}

export function resetIdleBudgetWindow(): void {
  idleBudgetUsed = 0;
}
