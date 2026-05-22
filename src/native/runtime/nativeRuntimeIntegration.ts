/**
 * Native Runtime Bridge integration — feeds orchestrator & telemetry with native-weighted signals.
 */
import type { NativeRuntimeDashboardExtension } from '../../types/nativeRuntimeBridge';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { RuntimeOrchestratorEvaluation } from '../../types/runtimeOrchestrator';
import {
  fetchNativeRuntimeSnapshot,
  getLastNativeRuntimeSnapshot,
  initNativeRuntimeBridge,
  isNativeRuntimeBridgeAvailable,
} from './nativeRuntimeBridge';
import { buildTelemetryConfidenceMap, nativeCoveragePct } from './telemetryConfidence';
import { predictRuntimeKill, isImminentKillRisk } from './runtimeKillPredictor';
import { observeAnrRisk, initAnrPreventionLayer, pingEventLoop } from './anrPreventionLayer';
import { detectMiuiAggressiveReclaim, getMiuiReclaimEventCount } from './miuiReclaimDetector';
import {
  formatLifecycleTimelineVisualization,
  getLifecycleTimeline,
  recordLifecycleEvent,
} from './lifecycleTimeline';
import { applyMemoryClassAwareness, resolveMemoryClassPolicy } from './memoryClassAwareness';
import { isSoakModeActive, recordSoakSample, exportSoakCsv, noteAiSuppressionActive } from './longSoakTesting';
import { setOrchestratorProactiveGates } from '../../services/productionStability/productionStabilityRuntime';
import { setWebsocketLightweightMode } from '../../services/websocketStabilityGuard';
import { setAsyncConcurrentLimit } from '../../services/asyncRuntimeCoordinator';
import { persistTelemetryCycle } from '../../services/runtimeTelemetryStorage';
import { beginHydrationPauseWindow } from '../../services/hydrationCollisionGuard';

let lastExtension: NativeRuntimeDashboardExtension | null = null;

export function resetNativeRuntimeIntegrationForTest(): void {
  lastExtension = null;
}

export async function initNativeRuntimeLayer(): Promise<void> {
  initAnrPreventionLayer();
  initNativeRuntimeBridge();
  await fetchNativeRuntimeSnapshot();
}

export function mergeNativeIntoTelemetryMetrics(
  metrics: RuntimeTelemetryMetricsSnapshot,
): RuntimeTelemetryMetricsSnapshot {
  const native = getLastNativeRuntimeSnapshot();
  if (!native) return metrics;

  const miui = detectMiuiAggressiveReclaim();
  return {
    ...metrics,
    jsHeapEstimateMb: Math.max(metrics.jsHeapEstimateMb, Math.round(native.nativeMemoryPressurePct * 0.6 + 20)),
    droppedFrames: Math.max(metrics.droppedFrames, native.droppedFramesEstimate),
    thermalState:
      native.source === 'native' && native.thermalStatus !== 'unknown'
        ? (native.thermalStatus as RuntimeTelemetryMetricsSnapshot['thermalState'])
        : metrics.thermalState,
    native: {
      ...metrics.native,
      batterySaverActive: native.batterySaverActive || metrics.native.batterySaverActive,
      thermalStatus:
        native.thermalStatus === 'unknown' ? metrics.native.thermalStatus : native.thermalStatus,
      thermalThrottlingDetected:
        native.thermalStatus === 'severe' ||
        native.thermalStatus === 'critical' ||
        metrics.native.thermalThrottlingDetected,
      miuiAggressiveReclaim: miui.value || metrics.native.miuiAggressiveReclaim,
      memoryWarning: native.trimLevel !== 'none' || metrics.native.memoryWarning,
    },
  };
}

