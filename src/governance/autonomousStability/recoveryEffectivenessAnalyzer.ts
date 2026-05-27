let attempts = 0;
let effective = 0;

export function resetRecoveryEffectivenessAnalyzerForTest(): void {
  attempts = 0;
  effective = 0;
}

export function noteRecoveryOutcome(success: boolean): void {
  attempts += 1;
  if (success) effective += 1;
}

export function getRecoveryEfficiency(): number {
  if (attempts === 0) return 1;
  return Math.round((effective / attempts) * 100) / 100;
}

export function getEnergyPerRecovery(recoveryMs: number, heapMb: number): number {
  if (recoveryMs <= 0) return 0;
  return Math.round((heapMb / recoveryMs) * 1000) / 1000;
}
