import type { FailureRecoveryObserveInput } from '../../types/failureRecoveryOrchestrator';
import { FAILURE_NETWORK_CHAOS_WS_RECONNECT } from '../../constants/failureRecoveryOrchestrator';
import { halfOpenSeverity } from './halfOpenConnectionDetector';

export function profileNetworkChaos(input: FailureRecoveryObserveInput): number {
  const reconnect = Math.min(1, input.reconnectPerMin / FAILURE_NETWORK_CHAOS_WS_RECONNECT);
  const dup = Math.min(1, input.wsDuplicateCount / 6);
  const half = halfOpenSeverity(input.heartbeatAgeMs, input.reconnectPerMin);
  return Math.round(Math.max(reconnect, dup, half) * 1000) / 1000;
}