export function buildNativeDashboardExtension(
  metrics: RuntimeTelemetryMetricsSnapshot,
  sessionMinutes: number,
  orchEval?: RuntimeOrchestratorEvaluation | null,
): NativeRuntimeDashboardExtension {
  const native = getLastNativeRuntimeSnapshot();
  const confidenceMap = buildTelemetryConfidenceMap(metrics, native);
  const killPrediction = predictRuntimeKill({ metrics, sessionMinutes });
  const anrRisk = observeAnrRisk();
  const soakActive = isSoakModeActive(sessionMinutes);

  if (soakActive && orchEval) {
    recordSoakSample({
      orchestratorState: orchEval.snapshot.state,
      memoryMb: metrics.jsHeapEstimateMb,
      reconnectCount: metrics.websocket.reconnectAttempts,
      fps: metrics.renderFPS,
      queueDepth: metrics.asyncQueueDepth,
      survivalActivations: orchEval.snapshot.survivalActivationCount,
    });
  }

  noteAiSuppressionActive(orchEval?.snapshot.aiSuppressionActive ?? false);

  const ext: NativeRuntimeDashboardExtension = {
    bridgeAvailable: isNativeRuntimeBridgeAvailable(),
    metricSource: native?.source ?? 'heuristic',
    nativeCoveragePct: nativeCoveragePct(confidenceMap),
    killPrediction,
    anrRisk,
    memoryClass: native?.memoryClass ?? {
      memoryClassMb: 192,
      largeMemoryClassMb: 512,
      lowRamDevice: false,
      isLowRamDevice: false,
    },
    lifecycleTimeline: getLifecycleTimeline(),
    confidenceMap,
    miuiReclaimEvents: getMiuiReclaimEventCount(),
    soakModeActive: soakActive,
    soakCsvExportReady: soakActive && exportSoakCsv().split('\n').length > 2,
  };
  lastExtension = ext;
  return ext;
}

export function getLastNativeDashboardExtension(): NativeRuntimeDashboardExtension | null {
  return lastExtension;
}

export function applyImminentKillMitigations(metrics: RuntimeTelemetryMetricsSnapshot): void {
  if (!isImminentKillRisk()) return;
  setOrchestratorProactiveGates({ pauseProactive: true, throttleProactive: true });
  setWebsocketLightweightMode(true);
  setAsyncConcurrentLimit(1);
  beginHydrationPauseWindow();
  recordLifecycleEvent('hydration_start', 'deferred — imminent kill risk', true);
  void persistTelemetryCycle({
    metrics,
    state: 'TELEMETRY_CRITICAL',
    summaryJa: 'IMMINENT kill risk — proactive/ws/async clamp',
    longSession: metrics.longSession,
  });
}

export function shouldForceMiuiSurvivalEscalation(): boolean {
  const miui = detectMiuiAggressiveReclaim();
  return miui.value && miui.confidence >= 0.7;
}

export function getLifecycleTimelineVisualization(): string {
  return formatLifecycleTimelineVisualization();
}

export function getSoakCsvForExport(): string {
  return exportSoakCsv();
}

export async function refreshNativeRuntimeCycle(): Promise<void> {
  pingEventLoop();
  await fetchNativeRuntimeSnapshot();
  const hints = resolveMemoryClassPolicy();
  if (hints.compactFirst) {
    void applyMemoryClassAwareness({
      telemetrySamplingRate: 0.45,
      animationReduction: true,
      websocketHeartbeatMultiplier: 1.2,
      websocketBatching: true,
      proactiveCooldown: true,
      suspendProactiveAi: false,
      compactDashboard: true,
      maxDashboardFps: 12,
      suspendLowPriorityAsync: true,
      pauseNonessentialRenderLoop: false,
      queueHardLimit: 28,
      disableExpensiveTransitions: false,
      hydrationSerializeMode: false,
      minimalUiMode: false,
      websocketSafeMode: false,
      disableBackgroundRefresh: false,
      disableSpeculativeRender: hints.speculativeRenderForbidden,
      aiChatOnly: false,
      lightweightAiResponses: true,
      suppressAiOnReconnectStorm: true,
    });
  }
}
