/**
 * Signal collection phase (I/O allowed) — runs before pure kernel evaluation.
 */
import type { RuntimeKernelInput } from '../../types/runtimeKernel';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import {
  mergeNativeIntoTelemetryMetrics,
  refreshNativeRuntimeCycle,
  shouldForceMiuiSurvivalEscalation,
} from '../../native/runtime/nativeRuntimeIntegration';
import { predictRuntimeKill } from '../../native/runtime/runtimeKillPredictor';
import {
  resolveMemoryClassPolicy,
  type MemoryClassPolicyHints,
} from '../../native/runtime/memoryClassAwareness';

export type PreparedRuntimeKernelContext = {
  input: RuntimeKernelInput;
  mergedMetrics: RuntimeTelemetryMetricsSnapshot;
  renderSpikeCount: number;
  killRiskScore: number;
  killLevel: ReturnType<typeof predictRuntimeKill>['level'];
  forceMiuiSurvival: boolean;
  memoryClassHints: MemoryClassPolicyHints;
};

export async function prepareRuntimeKernelContext(
  input: RuntimeKernelInput,
): Promise<PreparedRuntimeKernelContext> {
  await refreshNativeRuntimeCycle();
  const mergedMetrics = mergeNativeIntoTelemetryMetrics(input.telemetry.metrics);

  const renderSpikeCount =
    (mergedMetrics.render.renderSpikeDetected ? 1 : 0) +
    (mergedMetrics.render.excessiveRerenderDetected ? 2 : 0) +
    (mergedMetrics.render.subtreeHotReloadDetected ? 1 : 0);

  const kill = predictRuntimeKill({ metrics: mergedMetrics, sessionMinutes: input.sessionMinutes });

  return {
    input: {
      ...input,
      telemetry: { ...input.telemetry, metrics: mergedMetrics },
    },
    mergedMetrics,
    renderSpikeCount,
    killRiskScore: kill.score,
    killLevel: kill.level,
    forceMiuiSurvival: shouldForceMiuiSurvivalEscalation(),
    memoryClassHints: resolveMemoryClassPolicy(),
  };
}

export function prepareRuntimeKernelContextSync(
  input: RuntimeKernelInput,
): PreparedRuntimeKernelContext {
  const mergedMetrics = mergeNativeIntoTelemetryMetrics(input.telemetry.metrics);
  const renderSpikeCount =
    (mergedMetrics.render.renderSpikeDetected ? 1 : 0) +
    (mergedMetrics.render.excessiveRerenderDetected ? 2 : 0) +
    (mergedMetrics.render.subtreeHotReloadDetected ? 1 : 0);
  const kill = predictRuntimeKill({ metrics: mergedMetrics, sessionMinutes: input.sessionMinutes });
  return {
    input: { ...input, telemetry: { ...input.telemetry, metrics: mergedMetrics } },
    mergedMetrics,
    renderSpikeCount,
    killRiskScore: kill.score,
    killLevel: kill.level,
    forceMiuiSurvival: shouldForceMiuiSurvivalEscalation(),
    memoryClassHints: resolveMemoryClassPolicy(),
  };
}
