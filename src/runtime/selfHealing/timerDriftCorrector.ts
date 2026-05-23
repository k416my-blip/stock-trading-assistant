/**
 * Timer drift correction — Android background / Redmi resume skew / heartbeat duplication.
 */
import type { TimerDriftCorrectionResult } from '../../types/runtimeSelfHealing';
import { TIMER_DRIFT_CRITICAL_MS, TIMER_DRIFT_WARNING_MS } from '../../constants/runtimeSelfHealing';
import { cleanupDuplicateTimers } from '../../services/mobileRedmiRuntime';
import { DEVICE_PROFILE_SPECS } from '../../constants/adaptiveRuntimeLearning';

let lastDriftMs = 0;
let intervalsDeduped = 0;
let lastRecoveryScore = 1;

export function resetTimerDriftCorrectorForTest(): void {
  lastDriftMs = 0;
  intervalsDeduped = 0;
  lastRecoveryScore = 1;
}

export function observeTimerDrift(driftMs: number, deviceProfile: keyof typeof DEVICE_PROFILE_SPECS = 'redmi'): void {
  lastDriftMs = driftMs;
  const tolerance = DEVICE_PROFILE_SPECS[deviceProfile].timerDriftToleranceMs;
  if (driftMs >= tolerance) {
    lastRecoveryScore = Math.max(0.2, 1 - driftMs / (tolerance * 2));
  } else {
    lastRecoveryScore = Math.min(1, 0.7 + (1 - driftMs / tolerance) * 0.3);
  }
}

export function correctTimerDrift(driftMs: number): TimerDriftCorrectionResult {
  observeTimerDrift(driftMs);
  let deduped = 0;
  if (driftMs >= TIMER_DRIFT_WARNING_MS) {
    cleanupDuplicateTimers();
    deduped = 1;
    intervalsDeduped += deduped;
  }

  const heartbeatSkewCorrected = driftMs >= TIMER_DRIFT_CRITICAL_MS;
  if (heartbeatSkewCorrected) {
    cleanupDuplicateTimers();
    intervalsDeduped += 1;
  }

  const driftRecoveryScore =
    driftMs <= TIMER_DRIFT_WARNING_MS
      ? 1
      : Math.max(0.35, 1 - (driftMs - TIMER_DRIFT_WARNING_MS) / TIMER_DRIFT_CRITICAL_MS);

  lastRecoveryScore = driftRecoveryScore;

  return {
    timerDriftMs: driftMs,
    driftRecoveryScore: Math.round(driftRecoveryScore * 1000) / 1000,
    intervalsDeduped: deduped,
    heartbeatSkewCorrected,
  };
}

export function getLastTimerDriftMs(): number {
  return lastDriftMs;
}

export function getLastDriftRecoveryScore(): number {
  return lastRecoveryScore;
}
