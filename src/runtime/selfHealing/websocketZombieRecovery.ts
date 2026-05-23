/**
 * WebSocket zombie recovery — ghost state, heartbeat freeze, half-open connections.
 */
import type { WebSocketZombieRecoveryResult } from '../../types/runtimeSelfHealing';
import { cancelAsyncTasksByLabel } from '../orchestrator/asyncPriorityScheduler';
import { noteRetainedWebsocketRef } from '../orchestrator/memoryPressureGuardian';

let ghostStateCleared = false;
let hardResetCount = 0;
let lastCooldownMs = 0;

export function resetWebSocketZombieRecoveryForTest(): void {
  ghostStateCleared = false;
  hardResetCount = 0;
  lastCooldownMs = 0;
}

export function recoverWebSocketZombie(signals: {
  reconnectLoopCount: number;
  heartbeatDelayMs: number;
  reconnectStormDetected: boolean;
}): WebSocketZombieRecoveryResult {
  const ghost =
    signals.heartbeatDelayMs > 8_000 ||
    (signals.reconnectLoopCount >= 3 && signals.heartbeatDelayMs > 2_000);

  let hardResetPerformed = false;
  let transportRebuild = false;
  let cooldownAppliedMs = 0;

  if (ghost || signals.reconnectStormDetected) {
    ghostStateCleared = true;
    cancelAsyncTasksByLabel('ws-');
    cancelAsyncTasksByLabel('websocket-');
    noteRetainedWebsocketRef();
    hardResetPerformed = true;
    transportRebuild = true;
    hardResetCount += 1;
    cooldownAppliedMs = signals.reconnectStormDetected ? 8_000 : 4_000;
    lastCooldownMs = cooldownAppliedMs;
  }

  const offlineDebounceMs = signals.reconnectLoopCount >= 5 ? 2_500 : 1_200;

  return {
    ghostStateCleared: ghost,
    hardResetPerformed,
    transportRebuild,
    cooldownAppliedMs,
    offlineDebounceMs,
  };
}

export function getWebSocketRebuildCount(): number {
  return hardResetCount;
}
