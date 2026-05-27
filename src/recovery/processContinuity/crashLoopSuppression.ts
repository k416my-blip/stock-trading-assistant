import { PROCESS_CONTINUITY_CRASH_LOOP_ATTEMPTS } from '../../constants/processContinuityRecovery';

export function computeCrashLoopRisk(recoveryAttemptCount: number): number {
  if (recoveryAttemptCount <= 0) return 0;
  const ratio = recoveryAttemptCount / PROCESS_CONTINUITY_CRASH_LOOP_ATTEMPTS;
  return Math.round(Math.min(1, ratio) * 1000) / 1000;
}

export function shouldSuppressHeavyObservers(crashLoopRisk: number): boolean {
  return crashLoopRisk >= 0.85;
}

export function resetCrashLoopSuppressionForTest(): void {
  /* stateless */
}
