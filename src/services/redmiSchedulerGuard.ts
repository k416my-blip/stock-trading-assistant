import {
  ASYNC_RESUME_COOLDOWN_MS,
  POST_RESUME_LIGHTWEIGHT_MS,
} from '../constants/asyncRuntimeCoordinator';
import { scheduleDedupedTimer, cancelDedupedTimer } from './mobileRedmiRuntime';

let resumeCooldownUntil = 0;
let postResumeLightweightUntil = 0;
let heavyRestoreScheduled = false;
let timerRebuildSuppressed = false;

export function resetRedmiSchedulerGuardForTest(): void {
  resumeCooldownUntil = 0;
  postResumeLightweightUntil = 0;
  heavyRestoreScheduled = false;
  timerRebuildSuppressed = false;
}

export function noteForegroundResumeSpike(): void {
  resumeCooldownUntil = Date.now() + ASYNC_RESUME_COOLDOWN_MS;
  postResumeLightweightUntil = Date.now() + POST_RESUME_LIGHTWEIGHT_MS;
  timerRebuildSuppressed = true;
  scheduleDedupedTimer('redmi-timer-rebuild-allow', () => {
    timerRebuildSuppressed = false;
  }, ASYNC_RESUME_COOLDOWN_MS);
}

export function isAsyncResumeCooldownActive(): boolean {
  return Date.now() < resumeCooldownUntil;
}

export function isPostResumeLightweightWindow(): boolean {
  return Date.now() < postResumeLightweightUntil;
}

export function shouldSuppressTimerRebuild(): boolean {
  return timerRebuildSuppressed;
}

export function scheduleDelayedHeavyTaskRestore(fn: () => void, delayMs = 1200): void {
  if (heavyRestoreScheduled) return;
  heavyRestoreScheduled = true;
  scheduleDedupedTimer('redmi-heavy-restore', () => {
    heavyRestoreScheduled = false;
    if (!isAsyncResumeCooldownActive()) fn();
  }, delayMs);
}

export function applyThermalThrottlingGuard(thermalPressurePct: number): boolean {
  if (thermalPressurePct < 70) return false;
  postResumeLightweightUntil = Date.now() + POST_RESUME_LIGHTWEIGHT_MS / 2;
  return true;
}

export function applyBatterySaverGuard(batterySaver: boolean): void {
  if (batterySaver) {
    postResumeLightweightUntil = Date.now() + POST_RESUME_LIGHTWEIGHT_MS;
  }
}

export function cancelPendingHeavyRestore(): void {
  cancelDedupedTimer('redmi-heavy-restore');
  heavyRestoreScheduled = false;
}
