let pressurePct = 0;
let lastSampleAt = 0;

export function resetHermesHeapPressureTrackerForTest(): void {
  pressurePct = 0;
  lastSampleAt = 0;
}

export function trackHermesHeapPressure(jsHeapMb: number, memoryTrendPct: number): number {
  pressurePct = Math.min(100, Math.round(jsHeapMb * 0.35 + memoryTrendPct * 0.45));
  lastSampleAt = Date.now();
  return pressurePct;
}

export function isHermesGcCooldownActive(now = Date.now()): boolean {
  return pressurePct > 75 && now - lastSampleAt < 8_000;
}

export function getHermesHeapPressurePct(): number {
  return pressurePct;
}
