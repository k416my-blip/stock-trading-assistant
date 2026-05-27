import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';
import { scoreRuntimeMemoryPressure } from './memoryPressureMonitor';
import { scoreRuntimeThreadLatencyRisk } from './threadLatencyMonitor';
import { scoreRuntimeRenderStormRisk } from './renderStormMonitor';
import { scoreRuntimeEventQueueRisk } from './eventQueueSaturationDetector';
import { scoreRuntimeTelemetryPayloadRisk } from './telemetryPayloadExplosionDetector';
import { scoreRuntimeBatteryRisk } from './batteryDegradationRiskTracker';
import { scoreRuntimeBackgroundObserverRisk } from './backgroundObserverAccumulationTracker';

export function resetResourceSaturationGaugeBuilderForTest(): void {
  /* stateless */
}

export function buildSaturationGauge(
  input: RuntimeResourceStabilityObserveInput,
): { label: string; level: number }[] {
  return [
    { label: 'memory', level: scoreRuntimeMemoryPressure(input) },
    { label: 'thread', level: scoreRuntimeThreadLatencyRisk(input) },
    { label: 'render', level: scoreRuntimeRenderStormRisk(input) },
    { label: 'queue', level: scoreRuntimeEventQueueRisk(input) },
    { label: 'telemetry', level: scoreRuntimeTelemetryPayloadRisk(input) },
    { label: 'battery', level: scoreRuntimeBatteryRisk(input) },
    { label: 'background', level: scoreRuntimeBackgroundObserverRisk(input) },
  ];
}
