import type { AmplificationTimelineEntry } from '../types/amplificationSuppression';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetAmplificationSuppressionSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setAmplificationSuppressionSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordAmplificationSuppressionSoakEvent(entry: AmplificationTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `amplification ${entry.flow} · ${entry.detailJa}`);
}

export function simulateObserverStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer storm replay');
}

export function simulateTelemetryRecursionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'telemetry recursion replay');
}

export function simulateWebsocketStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'websocket storm replay');
}

export function simulateRecoveryCascadeReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recovery cascade replay');
}

export function simulateThermalAmplificationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'thermal amplification replay');
}

export function simulateMiuiReclaimReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'MIUI reclaim replay');
}

export function simulateLongSessionOverloadReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session overload replay');
}
