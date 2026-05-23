/**
 * Adaptive-aware causal graph pipeline.
 */
import type { RuntimeCausalGraphInput, RuntimeCausalGraphBundle } from '../../types/runtimeCausalGraph';
import type { AdaptiveRuntimeContext } from '../../types/adaptiveRuntimeLearning';
import type { InferredLatentState } from '../../types/runtimeLatentStateInference';
import type { RedmiLongSoakExport } from '../../types/redmiLongSoakValidation';
import {
  buildAdaptiveRuntimeReport,
  createAdaptiveRuntimeContext,
  formatAdaptiveRuntimeReportMarkdown,
  learnFromInference,
} from './adaptiveRuntimeLearningEngine';
import {
  buildRuntimeCausalGraph,
  buildRuntimeCausalGraphBundle,
  causalGraphFromSoakExport,
} from './runtimeCausalGraph';
import { resetAdaptiveLearningStoreForTest, setAdaptiveLearningStore } from './adaptiveRuntimeLearningStorage';
import { createAdaptiveLearningState } from './adaptiveRuntimeLearningStorage';

export type AdaptiveGraphBuildOptions = {
  adaptive?: AdaptiveRuntimeContext;
  deviceModel?: string;
  previousLatent?: InferredLatentState[];
};

export function buildRuntimeCausalGraphWithAdaptive(
  input: RuntimeCausalGraphInput,
  options?: AdaptiveGraphBuildOptions,
): RuntimeCausalGraphBundle {
  const ctx = options?.adaptive ?? createAdaptiveRuntimeContext(options?.deviceModel);
  return buildRuntimeCausalGraphBundle(input, {
    previousLatent: options?.previousLatent,
    adaptive: ctx,
  });
}

export function replaySoakExportForLearning(
  exp: RedmiLongSoakExport,
  ctx?: AdaptiveRuntimeContext,
): AdaptiveRuntimeContext {
  const context = ctx ?? createAdaptiveRuntimeContext(exp.summary.session.deviceModel);
  context.store.replayCount += 1;
  const input = causalGraphFromSoakExport(exp);
  const bundle = buildRuntimeCausalGraphWithAdaptive(input, {
    adaptive: context,
    deviceModel: exp.summary.session.deviceModel,
  });

  learnFromInference(
    {
      graph: bundle.graph,
      latentChain: bundle.hierarchicalLatent.criticalLatentChain,
      predictedRootKind: bundle.graph.rootCauseKind,
      recoverySucceeded: exp.failureTimeline.length === 0,
      recoveryActions: ['storm_suppression', 'coalesce'],
    },
    context,
  );

  return context;
}

export function replaySoakJsonForLearning(raw: string, deviceModel?: string): AdaptiveRuntimeContext {
  const exp = JSON.parse(raw) as RedmiLongSoakExport;
  return replaySoakExportForLearning(exp, createAdaptiveRuntimeContext(deviceModel ?? exp.summary.session.deviceModel));
}

export { buildAdaptiveRuntimeReport, formatAdaptiveRuntimeReportMarkdown, resetAdaptiveLearningStoreForTest, setAdaptiveLearningStore, createAdaptiveLearningState };
