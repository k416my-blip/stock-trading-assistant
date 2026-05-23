/**
 * Pure runtime decision — effects as commands, no side effects.
 */
import { TELEMETRY_HEARTBEAT_BASE_MS } from '../../constants/runtimeTelemetry';
import type { TelemetryConfidenceMap } from '../../types/nativeRuntimeBridge';
import type {
  RuntimeGuardKernelState,
  RuntimeKernelInput,
  RuntimeKernelSnapshot,
  RuntimeKernelState,
  RuntimeUnifiedSignals,
} from '../../types/runtimeKernel';
import type { RuntimeOrchestratorEvaluation, RuntimeOrchestratorPolicy } from '../../types/runtimeOrchestrator';
import type { RuntimeOrchestratorTransition } from '../../types/runtimeOrchestrator';
import type { RuntimeEffect } from '../effects/RuntimeEffectTypes';
import { createEffectId } from '../effects/RuntimeEffectQueue';
import { priorityForEffectKind } from '../effects/RuntimeEffectRegistry';
import { heartbeatMsFromPolicy } from '../orchestrator/runtimePolicyEngine';
import { buildGuardStateFromPolicy } from './RuntimePolicyKernel';
import {
  assembleRuntimeKernelSnapshot,
  buildOrchestratorSnapshotFromKernel,
  resolvePolicyForKernelState,
} from './RuntimeSnapshot';
import { getReducerTransitionHistory } from './RuntimeReducer';

import type { RuntimeDecision } from '../../types/runtimeKernel';

export type { RuntimeDecision } from '../../types/runtimeKernel';

function makeEffect(
  kind: RuntimeEffect['kind'],
  dedupeKey: string,
  payload: RuntimeEffect['payload'],
): RuntimeEffect {
  return {
    id: createEffectId(),
    kind,
    priority: priorityForEffectKind(kind),
    dedupeKey,
    emittedAt: new Date().toISOString(),
    payload,
  };
}

export function buildPolicyEffects(
  policy: RuntimeOrchestratorPolicy,
  signals: RuntimeUnifiedSignals,
  guards: RuntimeGuardKernelState,
  state: RuntimeKernelState,
): RuntimeEffect[] {
  const heartbeatMs = guards.websocketHeartbeatMs || heartbeatMsFromPolicy(policy);
  const wsLight = guards.websocketLightweight;

  const effects: RuntimeEffect[] = [
    makeEffect('KERNEL_GUARD_SYNC', `guard-${state}`, { guards }),
    makeEffect('DASHBOARD_POLICY', `dash-${state}-${policy.compactDashboard}`, {
      compact: policy.compactDashboard,
      maxFps: policy.maxDashboardFps,
      metricsSamplingRate: policy.telemetrySamplingRate,
    }),
    makeEffect('WS_HEARTBEAT_MS', `ws-hb-${heartbeatMs}`, { heartbeatMs }),
    makeEffect('WS_LIGHTWEIGHT_MODE', `ws-light-${wsLight}`, {
      lightweight: wsLight,
      heartbeatMs,
      batchMode: policy.websocketBatching,
    }),
    makeEffect('QUEUE_COMPACTION', `async-policy-${state}`, { policy }),
    makeEffect('PROACTIVE_COOLDOWN', `pro-cd-${guards.proactiveThrottle}`, {
      pauseProactive: guards.proactivePause,
      throttleProactive: guards.proactiveThrottle,
    }),
  ];

  if (policy.websocketBatching || policy.websocketSafeMode) {
    effects.push(makeEffect('WS_BATCH_MODE', `ws-batch-${state}`, { enabled: true }));
  }

  if (policy.suspendProactiveAi) {
    effects.push(
      makeEffect('PROACTIVE_PAUSE', `pro-pause-${state}`, {
        pauseProactive: true,
        throttleProactive: true,
      }),
    );
  }

  if (policy.hydrationSerializeMode || guards.hydrationPausedUntil > Date.now()) {
    effects.push(makeEffect('HYDRATION_SERIALIZE', `hyd-ser-${state}`, { enabled: true }));
  }

  if (policy.minimalUiMode || state === 'SURVIVAL') {
    effects.push(makeEffect('SURVIVAL_MINIMAL_UI', `minimal-${state}`, { enabled: true }));
  }

  if (signals.hydrationCascadeRiskPct >= 55 && policy.hydrationSerializeMode) {
    effects.push(
      makeEffect('HYDRATION_DEFER', `hyd-defer-${state}`, {
        reasonJa: 'kernel policy — hydration defer',
        serializeMode: policy.hydrationSerializeMode,
      }),
    );
  }

  void TELEMETRY_HEARTBEAT_BASE_MS;
  return effects;
}

