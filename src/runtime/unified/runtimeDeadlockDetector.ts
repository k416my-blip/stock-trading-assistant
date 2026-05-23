/** Runtime Deadlock Detector — mutual wait detection. */
let waitChain: string[] = [];

export function resetRuntimeDeadlockDetectorForTest(): void {
  waitChain = [];
}

export function noteLayerWait(phase: string): void {
  waitChain.push(phase);
  if (waitChain.length > 12) waitChain.shift();
}

export function clearLayerWaits(): void {
  waitChain = [];
}

export function detectDeadlockRisk(): number {
  const counts = new Map<string, number>();
  for (const p of waitChain) counts.set(p, (counts.get(p) ?? 0) + 1);
  const max = Math.max(0, ...counts.values());
  return Math.min(1, max / 4);
}
