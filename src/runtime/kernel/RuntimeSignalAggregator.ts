import type { NativeRuntimeSnapshot } from '../../types/nativeRuntimeBridge';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { RuntimeUnifiedSignals } from '../../types/runtimeKernel';
import { buildTelemetryConfidenceMap } from '../../native/runtime/telemetryConfidence';
import { detectMiuiAggressiveReclaim } from '../../native/runtime/miuiReclaimDetector';
import { getLastNativeRuntimeSnapshot } from '../../native/runtime/nativeRuntimeBridge';
import { isOrchestrationPausedForHydration } from '../../services/hydrationCollisionGuard';
import {
  shouldPauseConciergeAi,
  shouldThrottleConciergeAi,
} from '../../services/productionStability/productionStabilityRuntime';

export type SignalAggregateInput = {
  metrics: RuntimeTelemetryMetricsSnapshot;
  performance: PerformanceCostRuntimeSnapshot;
  cascadePressure: number;
  sessionMinutes: number;
  renderSpikeCount: number;
  killRiskScore: number;
  forceMiuiSurvival: boolean;
};

export function aggregateRuntimeSignals(input: SignalAggregateInput): {
  signals: RuntimeUnifiedSignals;
  native: NativeRuntimeSnapshot | null;
  confidenceMap: ReturnType<typeof buildTelemetryConfidenceMap>;
} {
  const native = getLastNativeRuntimeSnapshot();
  const confidenceMap = buildTelemetryConfidenceMap(input.metrics, native);
  const miui = detectMiuiAggressiveReclaim();

  const memoryFromNative =
    confidenceMap.memoryPressure.source === 'native' &&
    confidenceMap.memoryPressure.confidence >= 0.85;
  const memoryPressurePct = memoryFromNative
    ? confidenceMap.memoryPressure.value
    : input.metrics.memoryTrendPct;

  const thermalSource = confidenceMap.thermal.source;
  const thermalPressure = confidenceMap.thermal.value as RuntimeTelemetryMetricsSnapshot['thermalState'];

  return {
    native,
    confidenceMap,
    signals: {
      memoryPressurePct,
      memoryPressureSource: memoryFromNative ? 'native' : 'heuristic',
      memoryPressureConfidence: confidenceMap.memoryPressure.confidence,
      thermalPressure,
      thermalSource,
      queueDepth: input.metrics.asyncQueueDepth,
      renderFps: input.metrics.renderFPS,
      wsLatencyMs: input.metrics.websocket.wsLatencyMs,
      wsReconnectStorm: input.metrics.websocket.reconnectStormDetected,
      wsJitterScore: input.metrics.websocket.jitterScore,
      hydrationCascadeRiskPct: input.metrics.hydrationResume.resumeCascadeRiskPct,
      hydrationInFlight: input.metrics.hydrationResume.hydrationDurationMs != null,
      hydrationPaused: isOrchestrationPausedForHydration(),
      proactivePause: shouldPauseConciergeAi(),
      proactiveThrottle: shouldThrottleConciergeAi(),
      miuiAggressiveReclaim: miui.value || input.metrics.native.miuiAggressiveReclaim,
      killRiskScore: input.killRiskScore,
      forceMiuiSurvival: input.forceMiuiSurvival,
      lifecycleForeground: native?.foreground ?? input.performance.appForeground,
      memoryWarning: input.metrics.native.memoryWarning || (native?.trimLevel !== 'none' && native != null),
      renderSpikeCount: input.renderSpikeCount,
      cascadePressure: input.cascadePressure,
      sessionMinutes: input.sessionMinutes,
      observedAt: new Date().toISOString(),
    },
  };
}
