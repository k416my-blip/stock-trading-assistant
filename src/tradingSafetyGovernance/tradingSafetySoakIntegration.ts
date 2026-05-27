import type { TradingSafetyTimelineEntry } from '../types/tradingSafetyGovernance';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetTradingSafetySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setTradingSafetySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordTradingSafetySoakEvent(entry: TradingSafetyTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `trading safety ${entry.flow} · ${entry.detailJa}`);
}

export function simulateWebsocketInstabilityReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'websocket instability replay');
}

export function simulateThermalTradingReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'thermal trading replay');
}

export function simulateRecoveryStateReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recovery-state replay');
}

export function simulateLowMemoryTradingReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'low-memory trading replay');
}

export function simulateEmergencyLightweightReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'emergency lightweight replay');
}

export function simulateRuntimeFatigueReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'runtime fatigue replay');
}
