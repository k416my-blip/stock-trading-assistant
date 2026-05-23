/** Unified Cooldown Manager — single cooldown registry. */
const cooldowns = new Map<string, number>();

export function resetUnifiedCooldownManagerForTest(): void {
  cooldowns.clear();
}

export function isUnifiedCooldownActive(key: string, nowMs = Date.now()): boolean {
  const until = cooldowns.get(key) ?? 0;
  return nowMs < until;
}

export function setUnifiedCooldown(key: string, durationMs: number, nowMs = Date.now()): void {
  cooldowns.set(key, nowMs + durationMs);
}

export function canRunUnifiedTick(nowMs = Date.now()): boolean {
  return !isUnifiedCooldownActive('global_tick', nowMs);
}
