import type { ProcessContinuityObserveInput } from '../../types/processContinuityRecovery';

let lmkEvents = 0;

export function resetLmkRecoveryDetectorForTest(): void {
  lmkEvents = 0;
}

export function detectLmkRecovery(input: ProcessContinuityObserveInput): boolean {
  const lmk =
    input.miuiAggressiveReclaim &&
    (input.jsHeapMb > 160 || input.memoryTrendPct > 70 || !input.appForeground);
  if (lmk) lmkEvents += 1;
  return lmk;
}

export function getLmkEventCount(): number {
  return lmkEvents;
}
