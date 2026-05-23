/**
 * Runtime Telemetry Engine — JS/render/async/WS/hydration observation + adaptive tuning hooks.
 */
import {
  TELEMETRY_CRITICAL_EVENT_LOOP_MS,
  TELEMETRY_DEGRADED_EVENT_LOOP_MS,
  TELEMETRY_DEGRADED_FPS_MIN,
  TELEMETRY_CRITICAL_QUEUE_DEPTH,
  TELEMETRY_OK_FPS_MIN,
  TELEMETRY_STATE_LABELS_JA,
  TELEMETRY_UI_LABELS_JA,
  TELEMETRY_WS_RTT_CRITICAL_MS,
  TELEMETRY_WS_RTT_DEGRADED_MS,
} from '../constants/runtimeTelemetry';
import { RUNTIME_KERNEL_OWNS_POLICY } from '../constants/runtimeKernel';
import type {
  EvaluateRuntimeTelemetryInput,
  RuntimeTelemetryDashboardBundle,
  RuntimeTelemetryEvaluation,
  RuntimeTelemetryMetricsSnapshot,
  TelemetryHealthState,
} from '../types/runtimeTelemetry';
import { getCoordinatorQueueDepth } from './asyncRuntimeCoordinator';
import { observeNativeDevice, initNativeDeviceObservation } from './nativeDeviceObservation';
import { observeRenderPerformance } from './renderPerformanceObserver';
import { observeWebSocketTelemetry } from './websocketTelemetry';
import { observeHydrationResume } from './hydrationResumeTelemetry';
import {
  getProfilerSessionElapsedMinutes,
  markProfilerSessionStart,
  observeLongSession,
  recordLongSessionSample,
} from './longSessionProfiler';
import { applyAdaptiveRuntimeTuning, deriveAdaptiveRuntimeTuning } from './adaptiveRuntimeTuning';
import {
  formatStartupAnomalyJa,
  loadRuntimeTelemetryState,
  persistTelemetryCycle,
} from './runtimeTelemetryStorage';
import {
  getLastNativeDashboardExtension,
  observeNativeDeviceTelemetryFromMetrics,
} from '../native/runtime/nativeRuntimeIntegration';

type DurationMarks = {
  orchestrationMs: number | null;
  explanationMs: number | null;
  hydrationMs: number | null;
};

const marks: DurationMarks = {
  orchestrationMs: null,
  explanationMs: null,
  hydrationMs: null,
};

let lastEvaluation: RuntimeTelemetryEvaluation | null = null;
let startupAnomalyJa: string | null = null;
let initialized = false;

export function resetRuntimeTelemetryEngineForTest(): void {
  marks.orchestrationMs = null;
  marks.explanationMs = null;
  marks.hydrationMs = null;
  lastEvaluation = null;
  startupAnomalyJa = null;
  initialized = false;
}

export async function initRuntimeTelemetryEngine(): Promise<void> {
  if (initialized) return;
  initialized = true;
  markProfilerSessionStart();
  initNativeDeviceObservation();
  const persisted = await loadRuntimeTelemetryState();
  startupAnomalyJa = formatStartupAnomalyJa(persisted);
}

export function recordOrchestrationDurationMs(ms: number): void {
  marks.orchestrationMs = ms;
}

export function recordExplanationGenerationDurationMs(ms: number): void {
  marks.explanationMs = ms;
}

export function recordHydrationDurationMs(ms: number): void {
  marks.hydrationMs = ms;
}

function estimateJsHeapMb(queueSize: number, memoryPressure: boolean): number {
  return Math.round(28 + queueSize * 0.35 + (memoryPressure ? 18 : 0));
}

function classifyTelemetry(metrics: RuntimeTelemetryMetricsSnapshot): TelemetryHealthState {
  if (
    metrics.render.renderFPS < TELEMETRY_DEGRADED_FPS_MIN ||
    metrics.eventLoopLatencyMs >= TELEMETRY_CRITICAL_EVENT_LOOP_MS ||
    metrics.asyncQueueDepth >= TELEMETRY_CRITICAL_QUEUE_DEPTH ||
    metrics.websocket.wsLatencyMs >= TELEMETRY_WS_RTT_CRITICAL_MS ||
    metrics.native.thermalStatus === 'critical' ||
    metrics.native.thermalStatus === 'severe'
  ) {
    return 'TELEMETRY_CRITICAL';
  }
  if (
    metrics.render.renderFPS < TELEMETRY_OK_FPS_MIN ||
    metrics.eventLoopLatencyMs >= TELEMETRY_DEGRADED_EVENT_LOOP_MS ||
    metrics.websocket.wsLatencyMs >= TELEMETRY_WS_RTT_DEGRADED_MS ||
    metrics.native.thermalThrottlingDetected ||
    metrics.hydrationResume.resumeCascadeRiskPct >= 65
  ) {
    return 'TELEMETRY_DEGRADED';
  }
  return 'TELEMETRY_OK';
}

