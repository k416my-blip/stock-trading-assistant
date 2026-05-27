import type { TelemetryEntropyTimelineEntry } from '../types/runtimeTelemetryEntropy';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetTelemetryEntropySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setTelemetryEntropySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordTelemetryEntropySoakEvent(entry: TelemetryEntropyTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `telemetry entropy ${entry.flow}`);
}

export function simulateRecursiveSignalDuplicationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive signal duplication replay');
}

export function simulateExportStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'export storm replay');
}

export function simulateReplayAmplificationBurstReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'replay amplification burst replay');
}

export function simulateDashboardSaturationFloodReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'dashboard saturation flood replay');
}

export function simulateTelemetryOrphanAccumulationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'telemetry orphan accumulation replay');
}

export function simulateTimelineFragmentationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'timeline fragmentation replay');
}

export function simulateStaleMetricPersistenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'stale metric persistence replay');
}

export function simulateCompressionFailureCascadeReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'compression failure cascade replay');
}
