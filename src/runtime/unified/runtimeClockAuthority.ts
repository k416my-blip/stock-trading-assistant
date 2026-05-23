/** Runtime Clock Authority — single clock for all layers. */
let authorityNowMs = 0;
let authoritySeed = 0;

export function resetRuntimeClockAuthorityForTest(): void {
  authorityNowMs = 0;
  authoritySeed = 0;
}

export function syncRuntimeClock(nowMs = Date.now()): { nowMs: number; seed: number } {
  authorityNowMs = nowMs;
  authoritySeed = (nowMs % 86400000) ^ (Math.floor(nowMs / 1000) % 9973);
  return { nowMs: authorityNowMs, seed: authoritySeed };
}

export function getRuntimeClockMs(): number {
  return authorityNowMs || Date.now();
}

export function getRuntimeDeterministicSeed(): number {
  return authoritySeed;
}
