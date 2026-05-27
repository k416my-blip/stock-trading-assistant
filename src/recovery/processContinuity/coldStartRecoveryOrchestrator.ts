import type { ProcessContinuityMode } from '../../types/processContinuityRecovery';
import type { ProcessContinuityObserveInput } from '../../types/processContinuityRecovery';

let coldStartAt = 0;
let lastColdStartRecoveryMs = 0;

export function resetColdStartRecoveryOrchestratorForTest(): void {
  coldStartAt = 0;
  lastColdStartRecoveryMs = 0;
}

export function beginColdStart(now = Date.now()): void {
  coldStartAt = now;
}

export function completeColdStart(now = Date.now()): number {
  if (!coldStartAt) return 0;
  lastColdStartRecoveryMs = now - coldStartAt;
  coldStartAt = 0;
  return lastColdStartRecoveryMs;
}

export function getColdStartRecoveryMs(): number {
  return lastColdStartRecoveryMs;
}

export function resolveColdStartMode(input: ProcessContinuityObserveInput): ProcessContinuityMode {
  if (coldStartAt > 0) return 'cold_restore';
  if (input.jsHeapMb > 180 || input.memoryTrendPct > 75) return 'lmk_degraded';
  if (input.screenOff || !input.appForeground) return 'background_reclaim';
  if (input.hydrationLockActive) return 'staged_hydration';
  return 'full';
}
