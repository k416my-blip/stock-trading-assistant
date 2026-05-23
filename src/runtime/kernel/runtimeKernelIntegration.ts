/**
 * Kernel integration — pure evaluate then effect dispatch.
 */
export type { RuntimeKernelInput } from '../../types/runtimeKernel';
export {
  evaluateRuntimeKernelPure,
  getLastRuntimeKernelDecision,
  getLastRuntimeKernelSnapshot,
  getLastRuntimeKernelEvaluation,
  resetRuntimeKernelForTest,
} from './RuntimeKernel';
export {
  selectRuntimeKernelSnapshot,
  selectOrchestratorSnapshotForUi,
  selectTelemetryMetricsForUi,
  selectRuntimeHealthSummaryJa,
  selectAiSuppressionActive,
  selectRuntimeKernelDecision,
} from './runtimeKernelSelectors';
export { prepareRuntimeKernelContext, prepareRuntimeKernelContextSync } from './runtimeKernelPreparation';

import type { RuntimeKernelInput } from '../../types/runtimeKernel';
import type { RuntimeOrchestratorEvaluation } from '../../types/runtimeOrchestrator';
import type { RuntimeOrchestratorSnapshot } from '../../types/runtimeOrchestrator';
import {
  evaluateRuntimeKernelPure,
  getLastRuntimeKernelEvaluation,
} from './RuntimeKernel';
import { prepareRuntimeKernelContextSync } from './runtimeKernelPreparation';
import {
  dispatchRuntimeEffects,
  resetRuntimeEffectDispatcherForTest,
} from '../effects/RuntimeEffectDispatcher';
import {
  shouldOrchestratorBlockBackgroundRefresh,
  shouldOrchestratorPauseConciergeAi,
  shouldOrchestratorThrottleProactive,
  getRuntimeHealthSummaryJa,
} from '../orchestrator/runtimeOrchestrator';
import {
  runUnifiedOrchestrationUxPhases,
  shouldAllowUnifiedDashboardUpdate,
} from '../unified/runtimeUnifiedOrchestratorIntegration';

export function resetRuntimeKernelStackForTest(): void {
  const { resetRuntimeKernelForTest } = require('./RuntimeKernel') as typeof import('./RuntimeKernel');
  resetRuntimeKernelForTest();
  resetRuntimeEffectDispatcherForTest();
}

export function evaluateAndApplyRuntimeKernel(
  input: RuntimeKernelInput,
): RuntimeOrchestratorEvaluation {
  const prepared = prepareRuntimeKernelContextSync(input);
  const decision = evaluateRuntimeKernelPure(prepared);
  dispatchRuntimeEffects(decision.effects, {
    kernelState: decision.nextState,
  });
  runUnifiedOrchestrationUxPhases({
    orchestrationRan: true,
    gateAllowDashboard: shouldAllowUnifiedDashboardUpdate(),
  });
  return decision.orchestratorEvaluation;
}

export function getLastRuntimeOrchestratorSnapshot(): RuntimeOrchestratorSnapshot | null {
  return getLastRuntimeKernelEvaluation()?.orchestratorEvaluation.snapshot ?? null;
}

export {
  shouldOrchestratorPauseConciergeAi,
  shouldOrchestratorThrottleProactive,
  shouldOrchestratorBlockBackgroundRefresh,
  getRuntimeHealthSummaryJa,
};

export function getOrchestratorEvalFromKernel(): RuntimeOrchestratorEvaluation | null {
  return getLastRuntimeKernelEvaluation()?.orchestratorEvaluation ?? null;
}
