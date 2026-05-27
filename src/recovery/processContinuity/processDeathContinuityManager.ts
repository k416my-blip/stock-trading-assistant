import type { ProcessContinuityObserveInput } from '../../types/processContinuityRecovery';

let deathEvents = 0;
let recoverySuccess = 0;

export function resetProcessDeathContinuityManagerForTest(): void {
  deathEvents = 0;
  recoverySuccess = 0;
}

export function noteProcessDeathEvent(): void {
  deathEvents += 1;
}

export function noteProcessDeathRecovery(success: boolean): void {
  if (success) recoverySuccess += 1;
}

export function getProcessDeathRecoveryRate(): number {
  if (deathEvents === 0) return 1;
  return Math.round((recoverySuccess / deathEvents) * 100) / 100;
}

export function shouldTreatAsProcessDeath(input: ProcessContinuityObserveInput): boolean {
  return (
    input.recoveryAttemptCount > 0 ||
    (input.miuiAggressiveReclaim && !input.appForeground) ||
    input.sessionMinutes < 2
  );
}