function buildMetrics(input: EvaluateRuntimeTelemetryInput): RuntimeTelemetryMetricsSnapshot {
  const native = observeNativeDevice({
    thermalPressurePct: input.thermalPressurePct,
    memoryPressure: input.memoryPressure,
    queueSize: input.queueSize,
  });
  const render = observeRenderPerformance({
    runtimeFPS: input.mobileMetrics.runtimeFPS,
    renderBurstRate: input.mobileMetrics.renderBurstRate,
    jsThreadPressurePct: input.mobileMetrics.jsThreadPressurePct,
    refreshDurationMs: input.refreshDurationMs,
  });
  const websocket = observeWebSocketTelemetry();
  const hydrationResume = observeHydrationResume({
    backgroundResumeRecoveryMs: input.mobileMetrics.backgroundResumeRecoveryMs,
    queueSize: input.queueSize,
    cascadePressure: input.cascadePressure,
  });
  if (marks.hydrationMs != null) {
    hydrationResume.hydrationDurationMs = marks.hydrationMs;
  }

  const asyncQueueDepth = input.asyncMetrics.asyncQueueDepth ?? getCoordinatorQueueDepth();
  const jsHeapEstimateMb = estimateJsHeapMb(input.queueSize, input.memoryPressure);

  recordLongSessionSample({
    jsHeapEstimateMb,
    asyncQueueDepth,
    renderFPS: render.renderFPS,
    wsLatencyMs: websocket.wsLatencyMs,
    orchestrationMs: marks.orchestrationMs ?? input.refreshDurationMs ?? 0,
  });

  const sessionMinutes = Math.max(input.sessionMinutes, getProfilerSessionElapsedMinutes());
  const longSession = observeLongSession(sessionMinutes);

  const droppedFrames = Math.round(render.frameDropRate / 5);

  return {
    jsHeapEstimateMb,
    renderFPS: render.renderFPS,
    droppedFrames,
    eventLoopLatencyMs: input.asyncMetrics.taskExecutionLatencyMs,
    asyncQueueLatencyMs: input.asyncMetrics.taskExecutionLatencyMs,
    websocketRttMs: websocket.wsLatencyMs,
    hydrationDurationMs: hydrationResume.hydrationDurationMs,
    foregroundResumeDurationMs: hydrationResume.resumeRecoveryTimeMs,
    orchestrationDurationMs: marks.orchestrationMs,
    explanationGenerationDurationMs: marks.explanationMs,
    asyncQueueDepth,
    memoryTrendPct: longSession.memoryGrowthTrendPct,
    thermalState: native.thermalStatus,
    runtimeModeLabelJa: input.mobileMetrics.schedulerMode,
    native,
    render,
    websocket,
    hydrationResume,
    longSession,
    measuredAt: new Date().toISOString(),
  };
}

export function evaluateRuntimeTelemetry(
  input: EvaluateRuntimeTelemetryInput,
): RuntimeTelemetryEvaluation {
  const metrics = buildMetrics(input);
  observeNativeDeviceTelemetryFromMetrics(metrics, input.sessionMinutes);
  const state = classifyTelemetry(metrics);
  const tuning = deriveAdaptiveRuntimeTuning(state, metrics, input.cascadePressure);
  applyAdaptiveRuntimeTuning(tuning);

  const summaryJa = [
    TELEMETRY_STATE_LABELS_JA[state],
    `FPS ${metrics.renderFPS}`,
    `queue ${metrics.asyncQueueDepth}`,
    `WS ${metrics.websocketRttMs}ms`,
    `thermal ${metrics.thermalState}`,
    tuning.dashboardCompact ? 'compact' : 'full',
  ].join(' · ');

  const evaluation: RuntimeTelemetryEvaluation = {
    state,
    stateLabelJa: TELEMETRY_STATE_LABELS_JA[state],
    metrics,
    tuning,
    summaryJa,
    compactDashboard: tuning.dashboardCompact,
    lastAnomalySummaryJa: startupAnomalyJa,
  };

  lastEvaluation = evaluation;
  if (!RUNTIME_KERNEL_OWNS_POLICY) {
    void persistTelemetryCycle({
      metrics,
      state,
      summaryJa,
      longSession: metrics.longSession,
    });
  }

  return evaluation;
}

export function getLastRuntimeTelemetryEvaluation(): RuntimeTelemetryEvaluation | null {
  return lastEvaluation;
}

export function buildRuntimeTelemetryDashboardBundle(
  evaluation: RuntimeTelemetryEvaluation,
  orchestrator?: import('../types/runtimeOrchestrator').RuntimeOrchestratorSnapshot | null,
): RuntimeTelemetryDashboardBundle {
  return {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: TELEMETRY_UI_LABELS_JA.safety,
    paperTradingOnly: true,
    realTradingEnabled: false,
    strategyActionChangeForbidden: true,
    governanceOverrideForbidden: true,
    evaluation,
    startupAnomalyJa: evaluation.lastAnomalySummaryJa ?? startupAnomalyJa,
    orchestrator: orchestrator ?? null,
    nativeExtension: getLastNativeDashboardExtension(),
  };
}

export async function refreshStartupTelemetryAnomaly(): Promise<string | null> {
  const persisted = await loadRuntimeTelemetryState();
  startupAnomalyJa = formatStartupAnomalyJa(persisted);
  return startupAnomalyJa;
}
