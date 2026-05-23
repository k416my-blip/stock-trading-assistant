import type { FailureRecoveryObserveInput, FailureRecoveryState } from '../../types/failureRecoveryOrchestrator';
import {
  FAILURE_BRIDGE_TRAFFIC_WARN,
  FAILURE_FREEZE_LAG_MS,
  FAILURE_HEAP_MB_WARN,
  FAILURE_MEMORY_TREND_WARN,
} from '../../constants/failureRecoveryOrchestrator';

let state: FailureRecoveryState = 'healthy';

export function resetRuntimeDegradationStateMachineForTest(): void {
  state = 'healthy';
}

export function getDegradationState(): FailureRecoveryState {
  return state;
}

export function detectTargetState(input: FailureRecoveryObserveInput): FailureRecoveryState {
  if (input.eventLoopLagMs >= FAILURE_FREEZE_LAG_MS) return 'freeze_safe';
  if (['severe', 'critical', 'emergency', 'shutdown'].includes(input.thermalState)) {
    return 'thermal_safe';
  }
  if (!input.appForeground || input.screenOff) return 'background_survival';
  if (input.bridgeTrafficRate >= FAILURE_BRIDGE_TRAFFIC_WARN) return 'bridge_recovery';
  if (input.jsHeapMb >= FAILURE_HEAP_MB_WARN || input.memoryTrendPct >= FAILURE_MEMORY_TREND_WARN) {
    return 'memory_recovery';
  }
  if (input.reconnectPerMin >= 6 || input.heartbeatAgeMs > 30_000) return 'degraded';
  if (input.renderStormRisk > 0.65 || input.renderFps < 12) return 'degraded';
  return 'healthy';
}

export function transitionDegradationState(next: FailureRecoveryState): FailureRecoveryState {
  const prev = state;
  if (next === 'healthy') {
    state = prev === 'quarantine' || prev === 'emergency' ? 'recovery' : 'healthy';
    return state;
  }
  if (prev === 'healthy') {
    state = next === 'degraded' ? 'degraded' : next;
    return state;
  }
  if (next === prev) {
    state = 'recovery';
    return state;
  }
  state = next;
  return state;
}

export function enterQuarantine(): FailureRecoveryState {
  state = 'quarantine';
  return state;
}

export function enterEmergency(): FailureRecoveryState {
  state = 'emergency';
  return state;
}
