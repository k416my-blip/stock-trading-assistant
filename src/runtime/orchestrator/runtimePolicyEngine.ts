import type {
  RuntimeOrchestratorPolicy,
  RuntimeOrchestratorState,
} from '../../types/runtimeOrchestrator';
import {
  DASHBOARD_MAX_FPS_COMPACT,
  DASHBOARD_MAX_FPS_STABLE,
} from '../../constants/asyncRuntimeCoordinator';
import { TELEMETRY_HEARTBEAT_BASE_MS } from '../../constants/runtimeTelemetry';

export function resolveRuntimePolicy(state: RuntimeOrchestratorState): RuntimeOrchestratorPolicy {
  switch (state) {
    case 'STABLE':
      return {
        telemetrySamplingRate: 1,
        animationReduction: false,
        websocketHeartbeatMultiplier: 1,
        websocketBatching: false,
        proactiveCooldown: false,
        suspendProactiveAi: false,
        compactDashboard: false,
        maxDashboardFps: DASHBOARD_MAX_FPS_STABLE,
        suspendLowPriorityAsync: false,
        pauseNonessentialRenderLoop: false,
        queueHardLimit: null,
        disableExpensiveTransitions: false,
        hydrationSerializeMode: false,
        minimalUiMode: false,
        websocketSafeMode: false,
        disableBackgroundRefresh: false,
        disableSpeculativeRender: false,
        aiChatOnly: false,
        lightweightAiResponses: false,
        suppressAiOnReconnectStorm: false,
      };
    case 'LIGHT_PRESSURE':
      return {
        telemetrySamplingRate: 0.7,
        animationReduction: true,
        websocketHeartbeatMultiplier: 1.2,
        websocketBatching: false,
        proactiveCooldown: true,
        suspendProactiveAi: false,
        compactDashboard: false,
        maxDashboardFps: 24,
        suspendLowPriorityAsync: false,
        pauseNonessentialRenderLoop: false,
        queueHardLimit: null,
        disableExpensiveTransitions: false,
        hydrationSerializeMode: false,
        minimalUiMode: false,
        websocketSafeMode: false,
        disableBackgroundRefresh: false,
        disableSpeculativeRender: false,
        aiChatOnly: false,
        lightweightAiResponses: true,
        suppressAiOnReconnectStorm: false,
      };
    case 'DEGRADED':
      return {
        telemetrySamplingRate: 0.45,
        animationReduction: true,
        websocketHeartbeatMultiplier: 1.2,
        websocketBatching: true,
        proactiveCooldown: true,
        suspendProactiveAi: false,
        compactDashboard: true,
        maxDashboardFps: 16,
        suspendLowPriorityAsync: true,
        pauseNonessentialRenderLoop: false,
        queueHardLimit: 40,
        disableExpensiveTransitions: false,
        hydrationSerializeMode: false,
        minimalUiMode: false,
        websocketSafeMode: false,
        disableBackgroundRefresh: false,
        disableSpeculativeRender: true,
        aiChatOnly: false,
        lightweightAiResponses: true,
        suppressAiOnReconnectStorm: true,
      };
    case 'CRITICAL':
      return {
        telemetrySamplingRate: 0.35,
        animationReduction: true,
        websocketHeartbeatMultiplier: 1.5,
        websocketBatching: true,
        proactiveCooldown: true,
        suspendProactiveAi: true,
        compactDashboard: true,
        maxDashboardFps: 12,
        suspendLowPriorityAsync: true,
        pauseNonessentialRenderLoop: true,
        queueHardLimit: 28,
        disableExpensiveTransitions: true,
        hydrationSerializeMode: true,
        minimalUiMode: false,
        websocketSafeMode: true,
        disableBackgroundRefresh: false,
        disableSpeculativeRender: true,
        aiChatOnly: false,
        lightweightAiResponses: true,
        suppressAiOnReconnectStorm: true,
      };
    case 'SURVIVAL':
      return {
        telemetrySamplingRate: 0.25,
        animationReduction: true,
        websocketHeartbeatMultiplier: 1.5,
        websocketBatching: true,
        proactiveCooldown: true,
        suspendProactiveAi: true,
        compactDashboard: true,
        maxDashboardFps: 8,
        suspendLowPriorityAsync: true,
        pauseNonessentialRenderLoop: true,
        queueHardLimit: 16,
        disableExpensiveTransitions: true,
        hydrationSerializeMode: true,
        minimalUiMode: true,
        websocketSafeMode: true,
        disableBackgroundRefresh: true,
        disableSpeculativeRender: true,
        aiChatOnly: true,
        lightweightAiResponses: true,
        suppressAiOnReconnectStorm: true,
      };
    default:
      return resolveRuntimePolicy('STABLE');
  }
}

export function heartbeatMsFromPolicy(policy: RuntimeOrchestratorPolicy): number {
  return Math.round(TELEMETRY_HEARTBEAT_BASE_MS * policy.websocketHeartbeatMultiplier);
}
