import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetResourceStabilitySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setResourceStabilitySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function simulateMemoryAccumulationDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'memory accumulation drift replay');
}

export function simulateTelemetryBurstReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'telemetry burst replay');
}
