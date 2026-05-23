let offsetMs = 0;
let lastPerf = 0;

export function resetMonotonicClockReconciliationForTest(): void {
  offsetMs = 0;
  lastPerf = 0;
}

export function reconcileMonotonicNow(): number {
  const perf =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  if (lastPerf > 0) {
    const wallDelta = Date.now() - (lastPerf + offsetMs);
    const perfDelta = perf - lastPerf;
    const skew = wallDelta - perfDelta;
    if (Math.abs(skew) > 50) offsetMs += skew * 0.25;
  }
  lastPerf = perf;
  return Date.now() - offsetMs;
}

export function getTimerSkewMs(): number {
  return Math.abs(offsetMs);
}
