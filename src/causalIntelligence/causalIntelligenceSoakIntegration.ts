import type { CausalTimelineEntry } from '../types/runtimeCausalIntelligence';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetCausalIntelligenceSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setCausalIntelligenceSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordCausalIntelligenceSoakEvent(entry: CausalTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `causal ${entry.flow} · ${entry.detailJa}`);
}

export function simulateCausalReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'causal replay scenario');
}

export function simulateWebsocketStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'websocket storm replay');
}

export function simulateReclaimPropagationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'reclaim propagation replay');
}

export function simulateThermalCascadeReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'thermal cascade replay');
}

export function simulateObserverOverloadReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer overload replay');
}
