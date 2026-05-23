/**
 * Self-Healing Runtime & Failure Recovery — recovery/isolation paths only.
 * Does not alter runtime policy, unified tick, safe mode, or telemetry semantics.
 */
import type {
  FailureRecoveryDashboard,
  FailureRecoveryObserveInput,
  FailureRecoveryProfile,
  FailureRecoveryState,
  FailureRecoveryTimelineEntry,
} from '../../types/failureRecoveryOrchestrator';
import {
  FAILURE_RECOVERY_POLL_MS,
  FAILURE_RECOVERY_QUARANTINE_MS,
  FAILURE_RECOVERY_UI_JA,
  FAILURE_TIMELINE_MAX,
} from '../../constants/failureRecoveryOrchestrator';
import {
  detectTargetState,
  enterEmergency,
  enterQuarantine,
  getDegradationState,
  resetRuntimeDegradationStateMachineForTest,
  transitionDegradationState,
} from './runtimeDegradationStateMachine';
import { getRecoveryEscalationLevel, resetRecoveryEscalationLadderForTest } from './recoveryEscalationLadder';
import {
  buildQuarantineSnapshot,
  enterRuntimeQuarantine,
  exitRuntimeQuarantine,
  getRuntimeQuarantineDuration,
  isQuarantineActive,
  resetRuntimeQuarantineModeForTest,
} from './runtimeQuarantineMode';
import { resetFreezeAutoRecoveryTrackerForTest } from './freezeAutoRecoveryTracker';
import { getBridgeRecoveryCount, resetBridgeCongestionRecoveryForTest } from './bridgeCongestionRecovery';
import { resetRenderCollapseRecoveryForTest } from './renderCollapseRecovery';
import { getMemoryCompactionEfficiency, resetHermesPressureRecoveryForTest } from './hermesPressureRecovery';
import { resetAsyncStorageRecoveryWindowForTest } from './asyncStorageRecoveryWindow';
import {
  getWebsocketRecoveryRate,
  resetWebSocketReconnectionStabilizationForTest,
} from './websocketReconnectionStabilization';
import { profileNetworkChaos } from './networkChaosRecoveryProfiler';
import {
  getThermalRecoveryTime,
  resetThermalRecoveryCooldownControllerForTest,
} from './thermalRecoveryCooldownController';
import {
  getBackgroundRecoveryMs,
  resetBackgroundStarvationRecoveryForTest,
} from './backgroundStarvationRecovery';
import { resetLowMemoryEmergencyCompactionForTest } from './lowMemoryEmergencyCompaction';
import { runListenerAutoDispose, resetListenerAutoDisposeRecoveryForTest } from './listenerAutoDisposeRecovery';
import { getStaleSubscriptionCount, runStaleSubscriptionCleanup } from './staleSubscriptionCleanup';
import { resetIdlePhaseRecoverySchedulerForTest } from './idlePhaseRecoveryScheduler';
import {
  coordinateSelfHealingPass,
  getRecoverySuccessRate,
  getSelfHealingEfficiency,
  resetAdaptiveSelfHealingCoordinatorForTest,
} from './adaptiveSelfHealingCoordinator';
import { runRecoveryFlowsForState } from './failureRecoveryOrchestrator';
import { attachContinuousRecoveryScore } from './multiStageRuntimeSurvivabilityScoring';
import {
  recordFailureRecoverySoakEvent,
  resetFailureRecoverySoakIntegrationForTest,
  setSoakIntegrationEnabled,
} from './failureRecoverySoakIntegration';
import { getFreezeRecoveryLatency } from './freezeAutoRecoveryTracker';
import { halfOpenSeverity } from './halfOpenConnectionDetector';

const timeline: FailureRecoveryTimelineEntry[] = [];
const heatmap: Record<string, number> = {};

let lastProfile: FailureRecoveryProfile | null = null;
let lastThrottleAt = 0;
let quarantineEnteredAt = 0;
let soakHookEnabled = false;
let failedPassStreak = 0;

export function resetFailureRecoveryForTest(): void {
  lastProfile = null;
  lastThrottleAt = 0;
  quarantineEnteredAt = 0;
  soakHookEnabled = false;
  failedPassStreak = 0;
  timeline.length = 0;
  for (const k of Object.keys(heatmap)) delete heatmap[k];
  resetRuntimeDegradationStateMachineForTest();
  resetRecoveryEscalationLadderForTest();
  resetRuntimeQuarantineModeForTest();
  resetFreezeAutoRecoveryTrackerForTest();
  resetBridgeCongestionRecoveryForTest();
  resetRenderCollapseRecoveryForTest();
  resetHermesPressureRecoveryForTest();
  resetAsyncStorageRecoveryWindowForTest();
  resetWebSocketReconnectionStabilizationForTest();
  resetThermalRecoveryCooldownControllerForTest();
  resetBackgroundStarvationRecoveryForTest();
  resetLowMemoryEmergencyCompactionForTest();
  resetListenerAutoDisposeRecoveryForTest();
  resetIdlePhaseRecoverySchedulerForTest();
  resetAdaptiveSelfHealingCoordinatorForTest();
  resetFailureRecoverySoakIntegrationForTest();
}

