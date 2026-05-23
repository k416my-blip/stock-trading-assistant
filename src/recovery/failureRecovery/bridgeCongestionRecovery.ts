import { scheduleBatchedBridgeJob } from '../../rn/bridgeSurvivability';
import { FAILURE_BRIDGE_TRAFFIC_WARN } from '../../constants/failureRecoveryOrchestrator';

let bridgeRecoveryCount = 0;
let cooldownUntil = 0;

export function resetBridgeCongestionRecoveryForTest(): void {
  bridgeRecoveryCount = 0;
  cooldownUntil = 0;
}

export function runBridgeCongestionRecovery(bridgeTrafficRate: number, now = Date.now()): boolean {
  if (bridgeTrafficRate < FAILURE_BRIDGE_TRAFFIC_WARN) return false;
  if (now < cooldownUntil) return false;
  bridgeRecoveryCount += 1;
  scheduleBatchedBridgeJob(() => {
    /* bridge batch enlarge — recovery path only */
  });
  cooldownUntil = now + 4_000;
  return true;
}

export function getBridgeRecoveryCount(): number {
  return bridgeRecoveryCount;
}
