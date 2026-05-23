/**
 * Pure runtime brain — signals → reducer → decision + effect commands (no I/O).
 */
import type { RuntimeKernelEvaluation, RuntimeKernelInput } from '../../types/runtimeKernel';
import { RUNTIME_KERNEL_VERSION } from '../../constants/runtimeKernel';
import { aggregateRuntimeSignals } from './RuntimeSignalAggregator';
import { reduceRuntimeState } from './RuntimeReducer';
import { assembleRuntimeDecision } from './RuntimeDecision';
import type { RuntimeDecision } from '../../types/runtimeKernel';
import { resetKernelGuardsForTest } from './runtimeKernelGuards';
import { resetRuntimeReducerForTest } from './RuntimeReducer';
import type { PreparedRuntimeKernelContext } from './runtimeKernelPreparation';
import { prepareRuntimeKernelContextSync } from './runtimeKernelPreparation';
import { observeRuntimeStabilityTick } from '../stability/runtimeStabilityIntegration';

let lastDecision: RuntimeDecision | null = null;
let lastEvaluation: RuntimeKernelEvaluation | null = null;

export function resetRuntimeKernelForTest(): void {
  lastDecision = null;
  lastEvaluation = null;
  resetRuntimeReducerForTest();
  resetKernelGuardsForTest();
}

export function getLastRuntimeKernelDecision(): RuntimeDecision | null {
  return lastDecision;
}

export function getLastRuntimeKernelSnapshot() {
  return lastDecision?.snapshot ?? null;
}

export function getLastRuntimeKernelEvaluation(): RuntimeKernelEvaluation | null {
  return lastEvaluation;
}

/** Pure evaluation — no websocket/dashboard/async/persist mutations. */
export function evaluateRuntimeKernelPure(
  prepared: PreparedRuntimeKernelContext,
): RuntimeDecision {
  const { input, renderSpikeCount, killRiskScore, forceMiuiSurvival, killLevel } = prepared;

  const { signals, confidenceMap } = aggregateRuntimeSignals({
    metrics: prepared.mergedMetrics,
    performance: input.performance,
    cascadePressure: input.cascadePressure,
    sessionMinutes: input.sessionMinutes,
    renderSpikeCount,
    killRiskScore,
    forceMiuiSurvival,
  });

  const { state, candidate, flapSuppressed } = reduceRuntimeState(signals);

  const decision = assembleRuntimeDecision({
    kernelInput: input,
    state,
    candidate,
    flapSuppressed,
    signals,
    confidenceMap,
    imminentKill: killLevel === 'IMMINENT',
    longSessionActionsJa: [],
    memoryClassHints: prepared.memoryClassHints,
    stabilitySnapshot: observeRuntimeStabilityTick(prepared.mergedMetrics, input.performance),
  });

  lastDecision = decision;
  lastEvaluation = {
    decision,
    snapshot: decision.snapshot,
    orchestratorEvaluation: decision.orchestratorEvaluation,
  };
  void RUNTIME_KERNEL_VERSION;
  return decision;
}

/** @deprecated Prefer prepare + pure + dispatch. */
export function evaluateRuntimeKernel(input: RuntimeKernelInput): RuntimeKernelEvaluation {
  const prepared = prepareRuntimeKernelContextSync(input);
  evaluateRuntimeKernelPure(prepared);
  return lastEvaluation!;
}