export function setFailureRecoverySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
  setSoakIntegrationEnabled(enabled);
}

export function initFailureRecovery(): void {
  lastThrottleAt = 0;
}

function recordTimeline(
  from: FailureRecoveryState,
  to: FailureRecoveryState,
  flow: FailureRecoveryTimelineEntry['flow'],
  detailJa: string,
): void {
  const entry: FailureRecoveryTimelineEntry = {
    at: new Date().toISOString(),
    from,
    to,
    flow,
    detailJa,
  };
  timeline.push(entry);
  if (timeline.length > FAILURE_TIMELINE_MAX) timeline.shift();
  const key = `${flow}:${to}`;
  heatmap[key] = (heatmap[key] ?? 0) + 1;
  if (soakHookEnabled) recordFailureRecoverySoakEvent(entry, to === 'healthy' || to === 'recovery');
}

export function getFailureRecoveryTimeline(): FailureRecoveryTimelineEntry[] {
  return [...timeline];
}

export function getRecoveryHeatmap(): Record<string, number> {
  return { ...heatmap };
}

export function shouldRunFailureRecoverySample(_input: FailureRecoveryObserveInput, now = Date.now()): boolean {
  if (now - lastThrottleAt < FAILURE_RECOVERY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeFailureRecovery(input: FailureRecoveryObserveInput): FailureRecoveryProfile {
  const prev = getDegradationState();
  const target = detectTargetState(input);
  let state = transitionDegradationState(target);

  const severity = Math.max(
    profileNetworkChaos(input),
    halfOpenSeverity(input.heartbeatAgeMs, input.reconnectPerMin),
    input.eventLoopLagMs / 600,
  );

  if (failedPassStreak >= 4) {
    enterQuarantine();
    enterRuntimeQuarantine();
    state = getDegradationState();
    if (!quarantineEnteredAt) quarantineEnteredAt = Date.now();
  } else if (severity > 0.92) {
    enterEmergency();
    state = getDegradationState();
  }

  if (isQuarantineActive() && Date.now() - quarantineEnteredAt > FAILURE_RECOVERY_QUARANTINE_MS) {
    exitRuntimeQuarantine();
    failedPassStreak = 0;
    state = transitionDegradationState('healthy');
    quarantineEnteredAt = 0;
  }

  const flows = runRecoveryFlowsForState(state, input);
  let anyRecovered = false;
  for (const f of flows) {
    recordTimeline(prev, state, f.flow, f.detailJa);
    if (f.recovered) anyRecovered = true;
  }

  runListenerAutoDispose();
  runStaleSubscriptionCleanup();

  coordinateSelfHealingPass(input, severity, anyRecovered || target === 'healthy');
  if (anyRecovered || target === 'healthy') {
    failedPassStreak = 0;
    if (state !== 'quarantine') state = transitionDegradationState('healthy');
  } else {
    failedPassStreak += 1;
  }

  const profile = attachContinuousRecoveryScore({
    recoverySuccessRate: getRecoverySuccessRate(),
    recoveryEscalationLevel: getRecoveryEscalationLevel(),
    bridgeRecoveryCount: getBridgeRecoveryCount(),
    freezeRecoveryLatency: getFreezeRecoveryLatency(),
    thermalRecoveryTime: getThermalRecoveryTime(),
    backgroundRecoveryMs: getBackgroundRecoveryMs(),
    memoryCompactionEfficiency: getMemoryCompactionEfficiency(),
    staleSubscriptionCount: getStaleSubscriptionCount(),
    websocketRecoveryRate: getWebsocketRecoveryRate(),
    networkChaosScore: profileNetworkChaos(input),
    runtimeQuarantineDuration: getRuntimeQuarantineDuration(),
    degradationState: getDegradationState(),
    selfHealingEfficiency: getSelfHealingEfficiency(),
    measuredAt: new Date().toISOString(),
  });

  lastProfile = profile;
  return profile;
}

export function getLastFailureRecoveryProfile(): FailureRecoveryProfile | null {
  return lastProfile;
}

export function getFailureRecoveryDashboard(): FailureRecoveryDashboard | null {
  if (!lastProfile) return null;
  return {
    titleJa: FAILURE_RECOVERY_UI_JA.sectionTitle,
    safetyBannerJa: FAILURE_RECOVERY_UI_JA.safety,
    profile: lastProfile,
    timelineRecent: getFailureRecoveryTimeline().slice(-6),
  };
}

export { buildQuarantineSnapshot };
