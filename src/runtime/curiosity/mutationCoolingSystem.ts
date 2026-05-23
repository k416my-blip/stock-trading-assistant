/**
 * Mutation Cooling System — suppress overheated sandbox mutation.
 */
let heat = 0;
let lastCoolAt = 0;

export function resetMutationCoolingForTest(): void {
  heat = 0;
  lastCoolAt = 0;
}

export function noteMutationHeat(success: boolean): void {
  heat = Math.min(1, heat + (success ? 0.08 : 0.15));
}

export function getMutationHeat(): number {
  return Math.round(heat * 1000) / 1000;
}

export function tickMutationCooling(nowMs = Date.now()): number {
  if (nowMs - lastCoolAt > 30_000) {
    heat = Math.max(0, heat - 0.12);
    lastCoolAt = nowMs;
  }
  return getMutationHeat();
}

export function isMutationOverheated(): boolean {
  return heat >= 0.75;
}

export function getCuriosityCooldownActive(overheated: boolean): boolean {
  return overheated || heat >= 0.5;
}
