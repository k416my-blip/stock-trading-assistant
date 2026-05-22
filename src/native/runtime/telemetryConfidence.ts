import { NATIVE_CONFIDENCE_WEIGHT_MIN } from '../../constants/nativeRuntimeBridge';
import type {
  NativeRuntimeSnapshot,
  TelemetryConfidenceField,
  TelemetryConfidenceMap,
} from '../../types/nativeRuntimeBridge';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import { detectMiuiAggressiveReclaim } from './miuiReclaimDetector';
import { observeAnrRisk } from './anrPreventionLayer';

function field<T>(
  value: T,
  source: 'native' | 'heuristic' | 'hybrid',
  confidence: number,
  freshnessMs = 0,
): TelemetryConfidenceField<T> {
  return { value, source, confidence, freshnessMs };
}

export function buildTelemetryConfidenceMap(
  metrics: RuntimeTelemetryMetricsSnapshot,
  native: NativeRuntimeSnapshot | null,
): TelemetryConfidenceMap {
  const miui = detectMiuiAggressiveReclaim();
  const anr = observeAnrRisk();

  const thermalNative = native?.source === 'native';
  const memoryNative = native?.source === 'native';

  return {
    thermal: thermalNative
      ? field(native!.thermalStatus, 'native', 0.92)
      : field(metrics.thermalState, 'heuristic', 0.5),
    memoryPressure: memoryNative
      ? field(native!.nativeMemoryPressurePct, 'native', 0.9)
      : field(metrics.memoryTrendPct, 'heuristic', 0.48),
    memoryTrend: field(metrics.memoryTrendPct, 'heuristic', 0.48),
    droppedFrames: native?.droppedFramesEstimate
      ? field(
          Math.max(metrics.droppedFrames, native.droppedFramesEstimate),
          native.source === 'native' ? 'hybrid' : 'heuristic',
          native.source === 'native' ? 0.75 : 0.45,
        )
      : field(metrics.droppedFrames, 'heuristic', 0.42),
    networkQuality: native?.networkTransportQuality
      ? field(native.networkTransportQuality, native.source, native.confidence)
      : field('good', 'heuristic', 0.4),
    miuiReclaim: miui,
    anrRisk: field(anr.anrRiskScore, anr.anrRiskScore > 0 && native ? 'hybrid' : 'heuristic', 0.6),
  };
}

export function weightedMetricValue(conf: TelemetryConfidenceField<number>): number {
  const w = Math.max(NATIVE_CONFIDENCE_WEIGHT_MIN, conf.confidence);
  return conf.value * w;
}

export function nativeCoveragePct(map: TelemetryConfidenceMap): number {
  const fields = Object.values(map);
  const nativeCount = fields.filter((f) => f.source === 'native').length;
  const hybridCount = fields.filter((f) => f.source === 'hybrid').length;
  return Math.round(((nativeCount + hybridCount * 0.5) / fields.length) * 100);
}
