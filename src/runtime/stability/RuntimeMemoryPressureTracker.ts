let memoryWarning = false;
let lastWarningAt = 0;
let peakTrendPct = 0;

export function resetRuntimeMemoryPressureTrackerForTest(): void {
  memoryWarning = false;
  lastWarningAt = 0;
  peakTrendPct = 0;
}

export function observeMemoryPressureSignal(
  trendPct: number,
  memoryWarningFlag: boolean,
  at = Date.now(),
): void {
  if (trendPct > peakTrendPct) peakTrendPct = trendPct;
  if (memoryWarningFlag) {
    memoryWarning = true;
    lastWarningAt = at;
  }
}

export function hasMemoryWarning(): boolean {
  return memoryWarning;
}

export function getPeakMemoryTrendPct(): number {
  return peakTrendPct;
}