export function buildAuxiliaryEffects(params: {
  kernelInput: RuntimeKernelInput;
  state: RuntimeKernelState;
  snapshot: RuntimeKernelSnapshot;
  orchestratorEvaluation: RuntimeOrchestratorEvaluation;
  imminentKill: boolean;
  longSessionActionsJa: string[];
}): RuntimeEffect[] {
  const { kernelInput, state, snapshot, orchestratorEvaluation, imminentKill, longSessionActionsJa } =
    params;
  const metrics = kernelInput.telemetry.metrics;
  const effects: RuntimeEffect[] = [];

  effects.push(
    makeEffect('MEMORY_PRESSURE_OBSERVE', `mem-obs-${state}`, { metrics }),
    makeEffect('NATIVE_EXTENSION_BUILD', `native-ext-${state}`, {
      metrics,
      sessionMinutes: kernelInput.sessionMinutes,
      orchEval: orchestratorEvaluation,
    }),
    makeEffect('LONG_SESSION_PASS', `long-pass-${kernelInput.sessionMinutes}`, {
      sessionMinutes: kernelInput.sessionMinutes,
      metrics,
    }),
  );

  if (imminentKill) {
    effects.push(makeEffect('IMMINENT_KILL_MITIGATION', 'imminent-kill', { metrics }));
  }

  if (longSessionActionsJa.length > 0 && state === 'SURVIVAL') {
    effects.push(
      makeEffect('TELEMETRY_PERSIST', `tel-persist-survival`, {
        metrics,
        state: kernelInput.telemetry.state,
        summaryJa: `${snapshot.summaryJa} · ${longSessionActionsJa.join(', ')}`,
      }),
    );
  }

  return effects;
}

export function assembleRuntimeDecision(params: {
  kernelInput: RuntimeKernelInput;
  state: RuntimeKernelState;
  candidate: RuntimeKernelState;
  flapSuppressed: boolean;
  signals: RuntimeUnifiedSignals;
  confidenceMap: TelemetryConfidenceMap;
  imminentKill: boolean;
  longSessionActionsJa: string[];
}): RuntimeDecision {
  const policy = resolvePolicyForKernelState(params.state);
  const guards = buildGuardStateFromPolicy(policy, params.signals);

  const orchestratorSnapshot = buildOrchestratorSnapshotFromKernel(
    params.state,
    policy,
    params.kernelInput,
    params.signals,
    params.flapSuppressed,
  );

  const snapshot = assembleRuntimeKernelSnapshot({
    input: params.kernelInput,
    state: params.state,
    candidate: params.candidate,
    flapSuppressed: params.flapSuppressed,
    signals: params.signals,
    confidenceMap: params.confidenceMap,
    guards,
    orchestrator: orchestratorSnapshot,
  });

  const orchestratorEvaluation: RuntimeOrchestratorEvaluation = {
    snapshot: orchestratorSnapshot,
    candidateState: params.candidate,
    flapSuppressed: params.flapSuppressed,
  };

  const policyEffects = buildPolicyEffects(policy, params.signals, guards, params.state);
  const auxEffects = buildAuxiliaryEffects({
    kernelInput: params.kernelInput,
    state: params.state,
    snapshot,
    orchestratorEvaluation,
    imminentKill: params.imminentKill,
    longSessionActionsJa: params.longSessionActionsJa,
  });

  return {
    nextState: params.state,
    candidateState: params.candidate,
    flapSuppressed: params.flapSuppressed,
    snapshot,
    orchestratorEvaluation,
    effects: [...policyEffects, ...auxEffects],
    confidence: params.confidenceMap,
    transitions: getReducerTransitionHistory(),
  };
}
