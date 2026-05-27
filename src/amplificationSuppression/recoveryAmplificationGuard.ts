import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

let recoveryLoopCount = 0;
let lastRecoveryBand = 'healthy';

export function resetRecoveryAmplificationGuardForTest(): void {
  recoveryLoopCount = 0;
  lastRecoveryBand = 'healthy';
}

export function scoreRecoveryAmplificationRisk(input: AmplificationSuppressionObserveInput): number {
  let risk = (1 - input.recoverySuccessRate) * 0.35;
  risk += input.telemetryAmplificationScore * 0.25;
  risk += Math.min(0.2, recoveryLoopCount / 10);
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function noteRecoveryLoop(input: AmplificationSuppressionObserveInput): boolean {
  const band = input.recoverySuccessRate >= 0.65 ? 'healthy' : 'degraded';
  if (band !== lastRecoveryBand && input.observerOverheadRatio > 0.45) {
    recoveryLoopCount += 1;
  }
  lastRecoveryBand = band;
  return recoveryLoopCount > 3;
}

export function getRecoveryAmplificationChain(): string[] {
  if (recoveryLoopCount === 0) return [];
  return ['recovery', 'telemetry', 'orchestration', 'recovery'];
}
