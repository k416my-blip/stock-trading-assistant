import { ORCHESTRATOR_STATE_LABELS_JA } from '../../constants/runtimeOrchestrator';
import type { RuntimeKernelSnapshot } from '../../types/runtimeKernel';
import type { RuntimeOrchestratorPolicy, RuntimeOrchestratorSnapshot } from '../../types/runtimeOrchestrator';
import type { RuntimeKernelInput } from '../../types/runtimeKernel';
import type { RuntimeUnifiedSignals } from '../../types/runtimeKernel';
import type { TelemetryConfidenceMap } from '../../types/nativeRuntimeBridge';
import { resolveRuntimePolicy } from '../orchestrator/runtimePolicyEngine';
import { buildRuntimeHealthSummaryJa } from '../orchestrator/runtimeOrchestrator';
import {
  getReducerDwellMs,
  getReducerSurvivalCount,
  getReducerPreviousState,
  getReducerTransitionHistory,
} from './RuntimeReducer';

export function buildOrchestratorSnapshotFromKernel(
  state: RuntimeKernelSnapshot['state'],
  policy: RuntimeOrchestratorPolicy,
  input: RuntimeKernelInput,
  signals: RuntimeUnifiedSignals,
  flapSuppressed: boolean,
): RuntimeOrchestratorSnapshot {
  const metrics = input.telemetry.metrics;
  const orchInput = {
    metrics,
    performance: input.performance,
    cascadePressure: input.cascadePressure,
    renderSpikeCount: signals.renderSpikeCount,
    sessionMinutes: input.sessionMinutes,
    forceMiuiSurvival: signals.forceMiuiSurvival,
    killRiskScore: signals.killRiskScore,
  };
  const dwellMs = getReducerDwellMs();
  const queuePressurePct = Math.min(100, Math.round(metrics.asyncQueueDepth * 1.8));
  const summaryJa = [
    ORCHESTRATOR_STATE_LABELS_JA[state],
    flapSuppressed ? 'hysteresis hold' : 'kernel applied',
    `FPS ${metrics.renderFPS}`,
    `queue ${metrics.asyncQueueDepth}`,
  ].join(' · ');

  return {
    state,
    stateLabelJa: ORCHESTRATOR_STATE_LABELS_JA[state],
    previousState: getReducerPreviousState(),
    stateSince: new Date(Date.now() - dwellMs).toISOString(),
    dwellMs,
    policy,
    summaryJa,
    runtimeHealthSummaryJa: buildRuntimeHealthSummaryJa(state, orchInput, policy),
    transitionHistory: getReducerTransitionHistory(),
    survivalActivationCount: getReducerSurvivalCount(),
    aiSuppressionActive: policy.suspendProactiveAi || policy.suppressAiOnReconnectStorm,
    memoryPressureTrendPct: signals.memoryPressurePct,
    queuePressurePct,
    measuredAt: new Date().toISOString(),
  };
}

export function assembleRuntimeKernelSnapshot(params: {
  input: RuntimeKernelInput;
  state: RuntimeKernelSnapshot['state'];
  candidate: RuntimeKernelSnapshot['state'];
  flapSuppressed: boolean;
  signals: RuntimeUnifiedSignals;
  confidenceMap: TelemetryConfidenceMap;
  guards: RuntimeKernelSnapshot['guards'];
  orchestrator: RuntimeOrchestratorSnapshot;
}): RuntimeKernelSnapshot {
  const policy = params.orchestrator.policy;
  return {
    state: params.state,
    stateLabelJa: ORCHESTRATOR_STATE_LABELS_JA[params.state],
    previousState: params.orchestrator.previousState,
    dwellMs: params.orchestrator.dwellMs,
    policy,
    signals: params.signals,
    confidenceMap: params.confidenceMap,
    guards: params.guards,
    telemetryState: params.input.telemetry.state,
    metrics: params.input.telemetry.metrics,
    tuning: params.input.telemetry.tuning,
    orchestrator: params.orchestrator,
    transitionHistory: params.orchestrator.transitionHistory,
    survivalActivationCount: params.orchestrator.survivalActivationCount,
    aiSuppressionActive: params.orchestrator.aiSuppressionActive,
    queuePressurePct: params.orchestrator.queuePressurePct,
    runtimeHealthSummaryJa: params.orchestrator.runtimeHealthSummaryJa,
    summaryJa: params.orchestrator.summaryJa,
    flapSuppressed: params.flapSuppressed,
    candidateState: params.candidate,
    paperTradingOnly: true,
    realTradingEnabled: false,
    measuredAt: new Date().toISOString(),
  };
}

export function resolvePolicyForKernelState(state: RuntimeKernelSnapshot['state']): RuntimeOrchestratorPolicy {
  return resolveRuntimePolicy(state);
}
