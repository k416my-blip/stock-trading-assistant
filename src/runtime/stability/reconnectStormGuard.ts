import {
  STABILITY_RECONNECT_BACKOFF_BASE_MS,
  STABILITY_RECONNECT_BACKOFF_MAX_MS,
  STABILITY_RECONNECT_BUDGET_PER_MIN,
  STABILITY_RECONNECT_COOLDOWN_MS,
} from '../../constants/runtimeStability';
import { getReconnectPerMin, isReconnectStorm } from './RuntimeReconnectTracker';

let backoffAttempt = 0;
let cooldownUntil = 0;
let budgetUsed = 0;
let budgetWindowStart = 0;
const BUDGET_WINDOW_MS = 60_000;

export function resetReconnectStormGuardForTest(): void {
  backoffAttempt = 0;
  cooldownUntil = 0;
  budgetUsed = 0;
  budgetWindowStart = 0;
}

function refreshBudgetWindow(now: number): void {
  if (budgetWindowStart <= 0 || now - budgetWindowStart >= BUDGET_WINDOW_MS) {
    budgetWindowStart = now;
    budgetUsed = 0;
  }
}

export function getReconnectBudgetRemaining(now = Date.now()): number {
  refreshBudgetWindow(now);
  return Math.max(0, STABILITY_RECONNECT_BUDGET_PER_MIN - budgetUsed);
}

export function getReconnectCooldownUntil(): number {
  return cooldownUntil;
}

export function canScheduleReconnect(now = Date.now()): boolean {
  refreshBudgetWindow(now);
  if (now < cooldownUntil) return false;
  if (budgetUsed >= STABILITY_RECONNECT_BUDGET_PER_MIN) return false;
  return true;
}

export function computeReconnectBackoffMs(now = Date.now()): number {
  if (isReconnectStorm(4, now)) backoffAttempt += 1;
  const exp = STABILITY_RECONNECT_BACKOFF_BASE_MS * Math.pow(2, Math.min(6, backoffAttempt));
  return Math.min(STABILITY_RECONNECT_BACKOFF_MAX_MS, exp);
}

export function registerReconnectAttempt(now = Date.now()): {
  allowed: boolean;
  delayMs: number;
  storm: boolean;
} {
  refreshBudgetWindow(now);
  const storm = isReconnectStorm(4, now);
  if (storm) {
    cooldownUntil = now + STABILITY_RECONNECT_COOLDOWN_MS;
    backoffAttempt += 1;
  }
  if (!canScheduleReconnect(now)) {
    return { allowed: false, delayMs: computeReconnectBackoffMs(now), storm };
  }
  budgetUsed += 1;
  const delayMs = computeReconnectBackoffMs(now);
  if (storm) cooldownUntil = now + STABILITY_RECONNECT_COOLDOWN_MS;
  return { allowed: true, delayMs, storm };
}

export function resetReconnectBackoffOnStable(): void {
  backoffAttempt = 0;
}

export function isDuplicateSocketAttempt(socketKey: string, seen: Set<string>): boolean {
  return seen.has(socketKey);
}
