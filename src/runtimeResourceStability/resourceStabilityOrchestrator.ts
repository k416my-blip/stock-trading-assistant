import type { ResourceStabilityTimelineEntry, RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';
import { scoreResourceStability } from './runtimeResourceStabilityCoordinator';
import { scoreRuntimeMemoryPressure } from './memoryPressureMonitor';
import { scoreRuntimeThreadLatencyRisk } from './threadLatencyMonitor';
import { scoreRuntimeRenderStormRisk } from './renderStormMonitor';
import { scoreRuntimeEventQueueRisk } from './eventQueueSaturationDetector';
import { scoreRuntimeTelemetryPayloadRisk } from './telemetryPayloadExplosionDetector';
import { scoreRuntimeBatteryRisk } from './batteryDegradationRiskTracker';
import { scoreRuntimeBackgroundObserverRisk } from './backgroundObserverAccumulationTracker';
import { scoreLongSessionResourceDrift } from './longSessionResourceDriftEngine';
import { recordResourceEvolution } from './resourceStabilityEvolutionCoordinator';
import { analyzeResourceVariance } from './resourceVarianceAnalyzer';
import { registerResourceSignals } from './resourceSignalRegistry';
import { recordResourceStabilityTimeline } from './resourceStabilityTimeline';

export function runResourceStabilityFlows(
  input: RuntimeResourceStabilityObserveInput,
): { flow: ResourceStabilityTimelineEntry['flow']; detailJa: string }[] {
  const results = [
    { flow: 'resource_stability_flow' as const, detailJa: `stability ${scoreResourceStability(input)}` },
    { flow: 'memory_pressure' as const, detailJa: `memory ${scoreRuntimeMemoryPressure(input)}` },
    { flow: 'thread_latency' as const, detailJa: `latency ${scoreRuntimeThreadLatencyRisk(input)}` },
    { flow: 'render_storm' as const, detailJa: `render ${scoreRuntimeRenderStormRisk(input)}` },
    { flow: 'event_queue_saturation' as const, detailJa: `queue ${scoreRuntimeEventQueueRisk(input)}` },
    { flow: 'telemetry_payload_explosion' as const, detailJa: `payload ${scoreRuntimeTelemetryPayloadRisk(input)}` },
    { flow: 'battery_degradation' as const, detailJa: `battery ${scoreRuntimeBatteryRisk(input)}` },
    { flow: 'background_observer_accumulation' as const, detailJa: `bg ${scoreRuntimeBackgroundObserverRisk(input)}` },
    { flow: 'long_session_resource_drift' as const, detailJa: `drift ${scoreLongSessionResourceDrift(input)}` },
    { flow: 'resource_evolution' as const, detailJa: `evo ${recordResourceEvolution(input)} · var ${analyzeResourceVariance(input)}` },
  ];
  registerResourceSignals(input);
  for (const r of results) recordResourceStabilityTimeline(r.flow, r.detailJa);
  return results;
}
