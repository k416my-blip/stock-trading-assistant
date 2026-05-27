import type { HomeostasisTimelineEntry } from '../types/runtimeHomeostasis';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetHomeostasisSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setHomeostasisSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordHomeostasisSoakEvent(entry: HomeostasisTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `homeostasis ${entry.flow} · ${entry.detailJa}`);
}

export function simulateOscillationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'oscillation replay');
}

export function simulateInterventionStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'intervention storm replay');
}

export function simulateRecoveryReboundReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recovery rebound replay');
}

export function simulateOrchestrationDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'orchestration drift replay');
}

export function simulateCompressionReboundReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'compression rebound replay');
}

export function simulateLongSessionFatigueReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session fatigue replay');
}

export function simulateTelemetryCreepReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'telemetry creep replay');
}

export function simulateCalmStatePersistenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'calm-state persistence replay');
}
