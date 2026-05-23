/**
 * Single source of truth for runtime policy — kernel merges state table + signals + native hints.
 * Effect layer executes; native bridge supplies signals only.
 */
import type { RuntimeOrchestratorPolicy } from '../../types/runtimeOrchestrator';
import type { RuntimeKernelState, RuntimeUnifiedSignals } from '../../types/runtimeKernel';
import type { MemoryClassPolicyHints } from '../../native/runtime/memoryClassAwareness';
import { resolveRuntimePolicy } from '../orchestrator/runtimePolicyEngine';
import { TELEMETRY_HEARTBEAT_BASE_MS, TELEMETRY_HEARTBEAT_MAX_MS } from '../../constants/runtimeTelemetry';

export function mergeKernelOwnedPolicy(
  state: RuntimeKernelState,
  signals: RuntimeUnifiedSignals,
  memoryHints: MemoryClassPolicyHints,
): RuntimeOrchestratorPolicy {
  const base = resolveRuntimePolicy(state);
  let policy: RuntimeOrchestratorPolicy = { ...base };

  if (memoryHints.compactFirst) {
    policy = {
      ...policy,
      compactDashboard: true,
      maxDashboardFps: Math.min(policy.maxDashboardFps, 12),
      telemetrySamplingRate: Math.min(policy.telemetrySamplingRate, 0.45),
      websocketBatching: true,
      proactiveCooldown: true,
      lightweightAiResponses: true,
      suppressAiOnReconnectStorm: true,
      disableSpeculativeRender: memoryHints.speculativeRenderForbidden || policy.disableSpeculativeRender,
    };
  }

  if (signals.miuiAggressiveReclaim || signals.forceMiuiSurvival) {
    policy = {
      ...policy,
      compactDashboard: true,
      websocketSafeMode: true,
      websocketBatching: true,
      suspendProactiveAi: policy.suspendProactiveAi || signals.forceMiuiSurvival,
      suppressAiOnReconnectStorm: true,
      proactiveCooldown: true,
      suspendLowPriorityAsync: true,
      queueHardLimit: policy.queueHardLimit ?? 20,
    };
  }

  if (signals.wsReconnectStorm) {
    policy = {
      ...policy,
      suppressAiOnReconnectStorm: true,
      websocketSafeMode: true,
      websocketBatching: true,
      proactiveCooldown: true,
    };
  }

  if (signals.wsJitterScore > 40 || signals.wsLatencyMs > 220) {
    policy = {
      ...policy,
      websocketHeartbeatMultiplier: Math.max(policy.websocketHeartbeatMultiplier, 1.35),
      websocketBatching: true,
    };
  }

  if (signals.memoryWarning) {
    policy = {
      ...policy,
      compactDashboard: true,
      suspendLowPriorityAsync: true,
      hydrationSerializeMode: policy.hydrationSerializeMode || state !== 'STABLE',
    };
  }

  if (signals.killRiskScore >= 75) {
    policy = {
      ...policy,
      suspendProactiveAi: true,
      proactiveCooldown: true,
      websocketSafeMode: true,
      minimalUiMode: policy.minimalUiMode || state === 'SURVIVAL' || state === 'CRITICAL',
    };
  }

  void TELEMETRY_HEARTBEAT_BASE_MS;
  return policy;
}

export function resolveKernelWebsocketHeartbeatMs(
  policy: RuntimeOrchestratorPolicy,
  signals: RuntimeUnifiedSignals,
): number {
  let ms = Math.round(TELEMETRY_HEARTBEAT_BASE_MS * policy.websocketHeartbeatMultiplier);
  if (signals.wsJitterScore > 40) ms = Math.max(ms, TELEMETRY_HEARTBEAT_MAX_MS);
  if (signals.wsReconnectStorm) ms = TELEMETRY_HEARTBEAT_MAX_MS;
  return Math.min(60_000, Math.max(5_000, ms));
}

export type WsPolicyCommandParams = {
  policy: RuntimeOrchestratorPolicy;
  signals: RuntimeUnifiedSignals;
  state: RuntimeKernelState;
  heartbeatMs: number;
  wsLightweight: boolean;
};

export function shouldEmitWsReconnectJitter(params: WsPolicyCommandParams): boolean {
  return (
    params.signals.wsReconnectStorm ||
    (params.policy.suppressAiOnReconnectStorm && params.state !== 'STABLE')
  );
}

export function shouldEmitWsOfflineDebounce(params: WsPolicyCommandParams): boolean {
  return !params.signals.lifecycleForeground || params.policy.websocketSafeMode;
}

export function wsReconnectJitterBaseMs(params: WsPolicyCommandParams): { baseMs: number; maxMs: number } {
  const base = params.signals.wsReconnectStorm ? 4000 : 2500;
  const max = params.signals.miuiAggressiveReclaim ? 12_000 : 8000;
  return { baseMs: base, maxMs: max };
}
