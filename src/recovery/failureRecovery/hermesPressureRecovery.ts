let lastCompactionEfficiency = 0.85;

export function resetHermesPressureRecoveryForTest(): void {
  lastCompactionEfficiency = 0.85;
}

export function runHermesPressureRecovery(jsHeapMb: number, memoryTrendPct: number): number {
  if (jsHeapMb < 120 && memoryTrendPct < 50) {
    lastCompactionEfficiency = Math.min(1, lastCompactionEfficiency + 0.02);
    return lastCompactionEfficiency;
  }
  const pressure = Math.min(1, jsHeapMb / 256 + memoryTrendPct / 120);
  lastCompactionEfficiency = Math.max(0.35, 1 - pressure * 0.4);
  return lastCompactionEfficiency;
}

export function getMemoryCompactionEfficiency(): number {
  return Math.round(lastCompactionEfficiency * 1000) / 1000;
}
