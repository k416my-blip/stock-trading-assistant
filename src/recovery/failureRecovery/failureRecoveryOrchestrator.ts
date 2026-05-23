import type {
  FailureRecoveryObserveInput,
  FailureRecoveryState,
  FailureRecoveryTimelineEntry,
} from '../../types/failureRecoveryOrchestrator';
import { detectFreeze, getFreezeRecoveryLatency } from './freezeAutoRecoveryTracker';
import { runBridgeCongestionRecovery } from './bridgeCongestionRecovery';
import { runRenderCollapseRecovery } from './renderCollapseRecovery';
import { runHermesPressureRecovery } from './hermesPressureRecovery';
import { beginThermalCooldown } from './thermalRecoveryCooldownController';
import { trackBackgroundStarvation } from './backgroundStarvationRecovery';
import { runLowMemoryEmergencyCompaction } from './lowMemoryEmergencyCompaction';
import { stabilizeWebSocketReconnect } from './websocketReconnectionStabilization';
import { detectHalfOpenConnection } from './halfOpenConnectionDetector';
import { profileNetworkChaos } from './networkChaosRecoveryProfiler';
import { scheduleIdleRecovery, tickIdleRecovery } from './idlePhaseRecoveryScheduler';
import { openAsyncStorageRecoveryWindow } from './asyncStorageRecoveryWindow';

export type RecoveryFlowResult = {
  flow: FailureRecoveryTimelineEntry['flow'];
  recovered: boolean;
  detailJa: string;
};

export function runFreezeRecoveryFlow(input: FailureRecoveryObserveInput): RecoveryFlowResult {
  const frozen = detectFreeze(input.eventLoopLagMs);
  if (frozen) {
    scheduleIdleRecovery();
    openAsyncStorageRecoveryWindow();
    return { flow: 'freeze', recovered: false, detailJa: 'freeze detect → scheduler suppression → bridge cooldown' };
  }
  if (tickIdleRecovery()) {
    return { flow: 'idle', recovered: true, detailJa: 'idle recovery → gradual restore' };
  }
  return { flow: 'freeze', recovered: getFreezeRecoveryLatency() > 0, detailJa: 'freeze path idle' };
}

export function runBridgeRecoveryFlow(input: FailureRecoveryObserveInput): RecoveryFlowResult {
  const ok = runBridgeCongestionRecovery(input.bridgeTrafficRate);
  return {
    flow: 'bridge',
    recovered: ok,
    detailJa: ok ? 'bridge spike → batch enlarge → cooldown' : 'bridge stable',
  };
}

export function runThermalRecoveryFlow(input: FailureRecoveryObserveInput): RecoveryFlowResult {
  const cooling = beginThermalCooldown(input.thermalState);
  if (cooling) openAsyncStorageRecoveryWindow();
  runRenderCollapseRecovery(input.renderFps, input.renderStormRisk);
  return {
    flow: 'thermal',
    recovered: !cooling,
    detailJa: cooling ? 'thermal severe → profiler pause → defer storage' : 'thermal cooldown complete',
  };
}

export function runBackgroundRecoveryFlow(input: FailureRecoveryObserveInput): RecoveryFlowResult {
  const starved = trackBackgroundStarvation(input.appForeground, input.screenOff);
  return {
    flow: 'background',
    recovered: !starved && input.appForeground,
    detailJa: starved ? 'background → low-frequency observers' : 'foreground resume gradual',
  };
}

export function runMemoryRecoveryFlow(input: FailureRecoveryObserveInput): RecoveryFlowResult {
  runHermesPressureRecovery(input.jsHeapMb, input.memoryTrendPct);
  const compacted = runLowMemoryEmergencyCompaction(input.jsHeapMb, input.memoryTrendPct);
  return {
    flow: 'memory',
    recovered: compacted === 0,
    detailJa: `heap pressure → immutable reuse → cleanup ${compacted}`,
  };
}

export function runNetworkRecoveryFlow(input: FailureRecoveryObserveInput): RecoveryFlowResult {
  const halfOpen = detectHalfOpenConnection(input.heartbeatAgeMs, input.wsDuplicateCount);
  const stabilized = stabilizeWebSocketReconnect(input.reconnectPerMin, input.heartbeatAgeMs);
  return {
    flow: 'network',
    recovered: !halfOpen || stabilized,
    detailJa: halfOpen ? 'half-open → soft reconnect → backoff' : 'network stable',
  };
}

export function runRecoveryFlowsForState(
  state: FailureRecoveryState,
  input: FailureRecoveryObserveInput,
): RecoveryFlowResult[] {
  const flows: RecoveryFlowResult[] = [];
  if (state === 'freeze_safe') flows.push(runFreezeRecoveryFlow(input));
  if (state === 'bridge_recovery') flows.push(runBridgeRecoveryFlow(input));
  if (state === 'thermal_safe') flows.push(runThermalRecoveryFlow(input));
  if (state === 'background_survival') flows.push(runBackgroundRecoveryFlow(input));
  if (state === 'memory_recovery') flows.push(runMemoryRecoveryFlow(input));
  if (profileNetworkChaos(input) > 0.45) flows.push(runNetworkRecoveryFlow(input));
  if (flows.length === 0 && state === 'degraded') {
    flows.push(runNetworkRecoveryFlow(input));
  }
  return flows;
}
