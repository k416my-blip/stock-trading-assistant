/**
 * Pure policy → guard state (no side effects). Effects emitted via RuntimeDecision.
 */
import type { RuntimeGuardKernelState } from '../../types/runtimeKernel';
import type { RuntimeOrchestratorPolicy } from '../../types/runtimeOrchestrator';
import type { RuntimeUnifiedSignals } from '../../types/runtimeKernel';
import { heartbeatMsFromPolicy } from '../orchestrator/runtimePolicyEngine';
import { HYDRATION_PAUSE_WINDOW_MS } from '../../constants/asyncRuntimeCoordinator';

export function buildGuardStateFromPolicy(
  policy: RuntimeOrchestratorPolicy,
  signals: RuntimeUnifiedSignals,
): RuntimeGuardKernelState {
  const heartbeatMs = heartbeatMsFromPolicy(policy);
  const wsLight = policy.websocketBatching || policy.websocketSafeMode;
  return {
    hydrationSerializeMode: policy.hydrationSerializeMode,
    hydrationPausedUntil: policy.hydrationSerializeMode || wsLight
      ? Date.now() + HYDRATION_PAUSE_WINDOW_MS
      : signals.hydrationPaused
        ? Date.now() + HYDRATION_PAUSE_WINDOW_MS
        : 0,
    websocketLightweight: wsLight,
    websocketHeartbeatMs: heartbeatMs,
    websocketOfflineDebounceUntil: 0,
    proactivePause: policy.suspendProactiveAi,
    proactiveThrottle: policy.proactiveCooldown || policy.suspendProactiveAi,
    resumeDebounceActive: !signals.lifecycleForeground,
    memoryPressureTrendPct: signals.memoryPressurePct,
    asyncConcurrency: policy.queueHardLimit != null && policy.queueHardLimit <= 20 ? 1 : 2,
    queueHardLimit: policy.queueHardLimit,
  };
}

/** @deprecated Use RuntimeEffectDispatcher — kept for legacy callers during migration. */
export function dispatchRuntimePolicy(
  policy: RuntimeOrchestratorPolicy,
  signals: RuntimeUnifiedSignals,
): RuntimeGuardKernelState {
  return buildGuardStateFromPolicy(policy, signals);
}
