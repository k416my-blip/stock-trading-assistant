import type { MetaOrchestrationTimelineEntry } from '../types/metaRuntimeOrchestration';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetMetaOrchestrationSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setMetaOrchestrationSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordMetaOrchestrationSoakEvent(entry: MetaOrchestrationTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `meta orchestration ${entry.flow} · ${entry.detailJa}`);
}

export function simulateOscillationStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'oscillation storm replay');
}

export function simulateTelemetryAmplificationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'telemetry amplification replay');
}

export function simulateGovernanceThrashReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'governance thrash replay');
}

export function simulateReclaimCoordinationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'reclaim coordination replay');
}

export function simulateThermalPacingReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'thermal pacing replay');
}

export function simulateInterventionSaturationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'intervention saturation replay');
}
