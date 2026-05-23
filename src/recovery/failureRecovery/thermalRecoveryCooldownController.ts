import { FAILURE_THERMAL_COOLDOWN_MS } from '../../constants/failureRecoveryOrchestrator';

let cooldownUntil = 0;
let lastRecoveryTime = 0;

export function resetThermalRecoveryCooldownControllerForTest(): void {
  cooldownUntil = 0;
  lastRecoveryTime = 0;
}

export function beginThermalCooldown(thermalState: string, now = Date.now()): boolean {
  if (!['severe', 'critical', 'emergency', 'shutdown', 'moderate'].includes(thermalState)) {
    if (cooldownUntil && now >= cooldownUntil) {
      lastRecoveryTime = now - cooldownUntil;
      cooldownUntil = 0;
    }
    return false;
  }
  if (!cooldownUntil) cooldownUntil = now + FAILURE_THERMAL_COOLDOWN_MS;
  return now < cooldownUntil;
}

export function getThermalRecoveryTime(): number {
  return lastRecoveryTime || (cooldownUntil ? FAILURE_THERMAL_COOLDOWN_MS : 0);
}

export function isThermalCooldownActive(now = Date.now()): boolean {
  return now < cooldownUntil;
}
