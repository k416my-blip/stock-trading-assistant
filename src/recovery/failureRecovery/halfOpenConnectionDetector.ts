import { FAILURE_HEARTBEAT_STALE_MS } from '../../constants/failureRecoveryOrchestrator';

export function detectHalfOpenConnection(
  heartbeatAgeMs: number,
  wsDuplicateCount: number,
): boolean {
  return heartbeatAgeMs > FAILURE_HEARTBEAT_STALE_MS || wsDuplicateCount > 2;
}

export function halfOpenSeverity(heartbeatAgeMs: number, reconnectPerMin: number): number {
  const hb = Math.min(1, heartbeatAgeMs / (FAILURE_HEARTBEAT_STALE_MS * 2));
  const rc = Math.min(1, reconnectPerMin / 12);
  return Math.round(Math.max(hb, rc) * 1000) / 1000;
}
