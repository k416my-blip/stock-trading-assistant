import { FAILURE_HEARTBEAT_STALE_MS } from '../../constants/failureRecoveryOrchestrator';

let attempts = 0;
let successes = 0;
let lastCooldownUntil = 0;

export function resetWebSocketReconnectionStabilizationForTest(): void {
  attempts = 0;
  successes = 0;
  lastCooldownUntil = 0;
}

export function stabilizeWebSocketReconnect(
  reconnectPerMin: number,
  heartbeatAgeMs: number,
  now = Date.now(),
): boolean {
  if (now < lastCooldownUntil) return false;
  if (reconnectPerMin < 3 && heartbeatAgeMs < FAILURE_HEARTBEAT_STALE_MS) return false;
  attempts += 1;
  const backoff = Math.min(30_000, 2_000 * 2 ** Math.min(4, attempts - 1));
  lastCooldownUntil = now + backoff;
  if (heartbeatAgeMs < FAILURE_HEARTBEAT_STALE_MS * 1.5) successes += 1;
  return true;
}

export function getWebsocketRecoveryRate(): number {
  if (attempts === 0) return 1;
  return Math.round((successes / attempts) * 100) / 100;
}
