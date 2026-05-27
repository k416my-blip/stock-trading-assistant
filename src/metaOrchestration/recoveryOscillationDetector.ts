const recoveryBandHistory: ('healthy' | 'degraded')[] = [];

export function resetRecoveryOscillationDetectorForTest(): void {
  recoveryBandHistory.length = 0;
}

export function noteRecoveryBand(successRate: number): void {
  recoveryBandHistory.push(successRate >= 0.7 ? 'healthy' : 'degraded');
  if (recoveryBandHistory.length > 32) recoveryBandHistory.shift();
}

export function scoreRecoveryOscillationRisk(): number {
  if (recoveryBandHistory.length < 4) return 0;
  let flips = 0;
  for (let i = 1; i < recoveryBandHistory.length; i += 1) {
    if (recoveryBandHistory[i] !== recoveryBandHistory[i - 1]) flips += 1;
  }
  return Math.round(Math.min(1, flips / recoveryBandHistory.length) * 1000) / 1000;
}
