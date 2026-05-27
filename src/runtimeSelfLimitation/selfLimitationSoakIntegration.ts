import type { SelfLimitationTimelineEntry } from '../types/runtimeSelfLimitation';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetSelfLimitationSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setSelfLimitationSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordSelfLimitationSoakEvent(entry: SelfLimitationTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `self limitation ${entry.flow} · ${entry.detailJa}`);
}

export function simulateRecursiveOrchestrationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive orchestration replay');
}

export function simulateAuditInflationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'audit inflation replay');
}

export function simulateObserverLockReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer lock replay');
}

export function simulateSelfProtectionDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'self-protection drift replay');
}

export function simulateInterventionPersistenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'intervention persistence replay');
}

export function simulateEquilibriumLockReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'equilibrium lock replay');
}

export function simulateTelemetryAccumulationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'telemetry accumulation replay');
}

export function simulateLongSessionExpansionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session expansion replay');
}
