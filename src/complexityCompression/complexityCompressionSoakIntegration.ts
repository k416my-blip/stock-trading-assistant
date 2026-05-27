import type { ComplexityCompressionTimelineEntry } from '../types/complexityCompression';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetComplexityCompressionSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setComplexityCompressionSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordComplexityCompressionSoakEvent(entry: ComplexityCompressionTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `complexity compression ${entry.flow} · ${entry.detailJa}`);
}

export function simulateRecursionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursion replay');
}

export function simulateAmplificationCompressionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'amplification replay');
}

export function simulateObserverExplosionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer explosion replay');
}

export function simulateTelemetryStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'telemetry storm replay');
}

export function simulateLongSessionInflationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session inflation replay');
}

export function simulateWebsocketObserverDuplicationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'websocket observer duplication replay');
}

export function simulateThermalOverloadCompressionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'thermal overload replay');
}

export function simulateScreenOffLeanModeReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'screen-off lean-mode replay');
}
