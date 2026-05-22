/**
 * Wires telemetry → orchestrator state machine → policy → runtime subsystems.
 */
import type { RuntimeTelemetryEvaluation } from '../../types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeOrchestratorEvaluation } from '../../types/runtimeOrchestrator';
import {
  evaluateRuntimeOrchestrator,
  getLastRuntimeOrchestratorSnapshot,
  shouldOrchestratorBlockBackgroundRefresh,
  shouldOrchestratorPauseConciergeAi,
  shouldOrchestratorThrottleProactive,
  getRuntimeHealthSummaryJa,
} from './runtimeOrchestrator';
import { applyAsyncSchedulerPolicy } from './asyncPriorityScheduler';
import { heartbeatMsFromPolicy } from './runtimePolicyEngine';
import { observeMemoryPressure } from './memoryPressureGuardian';
import { runLongSessionSurvivabilityPass } from './longSessionSurvivability';
import {
  shouldRedmiAggressiveRenderSuppression,
  shouldRedmiCompactFirstRecovery,
} from './redmiOrchestratorGuard';
import {
  setDashboardCompactMode,
  setDashboardFpsCap,
  setMetricsSamplingRate,
} from '../../services/dashboardFrameStabilizer';
import {
  setWebsocketHeartbeatIntervalMs,
  setWebsocketLightweightMode,
} from '../../services/websocketStabilityGuard';
import { persistTelemetryCycle } from '../../services/runtimeTelemetryStorage';
import { setOrchestratorProactiveGates } from '../../services/productionStability/productionStabilityRuntime';
import {
  applyImminentKillMitigations,
  buildNativeDashboardExtension,
  mergeNativeIntoTelemetryMetrics,
  refreshNativeRuntimeCycle,
  shouldForceMiuiSurvivalEscalation,
} from '../../native/runtime/nativeRuntimeIntegration';
import { predictRuntimeKill } from '../../native/runtime/runtimeKillPredictor';

export type OrchestratorIntegrationInput = {
  telemetry: RuntimeTelemetryEvaluation;
  performance: PerformanceCostRuntimeSnapshot;
  cascadePressure: number;
  sessionMinutes: number;
};

export function evaluateAndApplyRuntimeOrchestrator(
  input: OrchestratorIntegrationInput,
): RuntimeOrchestratorEvaluation {
  void refreshNativeRuntimeCycle();
  const mergedMetrics = mergeNativeIntoTelemetryMetrics(input.telemetry.metrics);

  const renderSpikeCount =
    (mergedMetrics.render.renderSpikeDetected ? 1 : 0) +
    (mergedMetrics.render.excessiveRerenderDetected ? 2 : 0) +
    (mergedMetrics.render.subtreeHotReloadDetected ? 1 : 0);

  const kill = predictRuntimeKill({ metrics: mergedMetrics, sessionMinutes: input.sessionMinutes });
  applyImminentKillMitigations(mergedMetrics);

  const orchEval = evaluateRuntimeOrchestrator({
    metrics: mergedMetrics,
    performance: input.performance,
    cascadePressure: input.cascadePressure,
    renderSpikeCount,
    sessionMinutes: input.sessionMinutes,
    forceMiuiSurvival: shouldForceMiuiSurvivalEscalation(),
    killRiskScore: kill.score,
  });

  buildNativeDashboardExtension(mergedMetrics, input.sessionMinutes, orchEval);

  const policy = orchEval.snapshot.policy;
  applyAsyncSchedulerPolicy(policy);

  setDashboardCompactMode(policy.compactDashboard || shouldRedmiCompactFirstRecovery());
  setDashboardFpsCap(
    shouldRedmiAggressiveRenderSuppression()
      ? Math.min(policy.maxDashboardFps, 10)
      : policy.maxDashboardFps,
  );
  setMetricsSamplingRate(policy.telemetrySamplingRate);
  setWebsocketHeartbeatIntervalMs(heartbeatMsFromPolicy(policy));
  setWebsocketLightweightMode(policy.websocketBatching || policy.websocketSafeMode);

  setOrchestratorProactiveGates({
    pauseProactive: policy.suspendProactiveAi,
    throttleProactive: policy.proactiveCooldown || policy.suspendProactiveAi,
  });

  observeMemoryPressure(input.telemetry.metrics);

  const longPass = runLongSessionSurvivabilityPass(input.sessionMinutes, input.telemetry.metrics);
  if (longPass.actionsJa.length > 0 && orchEval.snapshot.state === 'SURVIVAL') {
    void persistTelemetryCycle({
      metrics: input.telemetry.metrics,
      state: input.telemetry.state,
      summaryJa: `${orchEval.snapshot.summaryJa} · ${longPass.actionsJa.join(', ')}`,
      longSession: input.telemetry.metrics.longSession,
    });
  }

  return orchEval;
}

export {
  getLastRuntimeOrchestratorSnapshot,
  shouldOrchestratorPauseConciergeAi,
  shouldOrchestratorThrottleProactive,
  shouldOrchestratorBlockBackgroundRefresh,
  getRuntimeHealthSummaryJa,
};
